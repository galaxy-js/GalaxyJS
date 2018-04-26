import { isObject } from '../utils/type-check.js'

export function isProp ({ ownerElement }) {
  return ownerElement.__galaxy__ && isObject(ownerElement.props)
}

export default function resolveProp ({ props }, binding) {
  const prop = (binding.node || binding.attribute).name

  if (props.hasOwnProperty(prop)) {

    // Immutable property
    Object.defineProperty(props, prop, {
      enumerable: true,
      get () {

        // Get raw value (with references)
        return binding.value
      }
    })
  }
}
