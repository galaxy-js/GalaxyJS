(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.Galaxy = {})));
}(this, (function (exports) { 'use strict';

  var config = {

    /**
     * Main element
     *
     * @type {GalaxyElement}
     */
    root: null,

    /**
     * Debug mode
     *
     * @type {boolean}
     */
    debug: true,

    /**
     * Additional elements to register at root level
     *
     * Note: commonly used by plugins
     *
     * @type {Array<GalaxyElement>}
     */
    elements: [],

    /**
     * Directives holder
     *
     * @type {Array<GalaxyDirective>}
     */
    directives: [],

    /**
     * Plugins to install
     *
     * @type {Array<GalaxyPlugin>}
     */
    plugins: [],

    /**
     * Filters holder
     *
     * @enum {Object.<Function>}
     */
    filters: {}
  }

  var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var proxyObserver = createCommonjsModule(function (module, exports) {
  (function (global, factory) {
    module.exports = factory();
  }(commonjsGlobal, (function () {
    /**
     * Store observers internally
     *
     * @type {WeakMap}
     *
     * @api private
     */
    const __observers__ = new WeakMap();

    /**
     * Alias of `Object.prototype.hasOwnProperty`
     *
     * @type {Function}
     *
     * @api private
     */
    const hasOwn = Object.prototype.hasOwnProperty;

    /**
     * Determines whether a given `value` is observable
     *
     * @type {Function}
     *
     * @api private
     */
    const isObservable = value => Object.prototype.toString.call(value) === '[object Object]' || Array.isArray(value);

    /**
     * No-operation
     *
     * @type {Function}
     *
     * @api private
     */
    const noop = () => {};

    class ProxyObserver {

      /**
       * Initializes `ProxyObserver`
       *
       * @param {*} target - Value observed
       *
       * @api public
       */
      constructor (target) {

        /**
         * Value being observed
         *
         * @member {*}
         *
         * @api public
         */
        this.target = target;

        /**
         * Subscriber functions
         *
         * @member {Set.<Function>}
         *
         * @api public
         */
        this.subscribers = new Set();
      }

      /**
       * Default observe options
       *
       * @type {Object}
       * @default
       *
       * @api public
       */
      static get observeOptions () {
        return {
          deep: true,

          // By default, we compare the stringified raw values to avoid observed ones
          // and conflicts between proxy object structures.
          compare (value, old/*, property, target*/) {
            return JSON.stringify(value) !== JSON.stringify(old)
          }
        }
      }

      /**
       * Returns true whether a given `value` is being observed
       * otherwise, returns false
       *
       * @param {*} value - The value itself
       *
       * @return {boolean}
       *
       * @api public
       */
      static is (value) {
        return isObservable(value) && __observers__.has(value)
      }

      /**
       * Gets the `ProxyObserver` instance from the given `value`
       *
       * @param {*} value - The value itself
       *
       * @return {ProxyObserver}
       *
       * @api public
       */
      static get (value) {
        return __observers__.get(value)
      }

      /**
       * Observe a given `target` to detect changes
       *
       * @param {*} target - The value to be observed
       * @param {Object} [options] - An object of options
       * @param {boolean} [options.deep] - Indicating whether observation should be deep
       * @param {Function} [options.compare] - Compare values with a function to dispatch changes
       * @param {Function} [_handler] - Internal global handler for deep observing
       *
       * @return {Proxy} Proxy to track changes
       *
       * @api public
       */
      static observe (target, options = {}, _handler = noop) {
        // Avoid observe twice... Just return the target
        if (ProxyObserver.is(target)) return target

        const { deep, compare } = Object.assign({}, ProxyObserver.observeOptions, options);

        const observer = new ProxyObserver(target);

        function notify (change) {
          _handler(change);
          observer.dispatch(change);
        }

        if (deep) {
          // Start deep observing
          for (const property in target) {
            if (hasOwn.call(target, property)) {
              const value = target[property];

              if (isObservable(value)) {
                // Replace actual value with the observed one
                target[property] = ProxyObserver.observe(value, options, notify);
              }
            }
          }
        }

        const proxy = new Proxy(target, {
          // We can implement something like (get trap):
          // https://stackoverflow.com/a/43236808

          /**
           * 1. Detect sets/additions
           *
           *   In arrays:
           *
           *     array[index] = value
           *     array.push(value)
           *     array.length = length
           *     ...
           *
           *   In objects:
           *
           *     object[key] = value
           *     Object.defineProperty(target, property, descriptor)
           *     Reflect.defineProperty(target, property, descriptor)
           *     ...
           */
          defineProperty (target, property, descriptor) {
            const { value } = descriptor;
            const old = target[property];
            const changed = hasOwn.call(target, property);

            if (deep && isObservable(value)) {
              descriptor.value = ProxyObserver.observe(value, options, notify);
            }

            const defined = Reflect.defineProperty(target, property, descriptor);

            if (defined && (!changed || compare(value, old, property, target))) {
              const change = { type: changed ? 'set' : 'add', value, property, target };

              if (changed) change.old = old;

              notify(change);
            }

            return defined
          },

          /**
           * 2. Track property deletions
           *
           *   In arrays:
           *
           *     array.splice(index, count, additions)
           *     ...
           *
           *   In objects:
           *
           *     delete object[property]
           *     Reflect.deleteProperty(object, property)
           *     ...
           */
          deleteProperty (target, property) {
            const old = target[property];
            const deleted = hasOwn.call(target, property) && Reflect.deleteProperty(target, property);

            if (deleted) {
              notify({ type: 'delete', old, property, target });
            }

            return deleted
          }
        });

        // Indexed by target
        __observers__.set(target, observer);

        // Indexed by proxy
        __observers__.set(proxy, observer);

        return proxy
      }

      /**
       * Subscribe to changes
       *
       * @param {Function} subscriber - Function to subscribe
       *
       * @return {ProxyObserver}
       *
       * @api public
       */
      subscribe (subscriber) {
        this.subscribers.add(subscriber);
        return this
      }

      /**
       * Unsubscribe function
       *
       * @param {Function} subscriber - Functions subscribed
       *
       * @return {ProxyObserver}
       *
       * @api public
       */
      unsubscribe (subscriber) {
        this.subscribers.delete(subscriber);
        return this
      }

      /**
       * Dispatch subscribers with given `change`
       *
       * @param {Object} change - Change descriptor
       *
       * @return {ProxyObserver}
       *
       * @api public
       */
      dispatch (change) {
        this.subscribers.forEach(subscriber => {
          subscriber(change, this.target);
        });

        return this
      }
    }

    return ProxyObserver;

  })));
  });

  var tokens = {
    DOLLAR_SIGN: '$',
    OPEN_BRACE: '{',
    CLOSE_BRACE: '}',
    DOUBLE_QUOTE: '"',
    SINGLE_QUOTE: '\'',
    BACKTICK: '`',
    BACKSLASH: '\\',
    WHITESPACE: ' ',
    TAB: '\t',
    LINE_FEED: '\n',
    CAR_RETURN: '\r'
  };

  const modes = {

    /**
     * @type {number}
     */
    EXPRESSION_MODE: 0,

    /**
     * @type {number}
     */
    TEMPLATE_MODE: 1,

    /**
     * @type {number}
     */
    STRING_MODE: 2
  };

  class State {

    /**
     * Current input index
     *
     * @type {number}
     */
    cursor = 0

    /**
     * Current state mode
     *
     * @type {string}
     */
    mode = modes.EXPRESSION_MODE

    /**
     * Check for escaping chars
     *
     * @type {boolean}
     */
    escaping = false

    constructor (input) {

      /**
       * Input code
       *
       * @type {string}
       */
      this.input = input;
    }

    /**
     * True if
     *
     * @type {boolean}
     */
    get end () {
      return this.cursor >= this.input.length
    }

    /**
     * Previous char
     *
     * @type {string}
     */
    get previous () {
      return this.get(this.cursor - 1)
    }

    /**
     * Current char
     *
     * @type {string}
     */
    get current () {
      return this.get(this.cursor)
    }

    /**
     * Next char
     *
     * @type {string}
     */
    get next () {
      return this.get(this.cursor + 1)
    }

    /**
     * True if current state mode is `template`
     *
     * @type {boolean}
     */
    get inTemplate () {
      return this.mode === modes.TEMPLATE_MODE
    }

    /**
     * True if current state mode is `string`
     *
     * @type {boolean}
     */
    get inString () {
      return this.mode === modes.STRING_MODE
    }

    /**
     * True if current state mode is `expression`
     *
     * @type {boolean}
     */
    get inExpression () {
      return this.mode === modes.EXPRESSION_MODE
    }

    /**
     * Check if a given `char` is the current char state
     *
     * @param {string} char
     * @param {number} offset
     *
     * @return {boolean}
     */
    is (char, offset = 0) {
      return this.get(this.cursor + offset) === char
    }

    /**
     * Get a `char` at specific `index`
     *
     * @param {number} index
     *
     * @return {number}
     */
    get (index) {
      return this.input[index]
    }

    /**
     * Back `cursor` by given `steps`
     *
     * @param {number} steps
     *
     * @return {State}
     */
    back (steps = 1) {
      this.cursor -= steps;

      return this
    }

    /**
     * Advance `cursor` by given `steps`
     *
     * @param {number} steps
     *
     * @return {State}
     */
    advance (steps = 1) {
      this.cursor += steps;

      return this
    }
  }

  const privateState = new WeakMap();

  /**
   * Especial tokens to ignore
   *
   * @type {Array<string>}
   */
  const IGNORED_TOKENS = [
    tokens.LINE_FEED,
    tokens.CAR_RETURN,
    tokens.WHITESPACE,
    tokens.TAB
  ];

  const defaultHandlers = {

    /**
     * Intercept expression chars
     *
     * @param {State}
     *
     * @return {analyze.STOP=}
     */
    expression (state) {},

    /**
     * Intercept string chars
     *
     * @param {State}
     *
     * @return {analyze.STOP=}
     */
    string (state) {}
  };

  /**
   * Intercept expression chars to rewrite/process a given input
   *
   * @param {string|State} inputOrState
   * @param {Object|Function} handlerOrHandlers
   *
   * @return {State}
   */
  function analyze (inputOrState, handlerOrHandlers) {
    const handlers = {};

    if (typeof handlerOrHandlers === 'function') {
      handlers.expression = handlers.string = handlerOrHandlers;
    } else {
      Object.assign(handlers, defaultHandlers, handlerOrHandlers);
    }

    const state = typeof inputOrState === 'string' ? new State(inputOrState) : inputOrState;
    const _state = getPrivateState(state);

    while (!state.end) {
      switch (state.current) {
        case tokens.DOLLAR_SIGN:
          if (state.is(tokens.OPEN_BRACE, 1) && state.inTemplate && !state.escaping) {
            state.mode = modes.EXPRESSION_MODE;
            _state.templateStack.push(_state.braceDepth++);

            // Skip `${`
            state.advance(2);
          }
          break

        case tokens.OPEN_BRACE:
          state.inExpression && _state.braceDepth++;
          break

        case tokens.CLOSE_BRACE:
          if (state.inExpression && --_state.braceDepth === _state.templateStack[_state.templateStack.length - 1]) {
            state.mode = modes.TEMPLATE_MODE;
            _state.templateStack.pop();

            // Skip `}`
            state.advance();
          }
          break

        case tokens.BACKTICK: case tokens.SINGLE_QUOTE: case tokens.DOUBLE_QUOTE:
          if (state.inExpression) {
            state.mode = state.is(tokens.BACKTICK) ? modes.TEMPLATE_MODE : modes.STRING_MODE;
            _state.stringOpen = state.current;

            // Skip opening string quote
            state.advance();
          } else if (state.is(_state.stringOpen) && !state.escaping) {
            state.mode = modes.EXPRESSION_MODE;
            _state.stringOpen = null;

            // Skip current closing string quote
            state.advance();
          }
          break
      }

      // Avoid call handlers if finished
      if (state.end) break

      let result;

      if (state.inExpression) {

        // Ignore some special chars on expression
        if (IGNORED_TOKENS.some(token => state.is(token))) {
          state.advance();
          continue
        }

        result = handlers.expression(state);

      // Skip escape char
      } else if (!state.is(tokens.BACKSLASH) || state.escaping) {
        result = handlers.string(state);
      }

      // Current analyzing can be stopped from handlers
      if (result === analyze.STOP) break

      // Detect correct escaping
      state.escaping = state.mode !== modes.EXPRESSION_MODE && state.is(tokens.BACKSLASH) && !state.escaping;

      state.advance();
    }

    return state
  }

  /**
   * Signal to stop analyze
   *
   * @type {number}
   */
  analyze.STOP = 5709; // S(5) T(7) O(0) P(9)

  /**
   * Analyze string chars from a given `inputOrState`
   *
   * @param {string|State} inputOrState
   * @param {Function} handler
   *
   * @return {State}
   */
  analyze.expression = function analyzeExpression (inputOrState, handler) {
    return analyze(inputOrState, { expression: handler })
  };

  /**
   * Analyze expression chars from a given `inputOrState`
   *
   * @param {string|State} inputOrState
   * @param {Function} handler
   *
   * @return {State}
   */
  analyze.string = function analyzeString (inputOrState, handler) {
    return analyze(inputOrState, { string: handler })
  };

  /**
   * Get private state from a given `state`
   *
   * @param {State} state
   *
   * @return {Object}
   * @private
   */
  function getPrivateState (state) {
    let _state = privateState.get(state);

    if (!_state) {
      privateState.set(state, _state = {

        /**
         * @type {number}
         */
        braceDepth: 0,

        /**
         * @type {Array<number>}
         */
        templateStack: [],

        /**
         * @type {string}
         */
        stringOpen: null
      });
    }

    return _state
  }

  var tokens$1 = {

    /**
     * Tokens for filters
     */
    GT: '>',
    PIPE: '|',

    /**
     * Token for stateful methods
     */
    STATEFUL_TOKEN: '#',

    /**
     * Tokens for templates
     */
    OPEN_TEMPLATE: '{',
    CLOSE_TEMPLATE: '}',

    /**
     * Shared tokens
     */
    START_ARGS: '(',
    END_ARGS: ')'
  };

  /**
   * Matches line feed
   *
   * @type {RegExp}
   */
  const LINE_FEED_REGEX = /\r?\n/g;

  /**
   * Default highlight padding
   *
   * @type {number}
   */
  const DEFAULT_PADDING = 25;

  /**
   * Simple codeframe implementation
   *
   * @param {string} code
   * @param {number} index
   * @param {number=} padding
   *
   * @return {string}
   */
  function highlight (code, index, padding = DEFAULT_PADDING) {
    const leftPadding = Math.max(0, index - padding);

    let lineFeedPadding = 0;
    let part = code.slice(leftPadding, index + padding);

    part = part.replace(LINE_FEED_REGEX, () => {
      lineFeedPadding++;
      return '\\n'
    });

    return part + '\n' + ' '.repeat(lineFeedPadding + index - leftPadding) + '^'
  }

  class GalaxyCompilerError extends Error {
    name = 'GalaxyCompilerError'

    constructor (message, location = null) {
      super(message);

      this.location = location;
    }
  }

  /**
   * Build an error message with a codeframe in it
   *
   * @param {string} message
   * @param {string} code
   * @param {number} index
   *
   * @return {GalaxyCompilerError}
   */
  function buildError (message, code, index) {
    return new GalaxyCompilerError(`\n\n${message.replace(/^[a-z]/, l => l.toUpperCase())}:\n\n\t${highlight(code, index).replace(/\n/, '\n\t')}\n`, index)
  }

  /**
   * Matches correct identifier name
   *
   * @type {RegExp}
   */
  const METHOD_NAME_REGEX = /[$\w]/;

  /**
   * @type {RegExp}
   */
  const INVALID_START_METHOD_NAME = /\$|\d/;

  /**
   * Get function definition from a given `parentState`
   *
   * @param {string} type
   * @param {State} parentState
   *
   * @return {Object}
   */
  function getFnDefinition (type, parentState) {
    const definition = {};
    const expression = parentState.input;
    const methodStart = parentState.cursor;

    if (INVALID_START_METHOD_NAME.test(parentState.current)) {
      throw buildError(`invalid ${type} start char name`, expression, methodStart)
    }

    analyze.expression(parentState, nameState => {
      if (nameState.is(tokens$1.START_ARGS)) {
        let depth = 1;

        const argsStart = nameState.advance().cursor;
        const methodName = definition.name = expression.slice(methodStart, argsStart - 1);

        if (!methodName.length) {
          throw buildError(`${type} should have a name`, expression, methodStart)
        }

        analyze.expression(nameState, argsState => {
          if (argsState.is(tokens$1.START_ARGS)) {
            depth++;
          } else if (argsState.is(tokens$1.END_ARGS) && !--depth) {
            definition.args = expression.slice(argsStart, argsState.cursor);
            return analyze.STOP
          }
        });

        return analyze.STOP
      } else if (!METHOD_NAME_REGEX.test(nameState.current)) {
        throw buildError(`invalid char in ${type} name`, expression, nameState.cursor)
      }
    });

    return definition
  }

  function rewriteMethods (expression, pragma) {
    let rewritten = '';
    let prevMethodEnd = 0;

    analyze.expression(expression, methodState => {
      if (methodState.is(tokens$1.STATEFUL_TOKEN)) {
        const methodStart = methodState.advance().cursor;
        const { name, args } = getFnDefinition('stateful method', methodState);

        rewritten += expression.slice(prevMethodEnd, methodStart - 1) + `${pragma}('${name}'${args ? `, ${rewriteMethods(args)}` : ''})`;
        prevMethodEnd = methodState.cursor + 1;
      }
    });

    return rewritten + expression.slice(prevMethodEnd)
  }

  // Skips `|` and `>` tokens
  const SKIP_FILTER_TOKEN = 2;

  /**
   * Get filter expression
   *
   * @param {string} expression
   *
   * @return {string}
   */
  function getFilterExpression (expression, pragma) {
    let start = 0;
    const parts = [];

    analyze.expression(expression, state => {
      if (state.is(tokens$1.GT) && state.is(tokens$1.PIPE, -1)) {
        parts.push({
          start, // Save start index just for error debugging
          expression: expression.slice(start, (start = state.cursor + 1) - SKIP_FILTER_TOKEN)
        });
      }
    });

    // Push last expression
    parts.push({ start, expression: expression.slice(start) });

    return parts.slice(1).reduce((filtered, { start, expression: _expression }) => {
      const filter = _expression.trim();

      if (!filter) {
        throw buildError('missing filter expression', expression, start)
      }

      let name, args;

      try {
        ({ name, args } = getFnDefinition('filter', new State(filter)));
      } catch (error) {

        // TODO: Check for a galaxy compiler error
        // A little hacky code to catch correct error location and message
        throw buildError(error.message.split(':', 1)[0].trimStart(), expression,  error.location + start + 1)
      }

      return `${pragma}('${name || filter}', ${filtered}${args ? `, ${args}` : ''})`
    }, parts[0].expression.trim())
  }

  const SKIP_OPEN_TEMPLATE = 2;

  /**
   * Get an inlined JavaScript expression
   *
   * @param {string} template - String with interpolation tags
   * @param {string} pragma
   * @param {string} filterPragma
   *
   * @return {string}
   */
  function getTemplateExpression (template, pragma, filterPragma) {
    let expressions = [];
    let prevTemplateEnd = 0;

    function tryPushContext (context) {
      if (context) {
        expressions.push(`\`${context}\``);
      }
    }

    analyze.expression(template, state => {
      if (state.is(tokens$1.OPEN_TEMPLATE) && state.is(tokens$1.OPEN_TEMPLATE, -1)) {
        let depth = 1;

        const templateStart = state.advance().cursor;

        analyze.expression(state, templateState => {
          if (templateState.is(tokens$1.OPEN_TEMPLATE)) {
            depth++;
          } else if (templateState.is(tokens$1.CLOSE_TEMPLATE) && !--depth) {
            if (!templateState.is(tokens$1.CLOSE_TEMPLATE, 1)) {
              throw buildError('expecting closing template tag', template, templateState.cursor + 1)
            }

            tryPushContext(template.slice(prevTemplateEnd, templateStart - SKIP_OPEN_TEMPLATE));

            const expression = template.slice(templateStart, templateState.cursor).trim();

            if (!expression) {
              throw buildError('missing template expression', template, templateState.cursor - 1)
            }

            try {
              expressions.push(`${pragma}(${getFilterExpression(expression, filterPragma)})`);
            } catch (error) {
              throw new GalaxyCompilerError(`\n\nError in template expression...\n${error.message.trimStart()}`, error.location)
            }

            templateState.advance(2);

            prevTemplateEnd = templateState.cursor;
            return analyze.STOP
          }
        });
      }
    });

    tryPushContext(template.slice(prevTemplateEnd));

    return expressions.join(' + ')
  }

  const defaultPragma = {
    template: '__$n',
    filter: '$filter',
    method: '$commit'
  };

  const genUUID = (() => {
    let uuid = 0;

    return () => Math.random().toString(16).slice(2) + uuid++
  })();

  class Compiler {
    constructor ({ scope, pragma }) {

      /**
       * @type {string}
       * @private
       */
      this._id = genUUID();

      /**
       * Cache for evaluators
       *
       * @type {Map<string, Function>}
       * @private
       */
      this._evaluators = new Map();

      /**
       * @type {GalaxyElement}
       */
      this.scope = scope;

      /**
       * @type {Object.<string>}
       */
      this.pragma = Object.assign({}, defaultPragma, pragma);
    }

    /**
     * Compile a given template expression
     *
     * A template expression looks like this: 'Hello, {{ firstName }} {{ lastName }}'
     *
     * @param {string} template
     *
     * @return {Function}
     */
    compileTemplate (template) {
      return this.compileGetter(getTemplateExpression(template, this.pragma.template, this.pragma.filter))
    }

    /**
     * Compile a given expression
     *
     * @param {string} expression
     *
     * @return {Function}
     */
    compileExpression (expression) {
      return this.compileGetter(getFilterExpression(expression, this.pragma.filter))
    }

    /**
     * Compile a given event expression
     *
     * @param {string} expression
     *
     * @return {Function}
     */
    compileEvent (expression) {
      return this.compileEvaluator(rewriteMethods(expression, this.pragma.method))
    }

    /**
     * Compile an scoped setter with given `expression`
     *
     * @param {string} expression - JavaScript expression
     *
     * @return {Function}
     */
    compileSetter (expression) {
      return this.compileEvaluator(`(${expression} = __args_${this._id}__[0])`)
    }

    /**
     * Compile an scoped getter with given `expression`
     *
     * @param {string} expression - JavaScript expression
     *
     * @return {Function}
     */
    compileGetter (expression) {
      return this.compileEvaluator(`return ${expression}`)
    }

    /**
     * Compile a scoped evaluator function
     *
     * @param {string} body - Function body
     *
     * @return {Function}
     */
    compileEvaluator (body) {
      let evaluator = this._evaluators.get(body);

      if (!evaluator) {
        evaluator = new Function(
          `__locals_${this._id}__`, `...__args_${this._id}__`,
          'with (this) {' +
            'with (state) {' +
              `with (__locals_${this._id}__) {` +
                body +
              '}' +
            '}' +
          '}'
        );

        // Cache evaluator with body as key
        this._evaluators.set(body, evaluator);
      }

      return (locals = {}, ...args) => evaluator.call(this.scope, locals, ...args)
    }
  }

  class GalaxyError extends Error {}

  /**
   * Converts given `error`
   *
   * @param {Error} error
   *
   * @return {GalaxyError}
   */
  function galaxyError ({ message, stack }) {
    const galaxyError = new GalaxyError(message);

    // Setting up correct stack
    galaxyError.stack = stack;

    return galaxyError
  }

  /**
   * Match text template interpolation
   *
   * @type {RegExp}
   */
  const TEXT_TEMPLATE_REGEX = /{{.*?}}/;

  /**
   * Renderer for inline tag template binding:
   *
   *   1. Within text node: <h1>Hello {{ world }}</h1>
   *   2. As attribute interpolation: <input class="some-class {{ klass }}"/>
   */
  class TemplateRenderer {
    constructor (node, { scope, isolated }) {
      this.node = node;

      const templateFn = scope.$compiler.compileTemplate(node.nodeValue);

      this.getter = () => templateFn(isolated);
    }

    static is ({ nodeValue }) {
      return TEXT_TEMPLATE_REGEX.test(nodeValue)
    }

    render () {
      const value = this.getter();

      if (this.node.nodeValue !== value) {
        this.node.nodeValue = value;
      }
    }
  }

  function isObject (value) {
    return value !== null && typeof value === 'object'
  }

  function isTextNode (node) {
    return node.nodeType === Node.TEXT_NODE
  }

  function isElementNode (node) {
    return node.nodeType === Node.ELEMENT_NODE
  }

  function isFunction (value) {
    return typeof value === 'function'
  }

  function isDefined (value) {
    return value != null
  }

  function isReserved (name) {
    return name.startsWith('$') || name.startsWith('_')
  }

  function isPlaceholder (element) {
    return element instanceof HTMLTemplateElement
  }

  function isGalaxyElement (element) {
    return !!element.$galaxy
  }

  /**
   * Renderer for void elements or elements without childs like:
   */
  class VoidRenderer {
    constructor (element, scope, isolated) {

      /**
       *
       */
      this.scope = scope;

      /**
       *
       */
      this.element = element;

      /**
       * Loop elements need an isolated scope
       *
       * Note: We need to create a shallow copy
       * to avoid overrides a parent isolated scope
       */
      this.isolated = isolated;

      /**
       *
       */
      this.locals = Object.create(null);

      /**
       *
       */
      this.isPlaceholder = isPlaceholder(element);

      /**
       * Hold directives to digest
       */
      this.directives = [];

      this._init(element);
    }

    get isRenderable () {
      return this.directives.length
    }

    _init ($el) {
      const attributes = Array.from($el.attributes);

      for (const attribute of attributes) {
        const { name, value } = attribute;

        if (TemplateRenderer.is(attribute)) {
          this.directives.push(new TemplateRenderer(attribute, this));
        }

        for (const Directive of config.directives) {

          // 1. Private match filter
          const match = Directive._match(name, $el);

          if (match) {
            const init = {
              name: match.name,
              args: match.args ? match.args.split('.') : [],
              value
            };

            // 2. Public match filter
            if (Directive.match(init, this)) {
              const directive = new Directive(init, this);

              // Initialize directive
              directive.init();

              // Check for renderable directives
              if (directive.$options.$render) {
                this.directives.push(directive);
              }

              if (!config.debug) $el.removeAttribute(name);
              break
            }
          }
        }
      }
    }

    render () {
      for (const directive of this.directives) {
        directive.render();
      }
    }
  }

  var nextTick = createCommonjsModule(function (module, exports) {
  (function (global, factory) {
    module.exports = factory();
  }(commonjsGlobal, (function () {
    /**
     * Resolved promise to schedule new microtasks
     *
     * @type {Promise}
     *
     * @api private
     */
    const resolved = Promise.resolve();

    /**
     * Queue of callbacks to be flushed
     *
     * @type {Array}
     *
     * @api public
     */
    const queue = nextTick.queue = [];

    /**
     * Defers execution of a given `callback`
     *
     * @param {Function} callback - Function to be deferred
     *
     * @return void
     *
     * @api public
     */
    function nextTick (callback) {
      if (!nextTick.waiting) {
        // Always flushing in a microtask
        resolved.then(nextTick.flush);
      }

      queue.push(callback);
    }

    /**
     * Determines when we are waiting to flush the queue
     *
     * @type {boolean}
     *
     * @api public
     */
    Object.defineProperty(nextTick, 'waiting', {
      enumerable: true,
      get () {
        return queue.length > 0
      }
    });

    /**
     * Defers a callback to be called
     * after flush the queue
     *
     * @param {Function} callback
     *
     * @return void
     */
    nextTick.afterFlush = callback => {
      setTimeout(() => {
        if (!nextTick.waiting) return callback()

        // If we are waiting, then re-schedule call
        nextTick.afterFlush(callback);
      });
    };

    /**
     * Flushes the actual queue
     *
     * @return {boolean}
     */
    nextTick.flush = () => {
      if (nextTick.waiting) {
        const callbacks = queue.slice();

        // Empty actual queue
        queue.length = 0;

        for (const callback of callbacks) {
          callback();
        }
      }
    };

    return nextTick;

  })));
  });

  var matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;

  var escapeStringRegexp = function (str) {
  	if (typeof str !== 'string') {
  		throw new TypeError('Expected a string');
  	}

  	return str.replace(matchOperatorsRe, '\\$&');
  };

  class ElementTransitionEvent extends Event {
    constructor (type, init) {
      super(type, init);

      /**
       * Element where the transition gets dispatched
       *
       * @type {HTMLElement}
       */
      this.$target = init.target;

      /**
       * Transition stopped?
       *
       * @type {boolean}
       */
      this.$stopped = false;

      /**
       * Transition performed?
       *
       * @type {boolean}
       */
      this.$performed = false;

      /**
       * Callback for transitions
       *
       * @type {Function}
       * @private
       */
      this._transitionCb = init.transitionCb;
    }

    /**
     * Custom `preventDefault`-like fn
     *
     * @return void
     */
    stop () {
      if (this.$performed) return

      this.$stopped = true;
    }

    /**
     * Allow transition perform
     */
    play () {
      if (this.$performed) return

      this.$stopped = false;
    }

    /**
     * Perform transition
     *
     * @return void
     */
    perform () {
      if (this.$stopped || this.$performed) return

      this.$stopped = false;
      this.$performed = true;

      this._transitionCb();
    }
  }

  const same = value => value;

  const HYPHEN_REGEX = /-([a-z0-9])/gi;
  const CAMEL_REGEX = /(?<=[a-z0-9])([A-Z])/g;

  const NAME_WILDCARD_DIRECTIVE = '<name>';

  function compileMatcher (name) {
    name = escapeStringRegexp(name);
    const capture = name.replace(NAME_WILDCARD_DIRECTIVE, getWildcardCapture('[:\\w-]+'));

    return new RegExp(`^${capture === name ? getWildcardCapture(name) : capture}(?:.(?<args>.+))?$`)
  }

  function getWildcardCapture (name) {
    return `(?${NAME_WILDCARD_DIRECTIVE}${name})`
  }

  /**
   * Converts hyphenated string to camelized
   *
   * @param {string} hyphenated
   *
   * @return {string}
   */
  function camelize (hyphenated) {
    return hyphenated.replace(HYPHEN_REGEX, (_, letter) => letter.toUpperCase())
  }

  /**
   * Converts camelized string to hyphenated
   *
   * @param {string} camelized
   *
   * @return {string}
   */
  function hyphenate (camelized) {
    return camelized.replace(CAMEL_REGEX, (_, letter) => `-${letter.toLowerCase()}`)
      // Make rest letters lowercased
      .toLowerCase()
  }

  function getAttr (element, name, conversor = same) {
    const value = conversor(element.getAttribute(name));

    if (!config.debug) element.removeAttribute(name);

    return value
  }

  function createAnchor (content) {
    return config.debug ? new Comment(` ${content} `) : new Text()
  }

  /**
   * Creates a new child isolated
   *
   * @param {*} parents - Parents to inherit from
   *
   * @return {Object}
   */
  function newIsolated (...parents) {
    return Object.assign(Object.create(null), ...parents)
  }

  /**
   * Check if the value of a given `node`
   * differs againts the given `value`
   *
   * @param {Node} node - Node element to check
   * @param {*} value - Value to compare with
   *
   * @return {boolean}
   */
  function differ (node, value) {
    return node.nodeValue !== value
  }

  /**
   * Flat children from a given `element`
   *
   * @param {ElementRenderer} element
   *
   * @return {Array.<*>}
   */
  function flatChildren (element) {
    const flat = [];

    element.childrenRenderer.renderers.forEach(renderer => {
      flat.push(...(renderer.isFlattenable ? flatChildren(renderer) : [renderer]));
    });

    return flat
  }

  function callHook (ce, hook, extra) {

    // Emit sync
    ce.$emit(`$${hook}`, extra);

    hook = ce[
      // Capitalize given hook name
      `on${hook.charAt(0).toUpperCase() + hook.slice(1)}`
    ];

    if (isFunction(hook)) {

      // Emit async
      nextTick.afterFlush(() => {
        hook.call(ce, extra);
      });
    }
  }

  function ensureListeners (events, event) {
    return events[event] || []
  }

  function removeListener (events, event, listener) {
    const alive = ensureListeners(events, event).filter(_ => _ !== listener);

    if (alive.length) {
      events[event] = alive;
    } else {
      delete events[event];
    }
  }

  function applyMixins (Class, mixins) {
    return Object.assign(Class.prototype, ...mixins)
  }

  function mergeEventHandlers (handlers) {
    return (...args) => {
      let i = 0;

      const next = (...args) => {
        const current = handlers[i++];

        if (current) {
          current(next, ...args);
        }
      };

      next(...args);
    }
  }

  function dispatchTransitionEvent (source, type, target, transitionCb) {
    const transitionEvent = new ElementTransitionEvent(type, {
      target,
      transitionCb
    });

    source.dispatchEvent(transitionEvent);

    // Perform transition (waiting for non-stopped transition)
    transitionEvent.perform();
  }

  class ElementRenderer extends VoidRenderer {
    constructor (element, scope, isolated) {
      super(element, scope, newIsolated(isolated));

      /**
       * Resolve children rendering
       */
      this.childrenRenderer = new ChildrenRenderer((this.isPlaceholder ? element.content : element).childNodes, scope, this.isolated);
    }

    get isRenderable () {
      return (
        super.isRenderable ||
        this.childrenRenderer.renderers.length > 0
      )
    }

    get isFlattenable () {
      return (
        this.childrenRenderer.renderers.length > 0 &&
        !this.directives.length
      )
    }

    render () {
      // Render directives
      super.render();

      // Render correctly on conditional flow
      if (this.isPlaceholder || this.element.isConnected) {

        // Render children
        this.childrenRenderer.render();
      }
    }
  }

  class ItemRenderer extends ElementRenderer {
    constructor (template, renderer, isolated) {
      super(
        template.cloneNode(true), renderer.scope,

        // Scope inheritance
        newIsolated(renderer.isolated, isolated)
      );

      const indexBy = this.scope.$compiler.compileExpression(this.element.getAttribute('by'));

      this.by = locals => indexBy(newIsolated(this.isolated, locals));
      this.reused = false;
    }

    get children () {
      return this.childrenRenderer.children
    }

    get key () {
      return this.by()
    }

    get next () {
      return (this.isPlaceholder ? this.children[this.children.length - 1] : this.element).nextSibling
    }

    update (isolated) {
      this.reused = true;

      Object.assign(this.isolated, isolated);
    }

    insert (node, transitionType = 'enter', withTransition = true) {
      if (!this.isPlaceholder) {
        const performInsert = () => node.before(this.element);

        return withTransition
          ? this._dispatchTransitionEvent(transitionType, this.element, performInsert)
          : performInsert()
      }

      const performInsert = child => node.before(child);

      this.children.forEach(child => {
        if (withTransition) {
          this._dispatchTransitionEvent(transitionType, this.element, () => performInsert(child));
        } else {
          performInsert(child);
        }
      });
    }

    remove () {
      if (this.isPlaceholder) {
        return this.children.forEach(child => {
          this._dispatchTransitionEvent('leave', this.element, () => child.remove());
        })
      }

      this._dispatchTransitionEvent('leave', this.element, () => {
        this.element.remove();
      });
    }

    _dispatchTransitionEvent (type, target, transitionCb) {
      dispatchTransitionEvent(this.element, `for:${type}`, target, transitionCb);
    }
  }

  const LOOP_DIRECTIVE = '*for';

  /**
   * Capture:
   *
   *  (<value>[, <key>[, <index>]]) in/of <expression>
   *
   *  - value: A value of the array or object
   *  - key: A key of the array or object
   *  - index: An index of the array or object
   *  - expression: Can be any JavaScript expression
   *
   *  Note: Parens can be omitted.
   */
  const LOOP_REGEX = /^\(?(?<value>\w+)(?:\s*,\s*(?<key>\w+)(?:\s*,\s*(?<index>\w+))?)?\)?\s+(?:in|of)\s+(?<expression>.+)$/;

  class LoopRenderer {
    constructor (template, renderer) {
      this.template = template;
      this.renderer = renderer;

      this.items = [];
      this.values = new Map();

      const expression = getAttr(template, LOOP_DIRECTIVE);
      const { groups } = expression.match(LOOP_REGEX);

      this.keyName = groups.key;
      this.indexName = groups.index;
      this.valueName = groups.value;

      this.startAnchor = createAnchor(`start for: ${expression}`);
      this.endAnchor = createAnchor(`end for: ${expression}`);

      this.getter = renderer.scope.$compiler.compileExpression(groups.expression);

      // Replace template with an anchor
      template.replaceWith(this.startAnchor);
      this.startAnchor.nextSibling.before(this.endAnchor);

      if (!template.hasAttribute('by')) {
        if (config.debug) {
          console.warn(
            'The element with the loop expression `' + expression + '` ' +
            'doesn\'t have a `by` attribute, fallbacking to `$index` tracking.'
          );
        }

        template.setAttribute('by', '$index');
      }
    }

    static is ({ attributes }) {
      return LOOP_DIRECTIVE in attributes
    }

    render () {
      const collection = this.getter(this.renderer.isolated);

      const items = [];
      const keys = Object.keys(collection);

      // 1. Adding, updating
      keys.forEach(($key, $index) => {
        let item = this.items[$index];

        const isolated = {
          $index,
          $key,

          // User-defined locals
          [this.keyName]: $key,
          [this.indexName]: $index,
          [this.valueName]: collection[$key]
        };

        if (!item) {
          item = new ItemRenderer(this.template, this.renderer, isolated);

          // Insert before end anchor
          item.insert(this.endAnchor);

          this.values.set(item.key, item);
        } else {
          const newKey = item.by(isolated);

          if ((item.key /* oldKey */) !== newKey) {
            const newItem = this.values.get(newKey);
            const from = newItem.next;

            // Dispatch move transition
            newItem.insert(item.next, 'move');

            // Avoid dispatching transition for reference items
            item.insert(from, null, false);

            // Swap items
            this.items[this.items.indexOf(newItem)] = item;
            this.items[$index] = newItem;

            item = newItem;
          }

          item.update(isolated);
        }

        // Push render on to the new queue
        items.push(item);

        item.render();
      });

      // 2. Removing
      for (const item of this.items) {
        if (item.reused) {
          // Enable recycling again
          item.reused = false;
        } else {
          this.values.delete(item.key.value);
          item.remove();
        }
      }

      this.items = items;
    }
  }

  class ChildrenRenderer {
    constructor (children, scope, isolated) {
      this.children = Array.from(children);
      this.scope = scope;
      this.isolated = isolated;

      /**
       * Resolve children renderers
       */
      this.renderers = [];

      // Attach children
      this._init();
    }

    _init () {
      for (const child of this.children) {

        // 1. Check {{ interpolation }}
        if (isTextNode(child) && TemplateRenderer.is(child)) {
          this.renderers.push(new TemplateRenderer(child, this));

        // 2. Element binding
        } else if (isElementNode(child)) {

          // The loop directive is resolved as a child
          if (LoopRenderer.is(child)) {
            this.renderers.push(new LoopRenderer(child, this));
          } else {
            const element = new ((isPlaceholder(child) ? child.content : child).childNodes.length ? ElementRenderer : VoidRenderer)(child, this.scope, this.isolated);

            // Only consider a render element if its childs
            // or attributes has something to bind/update
            if (element.isRenderable) {
              this.renderers.push(...(element.isFlattenable ? flatChildren(element) : [element]));
            }
          }
        }

        // ... ignore comment nodes
      }
    }

    render () {
      for (const renderer of this.renderers) {
        renderer.render();
      }
    }
  }

  /**
   * Setup GalaxyElement's main renderer
   *
   * @param {GalaxyElement} $element
   */
  function setupRenderer ($element) {
    let shadow;

    const { style, template } = $element.constructor;

    try {
      shadow = $element.attachShadow({ mode: 'open' });
    } catch (e) {
      /**
       * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#Exceptions
       */
    }

    if (style instanceof HTMLStyleElement) {
      if (!shadow) throw new GalaxyError('style cannot be attached')

      shadow.appendChild(style.cloneNode(true));
    }

    if (template instanceof HTMLTemplateElement) {
      if (!shadow) throw new GalaxyError('template cannot be attached')

      shadow.appendChild(template.content.cloneNode(true));
    }

    return new ChildrenRenderer(shadow ? shadow.childNodes : [], $element, {})
  }

  /**
   * Core GalaxyElement API
   *
   * @mixin
   */
  var CoreMixin = {

    /**
     * Filter a given `value`
     *
     * @param {string} name
     * @param {*} value
     * @param  {...*} args
     *
     * @return {*}
     */
    $filter (name, value, ...args) {
      const filter = config.filters[name];

      if (!filter) {
        throw new GalaxyError(`Unknown filter '${name}'`)
      }

      return filter(value, ...args)
    },

    /**
     * Intercept given method call by passing the state
     *
     * @param {string} method - Method name
     * @param {*...} [args] - Arguments to pass in
     *
     * @throws {GalaxyError}
     *
     * @return void
     */
    $commit (method, ...args) {
      if (method in this) {
        if (!isFunction(this[method])) {
          throw new GalaxyError(`Method '${method}' must be a function`)
        }

        if (isReserved(method)) {
          throw new GalaxyError(`Could no call reserved method '${method}'`)
        }

        this[method](this.state, ...args);
      }
    },

    /**
     * Reflect state changes to the DOM
     *
     * @return void
     */
    $render () {
      if (!this.$rendering) {
        this.$emit('$render:before');

        this.$rendering = true;

        nextTick(() => {

          // Takes render error
          let renderError;

          try {
            this.$renderer.render();
          } catch (e) {
            if (!(e instanceof GalaxyError)) {
              e = galaxyError(e);
            }

            // Don't handle the error in debug mode
            if (config.debug) throw e

            renderError = e;
          }

          // Sleep after render new changes
          this.$rendering = false;

          if (renderError) {

            // Event syntax: {phase}:{subject}
            this.$emit('$render:error', renderError);
          }
        });
      }
    }
  }

  /**
   * Events - Custom and native events API
   *
   * @mixin
   */
  var EventsMixin = {

    /**
     * Attach a given listener to an event
     *
     * @param {string} event
     * @param {Function} listener
     * @param {Object|boolean} [options]
     *
     * @return void
     */
    $on (event, listener, options) {
      (this.$events[event] = ensureListeners(this.$events, event)).push(listener);

      this.addEventListener(event, listener, options);
    },

    /**
     * Attach a listener to be called once
     *
     * @param {string} event
     * @param {Function} listener
     * @param {Object|boolean} [options]
     *
     * @return void
     */
    $once (event, listener, options = {}) {
      if (typeof options === 'boolean') {
        options = { capture: options };
      }

      const onceCalled = $event => {
        removeListener(listener);
        listener.call(this, $event);
      };

      // Once called option
      options.once = true;

      // Reference to original listener
      onceCalled.listener = listener;

      this.$on(event, onceCalled, options);
    },

    /**
     * Detach a given listener from an event
     *
     * @param {string} event
     * @param {Function} listener
     *
     * @return void
     */
    $off (event, listener) {
      switch (arguments.length) {

        // .$off()
        case 0: for (event in this.$events) {
          this.$off(event);
        } break

        // .$off('event')
        case 1: for (const listener of ensureListeners(this.$events, event)) {
          this.$off(event, listener);
        } break

        // .$off('event', listener)
        default: {
          removeListener(this.$events, event, listener);
          this.removeEventListener(event, listener);
        }
      }
    },

    /**
     * Dispatch an event
     *
     * @param {Event|string} event
     * @param {*} [detail]
     *
     * @return void
     */
    $emit (event, detail) {
      this.dispatchEvent(
        event instanceof Event
          ? event
          : new CustomEvent(event, { detail })
      );
    }
  }

  /**
   * Lifecycle hooks
   *
   * @mixin
   */
  var HooksMixin = {

    /**
     *
     */
    connectedCallback () {
      let $parent = this;

      do {
        $parent = $parent[$parent instanceof ShadowRoot ? 'host' : 'parentNode'];
      } while ($parent && !isGalaxyElement($parent))

      // Set parent communication
      this.$parent = $parent;

      callHook(this, 'attached');
    },

    /**
     *
     */
    disconnectedCallback () {
      // Cut-out parent communication
      this.$parent = null;

      callHook(this, 'detached');
    },

    /**
     *
     * @param {*} name
     * @param {*} old
     * @param {*} value
     */
    attributeChangedCallback (name, old, value) {
      callHook(this, 'attribute', { name, old, value });
    }
  }

  /**
   * Private methods
   *
   * @mixin
   */
  var PrivatesMixin = {

    /**
     * Normalize given template value
     *
     * @param {*} value
     *
     * @return {string}
     */
    __$n (value) {
      return isDefined(value) ? value : ''
    }
  }

  /**
   * Internal
   */
  const __proxies__ = new WeakMap();

  /**
   * Creates a GalaxyElement class
   *
   * @param {HTMLElement} SuperElement
   *
   * @return {GalaxyElement}
   *
   * @api public
   */
  function extend (SuperElement) {

    class GalaxyElement extends SuperElement {

      /**
       * Hold element references
       *
       * @type {Object.<Element>}
       * @public
       */
      $refs = Object.create(null)

      /**
       * Attached events
       *
       * @type {Object.<Array>}
       * @public
       */
      $events = Object.create(null)

      /**
       * Give directly access to the parent galaxy element
       *
       * @type {GalaxyElement}
       * @public
       */
      $parent = null

      /**
       * Determines whether we are in a rendering phase
       *
       * @type {boolean}
       * @public
       */
      $rendering = false

      /**
       * State for data-binding
       *
       * @type {Object}
       * @public
       */
      get state () { return __proxies__.get(this) }
      set state (state) {
        const render = () => { this.$render(); };

        __proxies__.set(this, proxyObserver.observe(state, null, render));

        // State change, so render...
        render();
      }

      /**
       * Galaxy element name
       *
       * @type {string}
       * @public
       */
      static get is () { return hyphenate(this.name) }
      get $name () { return this.constructor.is }

      /**
       * Children GalaxyElement definitions
       *
       * @type {Array<GalaxyElement>}
       * @public
       */
      static children = []

      constructor () {
        super();

        // This performs the initial render
        this.state = {};

        /**
         * Compiler for directives
         *
         * @type {Compiler}
         * @public
         */
        this.$compiler = new Compiler({ scope: this });

        /**
         * Main renderer
         *
         * @type {ChildrenRenderer}
         * @public
         */
        this.$renderer = setupRenderer(this);

        // Call element initialization
        callHook(this, 'created');
      }
    }

    /**
     * Used internally
     * Simply to avoid: GalaxyElement.prototype.__proto__.[[constructor]]
     *
     * @type {boolean}
     */
    GalaxyElement.extendsBuiltIn = SuperElement !== HTMLElement;

    /**
     * Is this element resolved?
     *
     * @type {boolean}
     */
    GalaxyElement.resolved = false;

    /**
     * Mark (both constructor and __proto__) as GalaxyElement
     */
    GalaxyElement.prototype.$galaxy = GalaxyElement.$galaxy = true;

    // Mix features
    applyMixins(GalaxyElement, [
      CoreMixin,
      EventsMixin,
      HooksMixin,
      PrivatesMixin
    ]);

    // Return mixed
    return GalaxyElement
  }

  /**
   * Default directive options
   *
   * @enum {*}
   */
  const options = {
    $plain: false,
    $render: true
  };

  class GalaxyDirective {

    static get is () {
      return hyphenate(this.name)
    }

    constructor (init, renderer) {

      /**
       *
       */
      this.$name = init.name;

      /**
       *
       */
      this.$args = init.args;

      /**
       *
       */
      this.$value = init.value;

      /**
       *
       */
      this.$renderer = renderer;

      /**
       *
       */
      this.$scope = renderer.scope;

      /**
       *
       */
      this.$compiler = this.$scope.$compiler;

      /**
       *
       */
      this.$element = renderer.element;

      /**
       *
       */
      this.$options = Object.assign({}, options, this.constructor.options);

      if (!this.$options.$plain) {
        const getter = this.$compiler.compileExpression(init.value);

        /**
         *
         */
        this.$getter = locals => getter(newIsolated(renderer.isolated, locals));
      }
    }

    /**
     * @noop
     */
    static get is () {
      return ''
    }

    /**
     * @noop
     */
    static match () {
      return true
    }

    /**
     * @noop
     */
    init () {

    }

    /**
     * @noop
     */
    render () {

    }
  }

  /**
   * Filled in registration time
   */
  GalaxyDirective._matcher = null;

  /**
   * Fill match
   */
  GalaxyDirective._match = function (name) {
    const match = this._matcher.exec(name);

    return match && match.groups
  };

  class ConditionalDirective extends GalaxyDirective {
    static get is () {
      return '*if'
    }

    get isPlaceholder () {
      return this.$renderer.isPlaceholder
    }

    init () {
      this.anchor = createAnchor(`if: ${this.$value}`);
      this.render = this.isPlaceholder ? this._firstRenderMultiple : this._renderSingle;

      if (this.isPlaceholder) {
        this.children = Array.from(this.$element.content.childNodes);

        if (!this.children.length) {
          throw new GalaxyError('placeholder element with a conditional must have at least one child node')
        }
      }
    }

    _renderSingle () {
      const { isConnected } = this.$element;

      let transitionType;

      if (this.$getter()) {
        !isConnected && (transitionType = 'enter');
      } else if (isConnected) {
        transitionType = 'leave';
      }

      if (transitionType) {
        this._dispatchTransitionEvent(transitionType, this.$element, () => {
          const isLeave = transitionType === 'leave';
          this[isLeave ? '$element' : 'anchor'].replaceWith(this[isLeave ? 'anchor' : '$element']);
        });
      }
    }

    _firstRenderMultiple () {

      // Replace placeholder with its anchor
      this.$element.replaceWith(this.anchor);

      if (this.$getter()) {
        this._appendChildren();
      }

      this.render = this._renderMultiple;
    }

    _renderMultiple () {
      if (this.$getter()) {
        this._appendChildren();
      } else {
        for (const child of this.children) {
          if (child.isConnected) {
            this._dispatchTransitionEvent('leave', child, () => child.remove());
          }
        }
      }
    }

    _appendChildren () {
      let index = this.children.length;
      const { parentNode } = this.anchor;

      while (index--) {
        const child = this.children[index];

        if (!child.isConnected) {
          this._dispatchTransitionEvent('enter', child, () => {
            parentNode.insertBefore(child, this.anchor.nextSibling);
          });
        }
      }
    }

    _dispatchTransitionEvent (type, target, transitionCb) {
      dispatchTransitionEvent(this.$element, `if:${type}`, target, transitionCb);
    }
  }

  class EventDirective extends GalaxyDirective {
    static get is () {
      return '@<name>'
    }

    static get options () {
      return {
        $plain: true,
        $render: false
      }
    }

    init () {
      const { $args, $name, $element, $renderer } = this;
      const once = $args.includes('once');
      const evaluate = this.$compiler.compileEvent(this.$value);

      // Merged handlers
      let mainHandler;

      const handlers = [];

      let attachMethod = 'addEventListener';

      if ($args.includes('self')) {
        handlers.push((next, $event) => {
          if ($event.target === $event.currentTarget) {
            next($event);
          }
        });
      }

      if ($args.includes('prevent')) {
        handlers.push((next, $event) => {
          $event.preventDefault();
          next($event);
        });
      }

      if (isGalaxyElement($element)) {
        attachMethod = `$on${once ? 'ce' : ''}`;
      } else if (once) {
        handlers.push((next, $event) => {
          $element.removeEventListener($name, mainHandler);
          next($event);
        });
      }

      handlers.push((end, $event) => {
        evaluate(newIsolated($renderer.isolated, { $event }));
        end();
      });

      $element[attachMethod]($name, mainHandler = mergeEventHandlers(handlers));
    }
  }

  class PropertyDirective extends GalaxyDirective {
    static get is () {
      return '.<name>'
    }

    init () {
      this._inCustom = isGalaxyElement(this.$element);

      // Init with default value
      this.$element[this.$name] = null;
    }

    render () {
      this.$element[this.$name] = this.$getter();

      if (this._inCustom) {
        this.$element.$render();
      }
    }
  }

  class ReferenceDirective extends GalaxyDirective {
    static get is () {
      return 'ref'
    }

    init () {
      this.refName = camelize(this.$value);
    }

    render () {
      const { $scope, $element, refName } = this;

      if ($element.isConnected) {
        $scope.$refs[refName] = $element;
      } else {
        delete $scope.$refs[refName];
      }
    }
  }

  /**
   * Directive for bindings:
   *
   *   1. :attribute
   *   2. ::attribute (one time)
   */
  class BindingDirective extends GalaxyDirective {
    static get is () {
      return ':<name>'
    }

    _getObserved () {
      let observed = this.$element.getAttributeNode(this.$name);

      if (!config.debug) this.$element.removeAttribute(this.$name);

      if (!observed) {
        observed = document.createAttribute(this.$name);
        this.$element.setAttributeNode(observed);
      }

      return observed
    }

    init () {
      this.attribute = this._getObserved();
    }

    render () {
      const value = this.$getter();

      if (typeof value === 'boolean') {
        this.element[`${value ? 'set' : 'remove'}AttributeNode`](this.attribute);
      } else if (differ(this.attribute, value)) {
        this.attribute.value = value;
      }
    }
  }

  // TODO: Support single-class binding eg. :class.show="!hidden" and multiple :class.a.b="addBoth"

  class ClassDirective extends BindingDirective {
    static get is () {
      return ':class'
    }

    _getNormalized () {
      const value = this.$getter();

      if (!Array.isArray(value)) return value

      const normalized = {};

      value.forEach(item => {
        if (isObject(item)) {
          Object.assign(result, item);
        } else {
          result[item] = 1;
        }
      });

      return normalized
    }

    render () {
      const value = this._getNormalized();

      // Fallback to normal attribute patching
      if (!isObject(value)) return super.render()

      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          this.$element.classList[value[key] ? 'add' : 'remove'](key);
        }
      }
    }
  }

  const UNIT_SEPARATOR = '.';

  // TODO: Support single-styleb binding eg. :style.height.px="height", without unit :style.display="'block'"

  class StyleDirective extends BindingDirective {
    static get is () {
      return ':style'
    }

    static parseRule (rule) {
      const segments = rule.split(UNIT_SEPARATOR);

      return {
        prop: segments[0],
        unit: segments[1]
      }
    }

    init () {

      // Cached styles
      this.styles = {};
    }

    render () {
      const styles = this.$getter();

      // Fallback to normal styles patching
      if (!isObject(styles)) return super.render()

      const $styles = this.$element.attributeStyleMap;

      // Remove actual props
      for (const rule in this.styles) {
        if (!styles.hasOwnProperty(rule)) {
          $styles.delete(StyleDirective.parseRule(rule).prop);
        }
      }

      // Add/set props
      for (const rule in styles) {
        const value = styles[rule];

        if (this.styles[rule] !== value) {
          const { prop, unit } = StyleDirective.parseRule(rule);
          $styles[value ? 'set' : 'delete'](prop, unit ? CSS[unit](value) : value);
        }
      }

      this.styles = Object.assign({}, styles);
    }
  }

  class BindDirective extends GalaxyDirective {
    static get is () {
      return '*bind'
    }

    init () {
      this.setting = false;

      // Input -> State
      const setter = this.$compiler.compileSetter(this.$value);

      this.setter = value => setter(this.$renderer.isolated, value);

      if (this.onInput) {
        this.$element.addEventListener('input', this.onInput.bind(this));
      }

      if (this.onChange) {
        this.$element.addEventListener('change', this.onChange.bind(this));
      }
    }

    /**
     * Helper to set multiple values
     *
     * @param {boolean} active
     * @param {string} value
     * @param {Array<*>} values
     *
     * @return void
     */
    static setMultiple (active, value, values) {
      const index = values.indexOf(value);

      if (active) {
        index === -1 && values.push(value);
      } else if (index > -1) {
        values.splice(index, 1);
      }
    }

    setValue (value) {
      this.setting = true;
      this.setter(value);
    }

    render () {

      // Avoid re-dispatching render on updated values
      if (this.setting) {
        this.setting = false;
      } else {
        this.update(this.$element, this.$getter());
      }
    }
  }

  /**
   * Support for <input type="checkbox">
   */
  class CheckboxDirective extends BindDirective {
    static match (_, { element }) {
      return element.type === 'checkbox'
    }

    onChange ({ target }) {
      const values = this.$getter();

      if (!Array.isArray(values)) {
        return this.setValue(target.checked)
      }

      BindDirective.setMultiple(
        target.checked,
        target.value,
        values
      );
    }

    update (checkbox, value) {
      checkbox.checked = Boolean(value);
    }
  }

  /**
   * Support for <input type="radio">
   */
  class RadioDirective extends BindDirective {
    static match (_, { element }) {
      return element.type === 'radio'
    }

    onChange ({ target }) {
      if (target.checked) {
        this.setValue(target.value);
      }
    }

    update (radio, value) {
      radio.checked = String(value) === radio.value;
    }
  }

  /**
   * With support just for input types:
   *
   *   - Password
   *   - Text
   *   - Email
   *   - Search
   *   - URL
   *   - Number
   *
   * And <textarea>
   */
  class InputDirective extends BindDirective {
    static match (_, { element }) {
      return (
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement
      )
    }

    init () {
      super.init();

      this.valueKey = 'value';

      switch (this.$args[0]) {
        case 'number': this.valueKey += 'AsNumber'; break
        case 'date': this.valueKey += 'AsDate'; break
      }
    }

    // Change state (Input -> State)
    onInput ({ target }) {
      this.setValue(target[this.valueKey]);
    }

    update (input, value) {
      if (input[this.valueKey] !== value) {
        input[this.valueKey] = value;
      }
    }
  }

  /**
   * Support for single and multiple <select>
   */
  class SelectDirective extends BindDirective {
    static match (_, { element }) {
      return element instanceof HTMLSelectElement
    }

    // TODO: There are some rendering quirks, fix that!

    onChange ({ target }) {
      const { options, multiple } = target;

      if (!multiple) {
        for (const { value, selected } of options) {

          // In non-multiple select we need to set
          // the raw value since there's no reference
          if (selected) return this.setValue(value)
        }
      } else {
        const values = this.$getter();

        if (!Array.isArray(values)) {
          throw new GalaxyError(
            'Invalid bound value. ' +
            '*bind directive on select elements with a `multiple` attribute must have an array bound value.'
          )
        }

        for (const option of options) {
          BindDirective.setMultiple(
            option.selected,
            option.value,
            values
          );
        }
      }
    }

    update (select, value) {
      for (const option of select.options) {
        option.selected = select.multiple
          ? value.indexOf(option.value) > -1
          : value === option.value;
      }
    }
  }

  class GalaxyPlugin {

    /**
     * User's options
     *
     * @type {Object}
     */
    static $options = {}

    /**
     * Default options
     *
     * @type {Object}
     */
    static $defaults = {}

    /**
     * Hook for plugin initialization
     *
     * @type {Function}
     * @noop
     */
    static init (config) {
      // TODO: Initialize plugin
    }

    /**
     * Perform installation process
     *
     * @type {Function}
     * @noop
     */
    static install (GalaxyElement) {
      // TODO: Install process here
    }

    /**
     * Set options for plugin installation
     *
     * @param {Object} options
     *
     * @return {GalaxyPlugin}
     */
    static with (options) {
      Object.assign(this.$options, this.$defaults, options);

      return this
    }
  }

  /**
   * Utility for cache plugin instance on initialization
   *
   * @param {*} GalaxyPlugin
   *
   * @return void
   */
  function withCachedInstance (GalaxyPlugin) {
    const initiliaze = GalaxyPlugin.init;

    GalaxyPlugin.init = function (config) {
      this.$instance = new GalaxyPlugin(this.$options);
      initiliaze.call(this, config);
    };

    return GalaxyPlugin
  }

  const GalaxyElement = extend(HTMLElement);

  /**
   * Generates a new template
   *
   * @param {*...} args
   *
   * @return {HTMLTemplateElement}
   */
  function html (...args) {
    return template('template', ...args)
  }

  /**
   * Generates a new style template
   *
   * @param {*...} args
   *
   * @return {HTMLStyleElement}
   */
  function css (...args) {
    const style = template('style', ...args);

    // Avoid construction phase
    style.setAttribute('skip', '');

    return style
  }

  /**
   * Initialize galaxy
   *
   * @param {Object} options
   *
   * @return void
   */
  function setup (options) {

    // Merge rest options with default configuration
    Object.assign(config, options);

    if (config.plugins) {
      for (const GalaxyPlugin of config.plugins) {

        // Perform plugin initialization
        GalaxyPlugin.init(config);
      }
    }

    // Add core directives
    config.directives.unshift(...[
      ConditionalDirective,
      EventDirective,
      PropertyDirective,
      ReferenceDirective,

      // Bindings
      ClassDirective,
      StyleDirective,
      BindingDirective,

      // Model
      CheckboxDirective,
      RadioDirective,
      InputDirective,
      SelectDirective
    ]);

    // Compile matchers
    for (const Directive of config.directives) {
      Directive._matcher = compileMatcher(Directive.is);
    }

    if (!config.root) {
      throw new GalaxyError('You must include a `root` option')
    }

    // Register root element + additional elements
    resolveElements([config.root, ...config.elements], config.plugins);
  }

  /**
   * Generates a new html element
   *
   * @param {string} tag
   * @param {*...} args
   *
   * @return {HTMLElement}
   * @private
   */
  function template (tag, ...args) {
    const element = document.createElement(tag);

    element.innerHTML = String.raw(...args);

    return element
  }

  /**
   * Register GalaxyElements recursively.
   * Also perform plugin installation
   *
   * @param {Array<GalaxyElement>} elements
   * @param {Array<GalaxyPlugin>} plugins
   *
   * @return void
   * @private
   */
  function resolveElements (elements, plugins) {
    const definitions = [];

    for (const GalaxyElement of elements) {

      // Skip resolved elements
      if (GalaxyElement.resolved) continue

      const elementOptions = {};
      const name = GalaxyElement.is;

      if (!name) {
        throw new GalaxyError('Unknown element tag name')
      }

      if (GalaxyElement.extendsBuiltIn && !(elementOptions.extends = GalaxyElement.extends)) {
        throw new GalaxyError('Extended customized built-in elements must have an `extends` property')
      }

      try {
        definitions.push(customElements.whenDefined(name));

        // Install plugins before resolving
        installPlugins(GalaxyElement, plugins);

        Promise
          // Resolve inner elements before resolve the wrapper element
          .all(resolveElements(GalaxyElement.children, plugins))
          .then(() => { customElements.define(name, GalaxyElement, elementOptions); });

        // Mark element as resolved
        GalaxyElement.resolved = true;
      } catch (e) {
        throw galaxyError(e)
      }
    }

    return definitions
  }

  /**
   * Perform plugins installation
   *
   * @param {GalaxyElement} GalaxyElement
   * @param {Array<GalaxyPlugin>} plugins
   *
   * @return void
   */
  function installPlugins (GalaxyElement, plugins) {
    for (const GalaxyPlugin of plugins) {
      GalaxyPlugin.install(GalaxyElement);
    }
  }

  exports.config = config;
  exports.extend = extend;
  exports.GalaxyElement = GalaxyElement;
  exports.html = html;
  exports.css = css;
  exports.setup = setup;
  exports.GalaxyDirective = GalaxyDirective;
  exports.GalaxyPlugin = GalaxyPlugin;
  exports.withCachedInstance = withCachedInstance;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
