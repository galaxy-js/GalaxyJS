import { camelize, digestData } from '../utils/generic.js'

/**
 * ref: It's a special directive which holds
 * native elements instantiation within the scope
 */
const REFERENCE_ATTRIBUTE = 'ref'

export function needReference ({ attributes }) {
  return REFERENCE_ATTRIBUTE in attributes
}

export default function reference (node, scope) {
  scope.$refs[camelize(digestData(node, REFERENCE_ATTRIBUTE))] = node
}
