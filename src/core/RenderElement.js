import config from '../config.js'

import RenderBinding, { needBinding } from '../core/RenderBinding.js'
import RenderTemplate, { needTemplate } from '../core/RenderTemplate.js'

import reference, { needReference } from '../directives/reference.js'

import RenderLoop, { needLoop } from '../directives/RenderLoop.js'
import RenderBind, { needBind } from '../directives/RenderBind.js'
import RenderConditional, { needConditional } from '../directives/RenderConditional.js'

import { isTextNode, isElementNode } from '../utils/type-check.js'
import { compileNestedEvaluator } from '../utils/evaluation.js'
import { digestData } from '../utils/generic.js'

const EVENT_TOKEN = '@'
const EVENT_REGEX = /^([\w\d]+)(?:\(([^)]*)\))?$/

export default class RenderElement {
  constructor (element, scope, isolated = {}) {
    this.element = element
    this.scope = scope

    // Isolated scope
    /**
     * We need an isolated scope which contains
     * individually data taken from RenderLoop
     */
    this.isolated = Object.assign({}, isolated)

    /**
     * Hold directives to digest
     */
    this.directives = []

    /**
     * Hold attribute and template bindings to digest
     */
    this.bindings = []

    /**
     * Resolve children renders
     */
    this.children = []

    this._init()
  }

  get isRenderable () {
    return (
      this.directives.length > 0 ||
      this.bindings.length > 0 ||
      this.children.length > 0
    )
  }

  _init () {
    const $el = this.element

    // Fragment (templates) has not attributes
    if ('attributes' in $el) {
      this._initDirectives($el)
      this._initBindings($el)
    }

    this._initChildren($el)
  }

  _initDirectives ($el) {
    if (needConditional($el)) {
      this.addDirective(new RenderConditional($el))
    }

    if (needBind($el)) {
      this.addDirective(new RenderBind($el))
    }
  }

  _attachEvent ($el, name) {
    let match

    if (match = digestData($el, name).match(EVENT_REGEX)) {
      const [, method, args] = match
      const evaluate = compileNestedEvaluator(`$commit('${method}'${args ? `, ${args}` : ''})`)

      $el.addEventListener(name.slice(1), event => {
        // Externalize event
        this.scope.$event = event

        // TODO: Check for async evaluation
        evaluate(this.scope, this.isolated)

        this.scope.$event = null
      })
    }
  }

  _initBindings ($el) {
    // Avoid live list
    const attributes = Array.from($el.attributes)

    for (const attribute of attributes) {
      // 1. Check @binding
      if (attribute.name.startsWith(EVENT_TOKEN)) {
        this._attachEvent($el, attribute.name)

      // 2. Check :binding
      } else if (needBinding(attribute)) {
        this.addBinding(new RenderBinding(attribute))

      // 3. Check {{ binding }}
      } else if (needTemplate(attribute)) {
        this.addBinding(new RenderTemplate(attribute))
      }
    }
  }

  _initChildren ($el) {
    for (const child of $el.childNodes) {
      if (isTextNode(child) && needTemplate(child)) {
        this.addChild(new RenderTemplate(child))
      } else if (isElementNode(child)) {
        // The loop directive is resolved as a child
        // to avoid some errors (TODO: Clarify 'errors')
        if (needLoop(child)) {
          this.addChild(new RenderLoop(child, this.scope))
        } else {
          const element = new RenderElement(child, this.scope, this.isolated)

          // Only consider a render element if its childs
          // or attributes has something to bind/update
          if (element.isRenderable) {
            this.addChild(element)
          }
        }
      }

      // ... ignore comment nodes
    }
  }

  addChild (child) {
    this.children.push(child)
  }

  addDirective (directive) {
    this.directives.push(directive)
  }

  addBinding (binding) {
    this.bindings.push(binding)
  }

  render (state) {
    const $el = this.element

    for (const directive of this.directives) {
      directive.render(state, this.isolated)
    }

    // Don't perform updates on disconnected element
    if ($el.isConnected) {
      if ('attributes' in $el) {
        for (const binding of this.bindings) {
          binding.render(state, this.isolated)
        }

        // We need to resolve the reference first
        // since childs may need access to
        if (needReference($el)) {
          reference($el, this.scope)
        }
      }

      for (const child of this.children) {
        child.render(state, this.isolated)
      }
    }
  }
}
