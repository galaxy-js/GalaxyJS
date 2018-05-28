import nextTick from 'https://cdn.jsdelivr.net/gh/LosMaquios/next-tick@v0.1.0/index.js';
import ProxyObserver from 'https://cdn.jsdelivr.net/gh/LosMaquios/ProxyObserver@v0.3.2/index.js';

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

/**
 * @type {Symbol}
 */
const ELEMENT_SYMBOL = Symbol('Galaxy.Element');

/**
 * @type {Symbol}
 */
const STATE_SYMBOL = Symbol('Galaxy.State');

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

function isGalaxyElement (element) {
  return element.hasOwnProperty(ELEMENT_SYMBOL)
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
   *
   * @param {*} value
   * @param {Array.<Object>} filters
   *
   * @return {*}
   */
  _$f (value, filters) {
    return filters.reduce((result, filter) => {
      const applier = config.filters[filter.name];

      return filter.args
        ? applier(result, ...args)
        : applier(result)
    }, value)
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

      // Intercept with the state
      `${groups.name}(state${args ? `, ${args}` : ''})`
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
        parts.length > 1
          ? `_$f(${parts[0]}, [${getDescriptors(parts.slice(1)).join()}])`
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
  return compileScopedEvaluator(`(${expression} = arguments[1])`, context)
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
    with (arguments[0]) {
      with (this.scope) {
        with (state) {
          with (this.isolated) {
            ${body}
          }
        }
      }
    }
  `);

  // Wrapper function to avoid `Function.prototype.bind`
  return value => evaluator.call(context, global, value)
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
    return TEXT_TEMPLATE_REGEX.test(nodeValue)
  }

  render () {
    const value = this.getter();

    // Normalized value to avoid null or undefined
    const normalized = this.value = isDefined(value) ? String(value) : '';

    if (differ(this.node, normalized)) {
      this.node.nodeValue = normalized;
    }
  }
}

const CONDITIONAL_ATTRIBUTE = '*if';

class ConditionalRenderer {
  constructor (element, context) {
    this.element = element;
    this.context = context;

    this.condition = getAttr(element, CONDITIONAL_ATTRIBUTE);
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

    this.path = getAttr(input, BIND_ATTRIBUTE);

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

    const value = String(this.getter());

    if (differ(this.input, value)) {
      this.input.value = value;
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

    if (!observed) {
      observed = document.createAttribute(normalizedName);
      attributes.setNamedItem(observed);
    }

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

  static parseRule (rule) {
    const segments = rule.split(UNIT_SEPARATOR);

    return {
      prop: segments[0],
      unit: segments[1]
    }
  }

  render () {
    const styles = this.getter();

    // Fallback to normal rendering
    if (!isObject(styles)) return super.render()

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

function event ({ name }, context) {
  const $el = context.element;

  const expression = getAttr($el, name);
  const evaluator = compileScopedEvaluator(rewriteMethods(expression), context);

  const parsed = parseEvent(name);
  const { modifiers } = parsed;

  let attachMethod = 'addEventListener';

  let actual;
  let handler = event => {
    // Externalize event
    context.scope.$event = event;

    evaluator();

    context.scope.$event = null;
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

  if (isGalaxyElement($el)) {
    attachMethod = `$on${modifiers.once ? 'ce' : ''}`;
  } else if (modifiers.once) {
    actual = handler;
    handler = event => {
      $el.removeEventListener(parsed.name, handler);
      actual(event);
    };
  }

  $el[attachMethod](parsed.name, handler);
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

const REFERENCE_ATTRIBUTE = 'ref';

class ElementRenderer {
  constructor (element, scope, isolated) {
    this.element = element;
    this.scope = scope;

    /**
     * Loop elements need an isolated scope
     *
     * Note: We need to create a shallow copy
     * to avoid overrides a parent isolated scope
     */
    this.isolated = newIsolated(isolated);

    /**
     * Hold directives to digest
     */
    this.directives = [];

    /**
     * Hold attribute and template bindings to digest
     */
    this.bindings = [];

    /**
     * Resolve children rendering
     */
    this.childrenRenderer = new ChildrenRenderer(element.childNodes, scope, this.isolated);

    // Attach children
    this._initDirectives(element);
    this._initBindings(element);
  }

  get isRenderable () {
    return (
      this.directives.length > 0 ||
      this.bindings.length > 0 ||
      this.childrenRenderer.renderers.length > 0 ||

      /**
       * Elements needs to be resolved included ones
       * which are only referenced
       */
      this.element.hasAttribute(REFERENCE_ATTRIBUTE)
    )
  }

  get isFlattenable () {
    return (
      this.childrenRenderer.renderers.length > 0 &&
      !this.directives.length &&
      !this.bindings.length
    )
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
    ce.$parent = this.scope;

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

    const { groups } = getAttr(template, LOOP_ATTRIBUTE).match(LOOP_REGEX);

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
          const element = new ElementRenderer(child, this.scope, this.isolated);

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

class GalaxyError$1 {
  constructor (message) {
    this.name = 'GalaxyError';
    this.message = message;
  }
}

class GalaxyElement extends HTMLElement {
  constructor () {
    super();

    // Default initial state
    // Just an empty object
    // Note: This also calls initial render
    this.state = {};

    // Hold component properties
    // TODO: How to properly define properties?
    this.props = this.constructor.properties;

    // Actual DOM event being dispatched
    this.$event = null;

    // Attached events
    this.$events = Object.create(null);

    // For parent communication
    this.$parent = null;

    // Hold element references
    this.$refs = new Map();

    // We need to append content before setting up the main renderer
    this.attachShadow({ mode: 'open' })
      .appendChild(this.constructor.template.content.cloneNode(true));

    // Setup main renderer
    this.$renderer = new ChildrenRenderer(this.shadowRoot.childNodes, this, {});

    // Flag whether we are in a rendering phase
    this.$rendering = false;

    // Is this a Galaxy Element?
    Object.defineProperty(this, ELEMENT_SYMBOL, { value: true });

    callHook(this, 'created');

    console.dir(this); // For debugging purposes
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

  attributeChangedCallback (name, old, value) {
    callHook(this, 'attribute', {
      name, old, value
    });
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
          if (!(e instanceof GalaxyError$1)) {
            e = new GalaxyError$1(e.message);
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

export { config, html, setup, GalaxyElement };
