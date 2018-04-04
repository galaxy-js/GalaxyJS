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

    // Save parsed nodes
    this.cache = new Map()

    // Hold active nodes
    this.nodes = []

    // Hide anchor
    anchor.data = ''
  }

  render () {
    // TODO: Maybe we can cache nodes individually

    const html = this.getter(this.scope.state, this.isolated)
    let nodes = this.cache.get(html)

    if (!nodes) {
      parser.innerHTML = html
      nodes = Array.from(parser.childNodes)

      // Persist active
      this.cache.set(html, nodes)
    }

    if (this.nodes !== nodes) {
      // 1. Remove active nodes
      this.nodes.forEach(node => {
        node.remove()
      })

      // 2. Append incoming nodes
      nodes.forEach(node => {
        this.anchor.parentNode.insertBefore(node, this.anchor)
      })

      this.nodes = nodes
    }
  }
}
