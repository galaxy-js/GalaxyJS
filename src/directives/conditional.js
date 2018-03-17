import { getEvaluator } from '../utils/evaluation.js'

export const CONDITIONAL_DATA = 'gIf'

export default function conditional (element) {
  const condition = element.dataset[CONDITIONAL_DATA]

  const evaluate = getEvaluator(condition)
  const anchor = document.createComment(` gIf: ${condition} `)
  const parent = element.parentNode

  return {
    render (state) {
      if (evaluate(state)) {
        if (!element.isConnected) {
          parent.replaceChild(element, anchor)
        }
      } else if (element.isConnected) {
        parent.replaceChild(anchor, element)
      }
    }
  }
}
