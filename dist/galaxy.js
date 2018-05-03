import nextTick from 'https://cdn.jsdelivr.net/gh/LosMaquios/next-tick@v0.1.0/index.js';
import ProxyObserver from 'https://cdn.jsdelivr.net/gh/LosMaquios/ProxyObserver@v0.3.2/index.js';

var config = {
  debug: true
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

const same = value => value;

const HYPEN_REGEX = /-([a-z][0-9])/gi;

/**
 * Converts hypenated string to camelized
 *
 * @param {string} hypenated
 *
 * @return {string}
 */
function camelize (hypenated) {
  return hypenated.replace(HYPEN_REGEX, (_, letter) => letter.toUpperCase())
}

function digestData (element, name, conversor = same) {
  const value = conversor(element.getAttribute(name));

  if (!config.debug) element.removeAttribute(name);

  return value
}

function toString (value) {
  return isObject(value) ? JSON.stringify(value) : String(value)
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

  element.children.forEach(child => {
    flat.push(...(child.isFlatteable ? flatChildren(child) : [child]));
  });

  return flat
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

/**
 * For event call rewriting
 *
 * @type {RegExp}
 */
const METHOD_REGEX = /(?<prefix>\W)?(?<name>\w+)\(/g;

/**
 * Rewrite a given `expression` for event binding
 *
 * @param {string} expression - JavaScript expression to be rewritten
 *
 * @return {string}
 */
function getEvent (expression) {
  let match;
  let rewrited = expression;

  while (match = METHOD_REGEX.exec(expression)) {
    const { index, groups } = match;

    // In case we are in a sub path, skip
    if (groups.prefix === '.') continue

    const start = index + match[0].length;

    // Initial depth `(` = 1
    let depth = 1;
    let cursor = start;
    let inDouble = false;
    let inSingle = false;

    // Catch arguments
    loop: while (depth) {
      const inExpression = !inDouble && !inSingle;

      switch (expression.charAt(cursor++)) {
        case ')': inExpression && --depth; break
        case '(': inExpression && ++depth; break
        case '"': !inSingle && (inDouble = !inDouble); break
        case "'": !inDouble && (inSingle = !inSingle); break
        case '': break loop
      }
    }

    // Get arguments
    const args = expression.slice(start, cursor - 1 /* skip parenthesis */);

    rewrited = rewrited.replace(
      expression.slice(groups.prefix ? index + 1/* skip prefix */ : index, cursor),

      // Intercept with $commit call
      `$commit('${groups.name}'${args ? `, ${args}` : ''})`
    );
  }

  return rewrited
}

/**
 * Match filters to split within a template interpolation
 *
 * @type {RegExp}
 */
const FILTER_SPLIT_REGEX = /(?<!\|)\|(?!\|)/;

/**
 * @type {RegExp}
 */
const FILTER_REGEX = /^(?<name>\w+)(?<args>\()?/;

/**
 *
 * @param {string} expression
 * @param {Array.<Function>} filters
 *
 * @return {string}
 */
function getFiltered (expression, filters) {
  filters = filters.map(filter => {
    filter = filter.trim();

    const match = FILTER_REGEX.exec(filter);
    const args = [];

    if (match.groups.args) {
      let depth = 1;
      let start = match[0].length;
      let index = start;
      let inDouble = false;
      let inSingle = false;

      function pushArg () {
        args.push(filter.slice(start, index - 1).trim());
      }

      // Get filter arguments
      loop: while (depth) {
        const inExpression = !inDouble && !inSingle;

        switch (filter.charAt(index++)) {
          case '(': inExpression && ++depth; break
          case '"': !inSingle && (inDouble = !inDouble); break
          case "'": !inDouble && (inSingle = !inSingle); break
          case '': break loop
          case ')': {
            if (inExpression && depth-- === 1) {
              pushArg();
              break loop
            }
          } break
          case ',': {
            if (inExpression && depth === 1) {
              pushArg();
              start = index;
            }
          } break
        }
      }
    }

    // Compose filter applier
    return `$value => ${match.groups.name}($value, ...[${args.join()}])`
  });

  return `[${filters.join()}].reduce((result, filter) => filter(result), ${expression})`
}

/**
 * Match text template interpolation
 *
 * @type {RegExp}
 */
const TEXT_TEMPLATE = /{{(?<expression>.*?)}}/;

/**
 * Match html template interpolation
 *
 * @type {RegExp}
 */
const HTML_TEMPLATE = /{{{(?<expression>.*?)}}}/;

/**
 * Get a JavaScript expression
 *
 * @param {string} template - String with interpolation tags
 * @param {boolean} escape - Whether escape HTML or not
 *
 * @return {string}
 */
function getExpression (template, escape = true) {
  let match;

  // Hold inlined expressions
  const expressions = [];

  // Escape HTML tags?
  const MATCH_REGEX = escape ? TEXT_TEMPLATE : HTML_TEMPLATE;

  while (match = MATCH_REGEX.exec(template)) {
    const rawLeft = template.slice(0, match.index);
    let expression = match.groups.expression.trim();

    // Push wrapped left context
    if (rawLeft) expressions.push(`\`${rawLeft}\``);

    // Push isolated expression itself
    if (expression) {
      const parts = expression.split(FILTER_SPLIT_REGEX);

      expressions.push(
        parts.length > 1
          ? getFiltered(parts[0], parts.slice(1))
          : `(${expression})`
      );
    }

    template = template.slice(match.index + match[0].length);
  }

  // Push residual template expression
  if (template) expressions.push(`\`${template}\``);

  return expressions.join(' + ')
}

/**
 * Compile an scoped getter with given `expression`
 *
 * @param {string} expression - JavaScript expression
 * @param {*} context - Getter context
 *
 * @return {Function}
 */
function compileScopedGetter (expression, context) {
  return compileScopedEvaluator(`return ${expression}`, context)
}

/**
 * Compile an scoped setter with given `expression`
 *
 * @param {string} expression - JavaScript expression
 * @param {*} context - Setter context
 *
 * @return {Function}
 */
function compileScopedSetter (expression, context) {

  /**
   * Wrap the whole expression within parenthesis
   * to avoid statement declarations
   */
  return compileScopedEvaluator(`(${expression} = arguments[0])`, context)
}

/**
 * Compile an evaluator function with scoped context
 *
 * @param {string} body - Function body
 * @param {*} context - Function context
 *
 * @return {Function}
 */
function compileScopedEvaluator (body, context) {

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
  const evaluator = new Function(`
    with (this.scope) {
      with (state) {
        with (this.isolated) {
          ${body}
        }
      }
    }
  `);

  // Wrapper function to avoid `Function.prototype.bind`
  return value => evaluator.call(context, value)
}

const CONDITIONAL_ATTRIBUTE = '*if';

class ConditionalRenderer {
  constructor (element, context) {
    this.element = element;
    this.context = context;

    this.condition = digestData(element, CONDITIONAL_ATTRIBUTE);
    this.getter = compileScopedGetter(this.condition, this.context);

    this.anchor = createAnchor(`if: ${this.condition}`);
  }

  static is ({ attributes }) {
    return CONDITIONAL_ATTRIBUTE in attributes
  }

  render () {
    if (this.getter()) {
      if (!this.element.isConnected) {
        this.anchor.parentNode.replaceChild(this.element, this.anchor);
      }
    } else if (this.element.isConnected) {
      this.element.parentNode.replaceChild(this.anchor, this.element);
    }
  }
}

const BIND_ATTRIBUTE = '*bind';

/**
 * With support just for input types:
 *
 *   - Password
 *   - Text
 *   - Email
 *   - Search
 *   - URL
 *   - Number
 */
class BindRenderer {
  constructor (input, context) {
    this.input = input;
    this.context = context;

    this.path = digestData(input, BIND_ATTRIBUTE);

    this.setting = false;

    // Input -> State
    this.setter = compileScopedSetter(this.path, context);

    // State -> Input
    this.getter = compileScopedGetter(this.path, context);

    this.conversor = input.type === 'number' ? Number : String;

    this._onInput();
  }

  static is (element) {
    return (
      BIND_ATTRIBUTE in element.attributes &&
      element instanceof HTMLInputElement
    )
  }

  // Change state (Input -> State)
  _onInput () {
    this.input.addEventListener('input', ({ target }) => {
      this.setting = true;
      this.setter(this.conversor(target.value));
    });
  }

  // Change input (State -> Input)
  render () {
    // Avoid re-dispatching on flush cycle
    // for an already assigned value
    if (this.setting) {
      this.setting = false;
      return
    }

    const value = toString(this.getter());

    if (differ(this.input, value)) {
      this.input.value = value;
    }
  }
}

/**
 * Renderer for inline tag template binding:
 *
 *   1. Within text node: <h1>Hello {{ world }}</h1>
 *   2. As attribute interpolation: <input class="some-class {{ klass }}"/>
 */
class TemplateRenderer {
  constructor (node, context) {
    this.node = node;
    this.context = context;

    this.expression = getExpression(node.nodeValue);
    this.getter = compileScopedGetter(this.expression, context);

    this.value = null;
  }

  static is ({ nodeValue }) {
    return TEXT_TEMPLATE.test(nodeValue)
  }

  render () {
    const value = this.getter();

    // Normalized value to avoid null or undefined
    const normalized = this.value = isDefined(value) ? toString(value) : '';

    if (differ(this.node, normalized)) {
      this.node.nodeValue = normalized;
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
class BindingRenderer {
  constructor (attribute, context) {
    this.owner = attribute.ownerElement;
    this.context = context;

    this.oneTime = attribute.name.startsWith(BIND_ONE_TIME_TOKEN);

    this.attribute = this._getObserved(attribute);

    this.expression = attribute.value;

    this.getter = compileScopedGetter(this.expression, context);

    // Attribute raw value (without any conversion) and holding reference
    this.value = null;

    if (this.oneTime) {
      const render = this.render;

      this.render = () => {
        const { bindings } = context;

        // Schedule remove to queue end
        nextTick(() => {
          bindings.splice(bindings.indexOf(this), 1);
        });

        render.call(this);
      };
    }
  }

  static is ({ name }) {
    return name.startsWith(BIND_TOKEN)
  }

  _getObserved (attribute) {
    const { name } = attribute;
    const { attributes } = attribute.ownerElement;

    const normalizedName = name.slice(this.oneTime ? 2 : 1);

    let observed = attributes.getNamedItem(normalizedName);

    if (!config.debug) attributes.removeNamedItem(name);

    if (observed) return observed

    observed = document.createAttribute(normalizedName);
    attributes.setNamedItem(observed);

    return observed
  }

  render () {
    const value = this.value = this.getter();

    if (differ(this.attribute, value)) {
      this.attribute.value = value;
    }
  }
}

const CLASS_REGEX = /^:{1,2}class$/;

class ClassRenderer extends BindingRenderer {
  constructor (...args) {
    super(...args);
  }

  static is ({ name }) {
    return CLASS_REGEX.test(name)
  }

  _getNormalized () {
    const value = this.getter();

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

  render () {
    const value = this._getNormalized();

    // Fallback to normal attribute rendering
    if (!isObject(value)) return super.render()

    const { classList } = this.attribute.ownerElement;

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

  render () {
    const styles = this.getter();

    // Fallback to normal rendering
    if (!isObject(styles)) return super.render()

    const $styles = this.owner.style;

    // Remove actual props
    for (const rule in this.styles) {
      if (!styles.hasOwnProperty(rule)) {
        $styles[rule.split(UNIT_SEPARATOR)[0]] = null;
      }
    }

    // Add new props
    for (const rule in styles) {
      if (this.styles[rule] !== styles[rule]) {
        const [prop, unit] = rule.split(UNIT_SEPARATOR);
        $styles[prop] = `${styles[rule]}${unit || ''}`;
      }
    }

    this.styles = Object.assign({}, styles);
  }
}

const EVENT_TOKEN = '@';

function isEvent ({ name }) {
  return name.startsWith(EVENT_TOKEN)
}

function event ({ name }, context) {
  const $el = context.element;

  const expression = digestData($el, name);
  const evaluator = compileScopedEvaluator(getEvent(expression), context);

  $el.addEventListener(name.slice(1), event => {
    // Externalize event
    context.scope.$event = event;

    evaluator();

    context.scope.$event = null;
  });
}

/**
 * Base renderer which resolves:
 *
 *   1. Directive bindings
 *   2. Template and attribute bindings
 */
class BaseRenderer {
  constructor (element, scope, isolated) {
    this.element = element;
    this.scope = scope;

    /**
     * Hold directives to digest
     */
    this.directives = [];

    /**
     * Hold attribute and template bindings to digest
     */
    this.bindings = [];

    /**
     * Loop elements need an isolated scope
     *
     * Note: We need to create a shallow copy
     * to avoid overrides a parent isolated scope
     */
    this.isolated = newIsolated(isolated);

    this._init();
  }

  _init () {
    const $el = this.element;

    // Fragment (templates) has not attributes
    if ('attributes' in $el) {
      this._initDirectives($el);
      this._initBindings($el);
    }
  }

  _initDirectives ($el) {
    if (ConditionalRenderer.is($el)) {
      this.directives.push(new ConditionalRenderer($el, this));
    }

    if (BindRenderer.is($el)) {
      this.directives.push(new BindRenderer($el, this));
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
        this.bindings.push(new (
          ClassRenderer.is(attribute)
            ? ClassRenderer
            : StyleRenderer.is(attribute)
              ? StyleRenderer
              : BindingRenderer)(attribute, this));
      }
    }
  }

  render () {
    const $el = this.element;

    for (const directive of this.directives) {
      directive.render();
    }

    // Don't perform updates on disconnected element
    if ($el.isConnected && 'attributes' in $el) {
      for (const binding of this.bindings) {
        binding.render();
      }

      /**
       * ref: It's a special directive/attribute which holds
       * native elements instantiation within the scope
       */
      const ref = $el.getAttribute('ref');

      // We need to resolve the reference first
      // since possible childs may need access to
      if (ref) {

        // Reference isn't removed
        this.scope.$refs.set(ref, $el);
      }
    }
  }
}

const parser = document.createElement('div');

/**
 * Renderer for unescaped HTML:
 *
 *   {{{ '<h1>' + hello + '</h1>' }}}
 */
class HTMLRenderer {
  constructor (anchor, context) {
    this.anchor = anchor;
    this.context = context;

    this.expression = getExpression(anchor.data, false);
    this.getter = compileScopedGetter(this.expression, context);

    // Save parsed nodes
    this.cache = new Map();

    // Hold active nodes
    this.nodes = [];

    // Hide anchor
    anchor.data = '';
  }

  static is ({ data }) {
    return HTML_TEMPLATE.test(data)
  }

  render () {
    // TODO: Maybe we can cache nodes individually

    const html = this.getter();
    let nodes = this.cache.get(html);

    if (!nodes) {
      parser.innerHTML = html;
      nodes = Array.from(parser.childNodes);

      // Persist active
      this.cache.set(html, nodes);
    }

    if (this.nodes !== nodes) {
      // 1. Remove active nodes
      this.nodes.forEach(node => {
        node.remove();
      });

      // 2. Append incoming nodes
      nodes.forEach(node => {
        this.anchor.parentNode.insertBefore(node, this.anchor);
      });

      this.nodes = nodes;
    }
  }
}

/**
 * @type {Symbol}
 */
const ELEMENT_SYMBOL = Symbol('Galaxy.Element');

/**
 * @type {Symbol}
 */
const STATE_SYMBOL = Symbol('Galaxy.State');

const PROP_TOKEN = '.';

/**
 * Renderer for custom elements resolving props
 */
class CustomRenderer extends BaseRenderer {
  constructor (...args) {
    super(...args);

    this._resolveProps();
  }

  static is (element) {
    return element.hasOwnProperty(ELEMENT_SYMBOL)
  }

  _resolveProps () {
    const { props, attributes } = this.element;

    for (const { name, value } of Array.from(attributes)) {
      if (name.startsWith(PROP_TOKEN)) {

        // Normalize prop name
        const prop = camelize(name.slice(1));

        if (props.hasOwnProperty(prop)) {

          // Get raw value (with references)
          const get = compileScopedGetter(value, this);

          // Immutable property
          Object.defineProperty(props, prop, { enumerable: true, get });
        }

        // TODO: Warn unknown prop

        // Don't reflect prop value
        this.element.removeAttribute(name);
      }
    }
  }

  render () {
    // Resolve directive, props & attribute bindings
    super.render();

    // Re-render (digest props)
    this.element.$render();
  }
}

class ItemRenderer {
  constructor (template, context, isolated) {
    this.child = new ElementRenderer(
      template.cloneNode(true),
      context.scope,
      newIsolated(context.isolated, isolated)
    );

    this.reused = false;
  }

  update (isolated) {
    this.reused = true;

    Object.assign(this.child.isolated, isolated);
  }

  insert (item) {
    item.parentNode.insertBefore(this.child.element, item);
  }

  render () {
    this.child.render();
  }
}

// Note: to maintain consistence avoid `of` reserved word on iterators.

// TODO: Add anchor delimiters

const LOOP_ATTRIBUTE = '*for';

/**
 * Captures:
 *
 *  1. Simple
 *
 *   [item] in [expression]
 *   ([item]) in [expression]
 *
 *  2. Complex
 *
 *   [item], [key|index] in [expression]
 *   ([item], [key|index]) in [expression]
 */
const LOOP_REGEX = /^\(?(?<value>\w+)(?:\s*,\s*(?<key>\w+))?\)?\s+in\s+(?<expression>.+)$/;

const LOOP_INDEX = '$index';
const LOOP_KEY_NAME = '$key';

class LoopRenderer {
  constructor (template, context) {
    this.template = template;
    this.context = context;

    this.items = [];

    const { groups } = digestData(template, LOOP_ATTRIBUTE).match(LOOP_REGEX);

    this.keyName = groups.key || LOOP_KEY_NAME;
    this.valueName = groups.value;

    this.getter = compileScopedGetter(groups.expression, context);

    this.startAnchor = createAnchor(`start for: ${groups.expression}`);
    this.endAnchor = createAnchor(`end for: ${groups.expression}`);

    const parent =
    this.parent = template.parentNode;

    // Remove `template` since is just a template
    parent.replaceChild(this.startAnchor, template);
    parent.insertBefore(this.endAnchor, this.startAnchor.nextSibling);
  }

  static is ({ attributes }) {
    return LOOP_ATTRIBUTE in attributes
  }

  render () {
    const collection = this.getter();
    const keys = Object.keys(collection);

    const items = [];

    // TODO: Add sort of track-by (maybe a key attribute)

    // 1. Adding, updating
    keys.forEach((key, index) => {
      const value = collection[key];

      let item = this.items[index];

      const isolated = {
        [LOOP_INDEX]: index,
        [this.keyName]: key,
        [this.valueName]: value
      };

      if (item) {
        item.update(isolated);
      } else {
        item = new ItemRenderer(this.template, this.context, isolated);

        // Insert before end anchor
        item.insert(this.endAnchor);
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
        item.child.element.remove();
      }
    }

    this.items = items;
  }
}

class ElementRenderer extends BaseRenderer {
  constructor (...args) {
    super(...args);

    /**
     * Resolve children renders
     */
    this.children = [];

    // Attach children
    this._initChildren();
  }

  get isRenderable () {
    return (
      this.directives.length > 0 ||
      this.bindings.length > 0 ||
      this.children.length > 0
    )
  }

  get isFlattenable () {
    return (
      this.children.length > 0 &&
      !this.directives.length &&
      !this.bindings.length
    )
  }

  _initChildren () {
    for (const child of this.element.childNodes) {
      if (isTextNode(child)) {
        // 1. Check {{{ binding }}}
        if (HTMLRenderer.is(child)) {
          this.children.push(new HTMLRenderer(child, this));

        // 2. Check {{ binding }}
        } else if (TemplateRenderer.is(child)) {
          this.children.push(new TemplateRenderer(child, this));
        }

      // 3. Element binding
      } else if (isElementNode(child)) {
        // The loop directive is resolved as a child
        if (LoopRenderer.is(child)) {
          this.children.push(new LoopRenderer(child, this));
        } else if (CustomRenderer.is(child))  {
          // Set parent communication
          // TODO: Logic within RenderCE?
          child.$parent = this.scope;

          this.children.push(new CustomRenderer(child, this.scope, this.isolated));
        } else {
          const element = new ElementRenderer(child, this.scope, this.isolated);

          // Only consider a render element if its childs
          // or attributes has something to bind/update
          if (element.isRenderable) {
            this.children.push(...(element.isFlattenable ? flatChildren(element) : [element]));
          }
        }
      }

      // ... ignore comment nodes
    }
  }

  render () {
    // Resolve directives & attribute bindings
    super.render();

    // Don't perform updates on disconnected element
    if (this.element.isConnected) {
      for (const child of this.children) {
        child.render();
      }
    }
  }
}

class GalaxyError$1 {
  constructor (message) {
    this.name = 'GalaxyError';
    this.message = message;
  }
}

/**
 * Better `EventTarget` implementation
 */
class GalaxyChannel {
  constructor () {
    this.ports = Object.create(null);
  }

  _getListeners (port) {
    return this.ports[port] || []
  }

  on (port, callback) {
    (this.ports[port] = this._getListeners(port)).push(callback);
  }

  off (port, callback) {
    const alive = this._getListeners(port).filter(_ => _ !== callback);

    if (alive.length) {
      this.ports[port] = alive;
    } else {
      delete this.ports[port];
    }
  }

  emit (port, payload) {
    this._getListeners(port).forEach(callback => callback(payload));
  }
}

const channel = new GalaxyChannel();

class GalaxyElement extends HTMLElement {
  constructor () {
    super();

    // Default initial state
    // Just an empty object
    // Note: This also calls initial render
    this.state = {};

    // Hold component properties
    // TODO: How to properly define properties?
    // TODO: Reflect props to attributes?
    this.props = this.constructor.properties;

    // Actual event being dispatched
    this.$event = null;

    // For parent communication
    this.$parent = null;

    // For indirect galaxy elements communication
    this.$channel = channel;

    // Hold element references
    this.$refs = new Map();

    // We need to append content before setting up the main renderer
    this.attachShadow({ mode: 'open' })
      .appendChild(this.constructor.template.content.cloneNode(true));

    // Setup main renderer
    this.$renderer = new ElementRenderer(this.shadowRoot, this);

    // Flag whether we are in a rendering phase
    this.$rendering = false;

    // This is a Galaxy Element
    Object.defineProperty(this, ELEMENT_SYMBOL, { value: true });

    console.dir(this); // For debugging purposes

    callHook(this, 'created');
  }

  get state () {
    // Return proxified state
    return this[STATE_SYMBOL]
  }

  set state (state) {
    // Reassign state as proxy
    this[STATE_SYMBOL] = ProxyObserver.observe(
      state, {} /* takes default options */,
      () => { this.$render(); } // Perform render on changes
    );

    // State change, so render...
    this.$render();
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

  /**
   *  NOTE: This hook needs some revision
   *
   *  attributeChangedCallback (...args) {
   *    callHook(this, 'attribute', ...args)
   *  }
   */

  $commit (method, ...args) {
    if (method in this) {
      if (!isFunction(this[method])) {
        throw new GalaxyError$1(`Method '${method}' must be a function`)
      }

      if (isReserved(method)) {
        throw new GalaxyError$1(`Could no call reserved method '${method}'`)
      }

      this[method](this.state, ...args);
    }
  }

  $render () {
    if (!this.$rendering) {
      this.$rendering = true;

      nextTick(() => {

        // References are cleared before each render phase
        // then they going to be filled up
        this.$refs.clear();

        try {
          this.$renderer.render();
        } catch (e) {
          // Avoid stack collapsing
          nextTick(() => {
            throw e
          });
        }

        // Sleep after render new changes
        this.$rendering = false;
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
  options = Object.assign({}, options);

  const elements = options.elements;

  // Remove registered elements
  delete options.elements;

  // Merge rest options with default configuration
  Object.assign(config, options);

  // Register elements
  register(elements);
}

function register (elements) {
  for (const GalaxyElement of elements) {
    if (typeof GalaxyElement.is === 'undefined') {
      throw new GalaxyError('Unknown element name')
    }

    try {
      customElements.define(GalaxyElement.is, GalaxyElement);
    } catch (e) {
      throw new GalaxyError(e.message)
    }
  }
}

export { config, html, setup, register, GalaxyElement };
