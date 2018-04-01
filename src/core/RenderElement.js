import config from '../config.js'

import RenderBinding, { needBinding } from '../core/RenderBinding.js'
import RenderTemplate, { needTemplate } from '../core/RenderTemplate.js'

import reference, { needReference } from '../directives/reference.js'

import RenderLoop, { needLoop } from '../directives/RenderLoop.js'
import RenderBind, { needBind } from '../directives/RenderBind.js'
import RenderConditional, { needConditional } from '../directives/RenderConditional.js'

import { isTextNode, isElementNode } from '../utils/type-check.js'
import { compileNestedEvaluator, newIsolated } from '../utils/evaluation.js'
import { digestData } from '../utils/generic.js'

const EVENT_TOKEN = '@'
const EVENT_REGEX = /^([\w\d]+)(?:\(([^)]*)\))?$/

export default class RenderElement {
  constructor (element, scope, isolated) {
    this.element = element
    this.scope = scope

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

    /**
     * Loop elements need an isolated scope
     *
     * Note: We need to create a shallow copy
     * to avoid overrides a parent isolated scope
     */
    this.isolated = newIsolated(isolated)

    // Attach bindings, directives and chilren
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
      this.directives.push(new RenderConditional($el, this.scope, this.isolated))
    }

    if (needBind($el)) {
      this.directives.push(new RenderBind($el, this.scope, this.isolated))
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
        this.bindings.push(new RenderBinding(attribute, this.scope, this.isolated))

      // 3. Check {{ binding }}
      } else if (needTemplate(attribute)) {
        this.bindings.push(new RenderTemplate(attribute, this.scope, this.isolated))
      }
    }
  }

  _initChildren ($el) {
    for (const child of $el.childNodes) {
      if (isTextNode(child) && needTemplate(child)) {
        this.children.push(new RenderTemplate(child, this.scope, this.isolated))
      } else if (isElementNode(child)) {
        // The loop directive is resolved as a child
        if (needLoop(child)) {
          this.children.push(new RenderLoop(child, this.scope, this.isolated))
        } else {
          const element = new RenderElement(child, this.scope, this.isolated)

          // Only consider a render element if its childs
          // or attributes has something to bind/update
          if (element.isRenderable) this.children.push(element)
        }
      }

      // ... ignore comment nodes
    }
  }

  render () {
    const $el = this.element

    for (const directive of this.directives) {
      directive.render()
    }

    // Don't perform updates on disconnected element
    if ($el.isConnected) {
      if ('attributes' in $el) {
        for (const binding of this.bindings) {
          binding.render()
        }

        // We need to resolve the reference first
        // since childs may need access to
        if (needReference($el)) {
          reference($el, this.scope)
        }
      }

      for (const child of this.children) {
        child.render()
      }
    }
  }
}
