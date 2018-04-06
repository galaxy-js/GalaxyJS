import { compileScopedGetter, getExpression } from '../utils/compiler.js'

const parser = document.createElement('div')

export default class RenderHTML {
  constructor (anchor, context) {
    this.anchor = anchor
    this.context = context

    this.expression = getExpression(anchor.data, false)
    this.getter = compileScopedGetter(this.expression, context)

    // Save parsed nodes
    this.cache = new Map()

    // Hold active nodes
    this.nodes = []

    // Hide anchor
    anchor.data = ''
  }

  static is ({ data }) {
    return data.includes('{{{')
  }

  render () {
    // TODO: Maybe we can cache nodes individually

    const html = this.getter()
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
