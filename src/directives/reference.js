import { camelize, digestData } from '../utils/generic.js'

export const REFERENCE_ATTRIBUTE = 'g-ref'

export function needReference ({ attributes }) {
  return REFERENCE_ATTRIBUTE in attributes
}

export default function reference (node, scope) {
  scope.$refs[camelize(digestData(node, REFERENCE_ATTRIBUTE))] = node
}
