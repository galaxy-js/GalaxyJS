import { compileNestedGetter, getExpression } from '../utils/evaluation.js'
import RenderElement from './RenderElement.js'

const HTML_REGEX = /{{{(.*?)}}}/

export function needHTML ({ data }) {
  return data.includes('{{{')
}

export default class RenderHTML {
  constructor (anchor, scope, isolated) {
    this.anchor = anchor
    this.scope = scope

    // Inherit isolated scope
    this.isolated = isolated

    this.cache = new Map()

    this.expression = getExpression(anchor.data, HTML_REGEX)

    this.getter = compileNestedGetter(this.expression)
  }

  render () {
    // TODO: Found a way to avoid wrap children

    const html = this.getter(this.scope.state, this.isolated)
    let renderer = this.cache.get(html)

    if (!renderer) {
      const wrapper = document.createElement('div')

      wrapper.innerHTML = html
      renderer = new RenderElement(wrapper, this.scope, this.isolated)

      // Persist renderer
      this.cache.set(html, renderer)
    }

    const { element } = renderer

    if (!element.isConnected) {
      this.anchor.parentNode.replaceChild(element, this.anchor)
      this.anchor = element
    }

    renderer.render()
  }
}
