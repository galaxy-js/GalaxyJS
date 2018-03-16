import { camelize } from '../utils/generic.js'

export const REF_DATA = 'gRef'

export default function reference (node, scope) {
  scope.$refs[camelize(node.dataset[REF_DATA])] = node
  delete node.dataset[REF_DATA]
}
