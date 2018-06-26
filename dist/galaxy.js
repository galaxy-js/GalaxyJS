import nextTick from 'https://cdn.jsdelivr.net/gh/LosMaquios/next-tick@v0.1.0/index.js';
import ProxyObserver from 'https://cdn.jsdelivr.net/gh/LosMaquios/ProxyObserver@v0.3.3/index.js';

var config = {

  /**
   * Debug mode
   *
   * @type {boolean}
   */
  debug: true,

  /**
   * Filters holder
   *
   * @enum {Function}
   */
  filters: {},

  /**
   * Elements holder
   *
   * @type {Array.<GalaxyElement>}
   */
  elements: []
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

function isGalaxyElement ({ constructor }) {
  return config.elements.indexOf(constructor) > -1
}

const same = value => value;

const HYPHEN_REGEX = /-([a-z0-9])/gi;
const CAMEL_REGEX = /(?<=[a-z0-9])([A-Z])/g;

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

const createAnchor = config.debug
  ? content => new Comment(` ${content} `)
  : () => new Text(); // Empty text node

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

function getName (GalaxyElement) {
  return GalaxyElement.is || GalaxyElement.name && hyphenate(GalaxyElement.name)
}

function callHook (ce, hook, ...args) {
  hook = ce[
    // Capitalize given hook name
    `on${hook.charAt(0).toUpperCase() + hook.slice(1)}`
  ];

  if (isFunction(hook)) {
    nextTick.afterFlush(() => {
      hook.call(ce, ...args);
    });
  }
}

function ensureListeners (events, event) {
  return events[event] || []
}

/**
 * Exposed internally as Globals within the scope
 */
var global = {

  /**
   * Apply filter descriptors to the given `value`
   *
   * @param {*} value
   * @param {Array<Object>} filters
   *
   * @return {*}
   */
  _$f (value, filters) {
    return filters.reduce((result, filter) => {
      const applier = config.filters[filter.name];

      return filter.args
        ? applier(result, ...filter.args)
        : applier(result)
    }, value)
  },

  /**
   * Normalize given template value
   *
   * @param {*} value
   *
   * @return {string}
   */
  _$n (value) {
    return isDefined(value) ? value : ''
  }
}

/**
 * For event call rewriting
 *
 * @type {RegExp}
 */
const METHOD_REGEX = /#(?<name>\w+)\(/g;

/**
 * Rewrite a given `expression` by intercepting
 * functions calls passing the `state` as first argument
 *
 * @param {string} expression - JavaScript expression to be rewritten
 *
 * @return {string}
 */
function rewriteMethods (expression) {
  let match;
  let rewrited = expression;

  while (match = METHOD_REGEX.exec(expression)) {
    const { index, groups } = match;

    const start = index + match[0].length;

    // Initial depth `(` = 1
    let depth = 1;
    let cursor = start;
    let inDouble = false;
    let inSingle = false;

    // Catch arguments
    loop: while (depth) {
      const inExpression = !inDouble && !inSingle;

      // TODO: Check edge cases like 'literal template expressions'

      switch (expression.charCodeAt(cursor++)) {
        case 0x28/* ( */: inExpression && ++depth; break
        case 0x29/* ) */: inExpression && --depth; break
        case 0x22/* " */: !inSingle && (inDouble = !inDouble); break
        case 0x27/* ' */: !inDouble && (inSingle = !inSingle); break
        case NaN: break loop
      }
    }

    // Get arguments
    const args = expression.slice(start, cursor - 1 /* skip parenthesis */);

    rewrited = rewrited.replace(
      expression.slice(index, cursor),

      // Intercept method call with $commit
      `$commit('${groups.name}'${args ? `, ${args}` : ''})`
    );
  }

  return rewrited
}

/**
 * Match text template interpolation
 *
 * @type {RegExp}
 */
const TEXT_TEMPLATE_REGEX = /{{(?<expression>.*?)}}/;

/**
 * Match filters to split within a template interpolation
 *
 * @type {RegExp}
 */
const FILTER_SPLIT_REGEX = /(?<!\|)\|(?!\|)/;

/**
 * @type {RegExp}
 */
const FILTER_REGEX = /^(?<name>\w+)(?:\((?<args>.*)\))?$/;

// TODO: Check for invalid expressions like {{{ html }}}

/**
 * Get an inlined JavaScript expression
 *
 * @param {string} template - String with interpolation tags
 *
 * @return {string}
 */
function getExpression (template) {
  let match;

  // Hold inlined expressions
  const expressions = [];

  while (match = TEXT_TEMPLATE_REGEX.exec(template)) {
    const rawLeft = template.slice(0, match.index);
    let expression = match.groups.expression.trim();

    // Push wrapped left context
    if (rawLeft) expressions.push(`\`${rawLeft}\``);

    // Push isolated expression itself
    if (expression) {
      const parts = expression.split(FILTER_SPLIT_REGEX);

      expressions.push(
        `_$n(${
          parts.length > 1
            ? `_$f(${parts[0]}, [${getDescriptors(parts.slice(1)).join()}])`
            : expression
        })`
      );
    }

    template = template.slice(match.index + match[0].length);
  }

  // Push residual template expression
  if (template) expressions.push(`\`${template}\``);

  return expressions.join(' + ')
}

/**
 * Get filter descriptors
 *
 * @param {Array.<string>} filters
 *
 * @return {Array.<string>}
 */
function getDescriptors (filters) {
  return filters.map(filter => {
    const { groups } = FILTER_REGEX.exec(filter.trim());

    // Compose filter applier
    return `{
      name: '${groups.name}',
      args: ${groups.args ? `[${groups.args}]` : 'null'}
    }`
  })
}

/**
 * Cache evaluators
 *
 * @type {Map<string, Function>}
 * @private
 */
const __evaluators__ = new Map();

/**
 * Compile an scoped getter with given `expression`
 *
 * @param {string} expression - JavaScript expression
 *
 * @return {Function}
 */
function compileScopedGetter (expression) {
  return compileScopedEvaluator(`return ${expression}`)
}

/**
 * Compile an scoped setter with given `expression`
 *
 * @param {string} expression - JavaScript expression
 *
 * @return {Function}
 */
function compileScopedSetter (expression) {
  return compileScopedEvaluator(`(${expression} = __args__[0])`)
}

/**
 * Compile a scoped evaluator function
 *
 * @param {string} body - Function body
 *
 * @return {Function}
 */
function compileScopedEvaluator (body) {
  let evaluator = __evaluators__.get(body);

  if (!evaluator) {

    /**
     * Allow directly access to:
     *
     *   1. `scope`: Custom element instance itself
     *   2. `scope.state`: State taken from custom element
     *   3. `isolated`: Isolated scope internally used by loop directive
     *
     * In that order, `isolated` overrides `scope.state` data,
     * and `scope` is going to be overriden by `scope.state` data.
     */
    evaluator = new Function(
      '__global__', '__scope__', '__locals__', '...__args__',
      `with (__global__) {
        with (__scope__) {
          with (state) {
            with (__locals__) {
              ${body}
            }
          }
        }
      }`
    );

    // Cache evaluator with body as key
    __evaluators__.set(body, evaluator);
  }

  return (scope, locals, ...args) => {
    return evaluator(global, scope, locals, ...args)
  }
}

class BaseRenderer {
  constructor (target, context, expression) {
    this.target = target;
    this.context = context;
    this.expression = expression;

    const getter = compileScopedGetter(expression);

    this.getter = (locals = context.isolated) => {
      return getter(context.scope, locals)
    };
  }

  get value () {
    return this.getter()
  }

  render () {
    this.patch(
      this.target,
      this.value
    );
  }
}

/**
 * Renderer for inline tag template binding:
 *
 *   1. Within text node: <h1>Hello {{ world }}</h1>
 *   2. As attribute interpolation: <input class="some-class {{ klass }}"/>
 */
class TemplateRenderer extends BaseRenderer {
  constructor (node, context) {
    super(
      node, context,
      getExpression(node.nodeValue)
    );
  }

  static is ({ nodeValue }) {
    return TEXT_TEMPLATE_REGEX.test(nodeValue)
  }

  patch (node, value) {
    // Normalized value to avoid null or undefined
    const normalized = isDefined(value) ? String(value) : '';

    if (differ(node, normalized)) {
      node.nodeValue = normalized;
    }
  }
}

const CONDITIONAL_DIRECTIVE = '*if';

class ConditionalRenderer extends BaseRenderer {
  constructor (element, context) {
    super(
      element, context,
      getAttr(element, CONDITIONAL_DIRECTIVE)
    );

    this.anchor = createAnchor(`if: ${this.condition}`);
  }

  static is ({ attributes }) {
    return CONDITIONAL_DIRECTIVE in attributes
  }

  patch (value) {
    if (value) {
      if (!this.element.isConnected) {
        this.anchor.parentNode.replaceChild(this.element, this.anchor);
      }
    } else if (this.element.isConnected) {
      this.element.parentNode.replaceChild(this.anchor, this.element);
    }
  }
}

const BIND_DIRECTIVE = '*bind';

class BindRenderer extends BaseRenderer {
  constructor (target, context) {
    super(
      target, context,
      getAttr(target, BIND_DIRECTIVE)
    );

    this.setting = false;

    // Input -> State
    const setter = compileScopedSetter(this.expression);

    this.setter = value => {
      setter(
        // (scope, locals
        context.scope, context.isolated,

        // ...args[0])
        value
      );
    };

    if (this.onInput) {
      target.addEventListener('input', this.onInput.bind(this));
    }

    if (this.onChange) {
      target.addEventListener('change', this.onChange.bind(this));
    }
  }

  static is ({ attributes }) {
    return BIND_DIRECTIVE in attributes
  }

  setValue (value) {
    this.setting = true;
    this.setter(value);
  }

  patch (target, value) {
    // Avoid re-dispatching render on updated values
    if (this.setting) {
      this.setting = false;
    } else {
      this.update(target, value);
    }
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
class InputRenderer extends BindRenderer {
  constructor (input, context) {
    super(input, context);

    this.conversor = input.type === 'number' ? Number : String;
  }

  static is (element) {
    return (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    )
  }

  // Change state (Input -> State)
  onInput ({ target }) {
    this.setValue(this.conversor(target.value));
  }

  update (input, value) {
    value = String(value);

    if (differ(input, value)) {
      input.value = value;
    }
  }
}

/**
 * Support for <input type="checkbox">
 */
class CheckboxRenderer extends BindRenderer {
  static is ({ type }) {
    return type === 'checkbox'
  }

  onChange ({ target }) {
    this.setValue(target.checked);
  }

  update (checkbox, value) {
    checkbox.checked = Boolean(value);
  }
}

/**
 * Support for <input type="radio">
 */
class RadioRenderer extends BindRenderer {
  static is ({ type }) {
    return type === 'radio'
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
 * Support for single and multiple <select>
 */
class SelectRenderer extends BindRenderer {
  static is (element) {
    return element instanceof HTMLSelectElement
  }

  onChange ({ target }) {
    let values;
    const multiple = this.target.multiple;

    if (multiple) {
      values = this.value;

      if (!Array.isArray(values)) {
        throw new GalaxyError(
          'Invalid bound value. ' +
          '*bind directive on select elements with the multiple attribute must have an array bound value.'
        )
      }
    }

    for (const { value, selected } of target.options) {
      if (selected) {
        if (!multiple) {

          // In non-multiple select we need to set
          // the raw value since there's no reference
          return this.setValue(value)
        } else if (!values.includes(value)) {
          values.push(value);
        }
      } else if (multiple) {
        const index = values.indexOf(value);

        if (index > -1) {
          values.splice(index, 1);
        }
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

const BIND_TOKEN = ':';
const BIND_ONE_TIME_TOKEN = BIND_TOKEN.repeat(2);

/**
 * Renderer for bindings:
 *
 *   1. :attribute
 *   2. ::attribute (one time)
 */
class BindingRenderer extends BaseRenderer {
  constructor (attribute, context) {
    let oneTime = attribute.name.startsWith(BIND_ONE_TIME_TOKEN);

    super(
      BindingRenderer.getObserved(attribute, oneTime),

      context, attribute.value
    );

    /**
     * Specific binding attributes
     */
    this.oneTime = oneTime;
    this.owner = this.target.ownerElement;
    this.name = this.target.name;

    if (oneTime) {
      const patch = this.patch;

      this.patch = value => {
        const { bindings } = context;

        patch.call(this, value);

        // Schedule remove to queue end
        nextTick(() => {
          bindings.splice(bindings.indexOf(this), 1);
        });
      };
    }
  }

  static is ({ name }) {
    return name.startsWith(BIND_TOKEN)
  }

  static getObserved (attribute, oneTime) {
    const { name } = attribute;
    const { attributes } = attribute.ownerElement;

    const normalizedName = name.slice(oneTime ? 2 : 1);

    let observed = attributes.getNamedItem(normalizedName);

    if (!config.debug) attributes.removeNamedItem(name);

    if (!observed) {
      observed = document.createAttribute(normalizedName);
      attributes.setNamedItem(observed);
    }

    return observed
  }

  patch (attribute, value) {
    if (differ(attribute, value)) {
      attribute.value = value;
    }
  }
}

const CLASS_REGEX = /^:{1,2}class$/;

class ClassRenderer extends BindingRenderer {
  static is ({ name }) {
    return CLASS_REGEX.test(name)
  }

  static getNormalized (value) {
    if (!Array.isArray(value)) return value

    const result = {};

    value.forEach(item => {
      if (isObject(item)) {
        Object.assign(result, item);
      } else {
        result[item] = 1;
      }
    });

    return result
  }

  patch (attribute, value) {
    value = ClassRenderer.getNormalized(value);

    // Fallback to normal attribute patching
    if (!isObject(value)) return super.patch(attribute, value)

    const { classList } = this.owner;

    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        classList[value[key] ? 'add' : 'remove'](key);
      }
    }
  }
}

const STYLE_REGEX = /^:{1,2}style$/;
const UNIT_SEPARATOR = '.';

class StyleRenderer extends BindingRenderer {
  constructor (...args) {
    super(...args);

    this.styles = {};
  }

  static is ({ name }) {
    return STYLE_REGEX.test(name)
  }

  static parseRule (rule) {
    const segments = rule.split(UNIT_SEPARATOR);

    return {
      prop: segments[0],
      unit: segments[1]
    }
  }

  patch (style, styles) {
    // Fallback to normal styles patching
    if (!isObject(styles)) return super.patch(style, styles)

    const $styles = this.owner.attributeStyleMap;

    // Remove actual props
    for (const rule in this.styles) {
      if (!styles.hasOwnProperty(rule)) {
        $styles.delete(StyleRenderer.parseRule(rule).prop);
      }
    }

    // Add/set props
    for (const rule in styles) {
      const value = styles[rule];

      if (this.styles[rule] !== value) {
        const { prop, unit } = StyleRenderer.parseRule(rule);
        $styles.set(prop, unit ? CSS[unit](value) : value);
      }
    }

    this.styles = Object.assign({}, styles);
  }
}

const EVENT_TOKEN = '@';
const EVENT_MODIFIER_TOKEN = '.';

function isEvent ({ name }) {
  return name.startsWith(EVENT_TOKEN)
}

function event ({ name }, { element, scope, isolated }) {
  const expression = getAttr(element, name);
  const evaluator = compileScopedEvaluator(rewriteMethods(expression));

  const parsed = parseEvent(name);
  const { modifiers } = parsed;

  let attachMethod = 'addEventListener';

  let actual;
  let handler = event => {
    // Externalize event
    scope.$event = event;

    evaluator(scope, isolated);

    scope.$event = null;
  };

  if (modifiers.self) {
    actual = handler;
    handler = event => {
      if (event.target === event.currentTarget) {
        actual(event);
      }
    };
  }

  if (modifiers.prevent) {
    actual = handler;
    handler = event => {
      event.preventDefault();
      actual(event);
    };
  }

  if (isGalaxyElement(element)) {
    attachMethod = `$on${modifiers.once ? 'ce' : ''}`;
  } else if (modifiers.once) {
    actual = handler;
    handler = event => {
      element.removeEventListener(parsed.name, handler);
      actual(event);
    };
  }

  element[attachMethod](parsed.name, handler);
}

function parseEvent (name) {
  const modifiers = {};
  const segments = name.split(EVENT_MODIFIER_TOKEN);

  // Setup modifiers
  if (segments.length > 1) {
    for (let i = 1; i < segments.length; i++) {
      modifiers[segments[i]] = true;
    }
  }

  return {
    name: segments[0].slice(1)/* Skip @ */,
    modifiers
  }
}

/**
 * Directives
 */

const REFERENCE_ATTRIBUTE = 'ref';

/**
 * Taken from MDN
 *
 * @see https://developer.mozilla.org/en-US/docs/Glossary/Empty_element
 */
const VOID_TAGS = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
];

/**
 * Renderer for void elements or elements without childs like:
 *
 *  - area
 *  - base
 *  - br
 *  - col
 *  - embed
 *  - hr
 *  - img
 *  - input
 *  - link
 *  - meta
 *  - param
 *  - source
 *  - track
 *  - wbr
 */
class VoidRenderer {
  constructor (element, scope, isolated) {
    this.element = element;
    this.scope = scope;

    /**
     * Loop elements need an isolated scope
     *
     * Note: We need to create a shallow copy
     * to avoid overrides a parent isolated scope
     */
    this.isolated = isolated;

    /**
     * Hold directives to digest
     */
    this.directives = [];

    /**
     * Hold attribute and template bindings to digest
     */
    this.bindings = [];

    this._initDirectives(element);
    this._initBindings(element);
  }

  static is ({ tagName }) {
    return VOID_TAGS.indexOf(tagName.toLowerCase()) > -1
  }

  get isRenderable () {
    return (
      this.directives.length > 0 ||
      this.bindings.length > 0 ||

      /**
       * Elements needs to be resolved included ones
       * which are only referenced
       */
      this.element.hasAttribute(REFERENCE_ATTRIBUTE)
    )
  }

  _initDirectives ($el) {
    if (ConditionalRenderer.is($el)) {
      this.directives.push(new ConditionalRenderer($el, this));
    }

    if (BindRenderer.is($el)) {
      const Renderer = CheckboxRenderer.is($el) ? CheckboxRenderer
        : RadioRenderer.is($el) ? RadioRenderer
        : InputRenderer.is($el) ? InputRenderer
        : SelectRenderer.is($el) ? SelectRenderer
        : null;

      if (Renderer) {
        this.directives.push(new Renderer($el, this));
      }
    }
  }

  _initBindings ($el) {
    // Avoid live list
    const attributes = Array.from($el.attributes);

    for (const attribute of attributes) {
      // 1. Check @binding
      if (isEvent(attribute)) {
        event(attribute, this);

      // 2. Check {{ binding }}
      } else if (TemplateRenderer.is(attribute)) {
        this.bindings.push(new TemplateRenderer(attribute, this));

      // 3. Check :attribute or ::attribute
      } else if (BindingRenderer.is(attribute)) {
        const binding = new (
          ClassRenderer.is(attribute)
            ? ClassRenderer
            : StyleRenderer.is(attribute)
              ? StyleRenderer
              : BindingRenderer)(attribute, this);

        // Enable quick access
        this.bindings[binding.name] = binding;

        this.bindings.push(binding);
      }
    }
  }

  render () {
    const $el = this.element;

    for (const directive of this.directives) {
      directive.render();
    }

    // Don't perform updates on disconnected element
    if ($el.isConnected) {
      for (const binding of this.bindings) {
        binding.render();
      }

      /**
       * ref: It's a special directive/attribute which holds
       * native elements instantiation within the scope
       */
      const ref = $el.getAttribute(REFERENCE_ATTRIBUTE);

      // We need to resolve the reference first
      // since possible childs may need access to
      if (ref) {

        // Reference attribute isn't removed
        this.scope.$refs.set(ref, $el);
      }
    }
  }
}

class ElementRenderer extends VoidRenderer {
  constructor (element, scope, isolated) {
    super(element, scope, newIsolated(isolated));

    /**
     * Resolve children rendering
     */
    this.childrenRenderer = new ChildrenRenderer(element.childNodes, scope, this.isolated);
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
      !this.directives.length &&
      !this.bindings.length
    )
  }

  render () {
    // Render directives/bindings
    super.render();

    // Don't perform updates on disconnected element
    if (this.element.isConnected) {

      // Render children
      this.childrenRenderer.render();
    }
  }
}

const PROP_TOKEN = '.';

/**
 * Renderer for custom elements (resolve props)
 */
class CustomRenderer extends ElementRenderer {
  constructor (ce, scope, isolated) {
    super(ce, scope, isolated);

    // Set parent communication
    ce.$parent = scope;

    // Set children communication
    scope.$children[camelize(getName(ce.constructor))] = ce;

    this._resolveProps();
  }

  static is (element) {
    return isGalaxyElement(element)
  }

  _resolveProps () {
    const { props, attributes } = this.element;

    for (const { name, value } of Array.from(attributes)) {
      if (name.startsWith(PROP_TOKEN)) {

        // Normalize prop name
        const prop = camelize(name.slice(1));

        if (props.hasOwnProperty(prop)) {

          // Get raw value (with references)
          const getter = compileScopedGetter(value);

          // Immutable property
          Object.defineProperty(props, prop, {
            enumerable: true,
            get: () => {
              return getter(this.scope, this.isolated)
            }
          });
        }

        // TODO: Warn unknown prop

        if (!config.debug) {

          // Don't reflect prop value
          this.element.removeAttribute(name);
        }
      }
    }
  }

  render () {
    // Resolve element bindings
    super.render();

    if (this.element.isConnected) {

      // Re-render (digest props)
      this.element.$render();
    }
  }
}

class ItemRenderer {
  constructor (template, context, isolated) {
    const Renderer = ItemRenderer.getRenderer(template);

    this.renderer = new Renderer(
      template.cloneNode(true),
      context.scope,
      newIsolated(context.isolated, isolated)
    );

    this.reused = false;
  }

  static getRenderer (template) {
    return isGalaxyElement(template)
      ? CustomRenderer
      : ElementRenderer
  }

  get key () {
    return this.renderer.bindings.by
  }

  get next () {
    return this.renderer.element.nextSibling
  }

  by (isolated) {
    return this.key.getter(isolated)
  }

  update (isolated) {
    this.reused = true;

    Object.assign(this.renderer.isolated, isolated);
  }

  insert (item) {
    item.parentNode.insertBefore(this.renderer.element, item);
  }

  remove () {
    this.renderer.element.remove();
  }

  render () {
    this.renderer.render();
  }
}

// Note: to maintain consistence avoid `of` reserved word on iterators.

// TODO: Add anchor delimiters

const LOOP_DIRECTIVE = '*for';

/**
 * Captures:
 *
 *  1. Simple
 *
 *   [item] in [expression]
 *   ([item]) in [expression]
 *
 *  2. With key
 *
 *   [item], [key] in [expression]
 *   [item], [key], [index] in [expression]
 *
 *  3. With index
 *
 *   ([item], [key]) in [expression]
 *   ([item], [key], [index]) in [expression]
 */
const LOOP_REGEX = /^\(?(?<value>\w+)(?:\s*,\s*(?<key>\w+)(?:\s*,\s*(?<index>\w+))?)?\)?\s+in\s+(?<expression>.+)$/;

class LoopRenderer extends BaseRenderer {
  constructor (template, context) {
    const expression = getAttr(template, LOOP_DIRECTIVE);
    const { groups } = expression.match(LOOP_REGEX);

    super(template, context, groups.expression);

    this.items = [];
    this.values = new Map();

    this.keyName = groups.key;
    this.indexName = groups.index;
    this.valueName = groups.value;

    this.startAnchor = createAnchor(`start for: ${groups.expression}`);
    this.endAnchor = createAnchor(`end for: ${groups.expression}`);

    const parent = template.parentNode;

    // Remove `template` since is just a template
    parent.replaceChild(this.startAnchor, template);
    parent.insertBefore(this.endAnchor, this.startAnchor.nextSibling);

    if (!template.hasAttribute(':by')) {
      if (config.debug) {
        console.warn(
          'The element with the loop expression `' + expression + '` ' +
          'doesn\'t have a `by` binding, defaulting to `$index` tracking.'
        );
      }

      template.setAttribute(':by', '$index');
    }
  }

  static is ({ attributes }) {
    return LOOP_DIRECTIVE in attributes
  }

  patch (template, collection) {
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
        item = new ItemRenderer(template, this.context, isolated);

        // Insert before end anchor
        item.insert(this.endAnchor);

        this.values.set(item.key.value, item);
      } else {
        const newKey = item.by(isolated);

        if ((item.key.value /* oldKey */) !== newKey) {
          const newItem = this.values.get(newKey);
          const from = newItem.next;

          // Swap elements
          newItem.insert(item.next);
          item.insert(from);

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
    this._initChildren();
  }

  _initChildren () {
    for (const child of this.children) {

      // 1. Check {{ interpolation }}
      if (isTextNode(child) && TemplateRenderer.is(child)) {
        this.renderers.push(new TemplateRenderer(child, this));

      // 2. Element binding
      } else if (isElementNode(child)) {

        // The loop directive is resolved as a child
        if (LoopRenderer.is(child)) {
          this.renderers.push(new LoopRenderer(child, this));
        } else if (CustomRenderer.is(child))  {
          this.renderers.push(new CustomRenderer(child, this.scope, this.isolated));
        } else {
          const element = new (
            VoidRenderer.is(child)
              ? VoidRenderer
              : ElementRenderer)(child, this.scope, this.isolated);

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
 * Internal
 */
const __proxies__ = new WeakMap();
const __observers__ = new WeakMap();

class GalaxyElement extends HTMLElement {
  constructor () {
    super();

    /**
     * State for data-binding
     *
     * @type {Object.<*>}
     * @public
     */
    this.state = {}; // This already call initial render

    /**
     * Hold component properties
     *
     * @type {Object.<*>}
     * @public
     */
    this.props = this.constructor.properties; // TODO: How to properly define properties?

    /**
     * Actual DOM event being dispatched
     *
     * @type {Event}
     * @public
     */
    this.$event = null;

    /**
     * Attached events
     *
     * @type {Object.<Array>}
     * @public
     */
    this.$events = Object.create(null);

    /**
     * Give directly access to the parent galaxy element
     *
     * @type {GalaxyElement}
     * @public
     */
    this.$parent = null;

    /**
     * Give access to children galaxy elements
     *
     * @type {Object.<GalaxyElement>}
     * @public
     */
    this.$children = {};

    /**
     * Hold element references
     *
     * @type {Map<string, HTMLElement>}
     * @public
     */
    this.$refs = new Map();

    const shadow = this.attachShadow({ mode: 'open' });

    // We need to append content before setting up the main renderer
    shadow.appendChild(this.constructor.template.content.cloneNode(true));

    /**
     * Main renderer called for rendering
     *
     * @type {ChildrenRenderer}
     * @public
     */
    this.$renderer = new ChildrenRenderer(shadow.childNodes, this, {});

    /**
     * Determines whether we are in a rendering phase
     *
     * @type {boolean}
     * @public
     */
    this.$rendering = false;

    // Call element initialization
    callHook(this, 'created');
  }

  get state () {
    // Return proxified state
    return __proxies__.get(this)
  }

  set state (state) {
    const render = () => { this.$render(); };

    // Setup proxy to perform render on changes
    const proxy = ProxyObserver.observe(state, {}, render);

    // Setup indexes
    __proxies__.set(this, proxy);
    __observers__.set(this, ProxyObserver.get(proxy));

    // State change, so render...
    render();
  }

  /**
   * Gets actual observer
   *
   * Warning: When the state changes also the observer changes
   */
  get $observer () {
    return __observers__.get(this)
  }

  /**
   * Lifecycle hooks
   *
   * Hooks that catch changes properly
   */
  connectedCallback () {
    callHook(this, 'attached');
  }

  disconnectedCallback () {
    callHook(this, 'detached');
  }

  attributeChangedCallback (name, old, value) {
    callHook(this, 'attribute', { name, old, value });
  }

  /**
   * Watch a given `path` from the state
   *
   * @param {string} path
   * @param {Function} watcher
   *
   * @return {Function}
   */
  $watch (path, watcher) {
    let $observer;
    let dispatch;

    let { state } = this;
    const keys = path.split('.');

    keys.forEach((key, index) => {
      if (index !== keys.length - 1) {
        state = state[key];

        if (!state) throw new GalaxyError(`Wrong path at segment: '.${key}'`)
      } else {
        $observer = ProxyObserver.get(state);

        if (key === '*') {
          dispatch = change => {
            watcher(
              change.value, change.old,

              // We need to pass extra properties
              // for deep observing.
              change.property, change.target
            );
          };
        } else {
          dispatch = change => {
            if (change.property === key) {
              watcher(change.value, change.old);
            }
          };
        }
      }
    });

    if ($observer && dispatch) {
      $observer.subscribe(dispatch);

      return () => {
        $observer.unsubscribe(dispatch);
      }
    }
  }

  /**
   * Events
   *
   * Custom and native events API
   */
  $on (event, listener, useCapture) {
    (this.$events[event] = ensureListeners(this.$events, event)).push(listener);

    this.addEventListener(event, listener, useCapture);
  }

  $once (event, listener, useCapture) {

    // Once called wrapper
    const onceCalled = $event => {
      this.$off(event, onceCalled);
      listener($event);
    };

    // Reference to original listener
    onceCalled.listener = listener;

    this.$on(event, onceCalled, useCapture);
  }

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
        const alive = ensureListeners(this.$events, event).filter(_ => _ !== listener);

        if (alive.length) {
          this.$events[event] = alive;
        } else {
          delete this.$events[event];
        }

        this.removeEventListener(event, listener);
      }
    }
  }

  $emit (event, detail) {
    this.dispatchEvent(
      event instanceof Event
        ? event
        : new CustomEvent(event, { detail })
    );
  }

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
  }

  /**
   * Reflect state changes to the DOM
   *
   * @return void
   */
  $render () {
    if (!this.$rendering) {
      this.$rendering = true;

      nextTick(() => {

        // Takes render error
        let renderError;

        // References are cleared before each render phase
        // then they going to be filled up
        this.$refs.clear();

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

function html (...args) {
  const template = document.createElement('template');

  template.innerHTML = String.raw(...args);

  return template
}

function setup (options) {

  // Merge rest options with default configuration
  Object.assign(config, options);

  // Register element classes
  for (const GalaxyElement of options.elements) {
    const name = getName(GalaxyElement);

    if (!name) {
      throw new GalaxyError('Unknown element tag name')
    }

    try {
      customElements.define(name, GalaxyElement);
    } catch (e) {
      throw galaxyError(e)
    }
  }
}

export { config, html, setup, GalaxyElement };
