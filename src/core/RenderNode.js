import nextTick from '../utils/next-tick.js'
import { getEvaluator, getExpression } from '../utils/evaluation.js'

export default class RenderNode {
  // `scope` is the component itself
  constructor (node, isDirect) {
    this.node = node
    this.isDirect = isDirect

    this._compileEval()
  }

  _compileEval () {
    this.eval = getEvaluator(this.isDirect ? this.node.value : getExpression(this.node))
  }

  render (state, refresh) {
    if (refresh) this._compileEval()

    const result = this.eval(state)

    if (result !== this.node.nodeValue) {
      this.node.nodeValue = result
    }
  }
}
