import nextTick from '../utils/next-tick.js'
import { getEvaluator, getExpression } from '../utils/evaluation.js'

export default class RenderNode {
  // `scope` is the component itself
  constructor (node) {
    this.node = node

    this._compileEval()
  }

  _compileEval () {
    // Just evaluate a template expression
    this.eval = getEvaluator(getExpression(this.node))
  }

  render (state, refresh) {
    if (refresh) this._compileEval()

    const result = this.eval(state)

    if (result !== this.node.nodeValue) {
      this.node.nodeValue = result
    }
  }
}
