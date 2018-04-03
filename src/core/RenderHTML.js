import { compileNestedGetter, getExpression } from '../utils/evaluation.js'
import RenderElement from './RenderElement.js'

const HTML_REGEX = /{{{(.*?)}}}/

const parser = document.createElement('div')

export function needHTML ({ data }) {
  return data.includes('{{{')
}

export default class RenderHTML {
  constructor (anchor, scope, isolated) {
    this.anchor = anchor
    this.scope = scope

    // Inherit isolated scope
    this.isolated = isolated

    this.expression = getExpression(anchor.data, HTML_REGEX)
    this.getter = compileNestedGetter(this.expression)

    this.cache = new Map()

    this.active = RenderHTML.EMPTY_ACTIVE

    // Hide anchor
    anchor.data = ''
  }

  static get EMPTY_ACTIVE () {
    return {
      nodes: [],
      renders: []
    }
  }

  render () {
    const html = this.getter(this.scope.state, this.isolated)
    let active = this.cache.get(html)

    if (!active) {
      parser.innerHTML = html

      active = {
        nodes: Array.from(parser.childNodes),
        renders: new RenderElement(parser, this.scope, this.isolated).children
      }

      // Persist active
      this.cache.set(html, active)
    }

    if (this.active !== active) {
      // 1. Remove active nodes
      this.active.nodes.forEach(node => {
        node.remove()
      })

      // 2. Append incoming nodes
      active.nodes.forEach(node => {
        this.anchor.parentNode.insertBefore(node, this.anchor)
      })

      // 3. Render phase
      active.renders.forEach(render => {
        render.render()
      })

      this.active = active
    }
  }
}
