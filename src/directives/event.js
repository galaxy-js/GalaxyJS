import { compileScopedEvaluator, rewriteMethods } from '../compiler/index.js'

import { getAttr } from '../utils/generic.js'
import { isGalaxyElement } from '../utils/type-check.js'

const EVENT_TOKEN = '@'
const EVENT_MODIFIER_TOKEN = '.'

export function isEvent ({ name }) {
  return name.startsWith(EVENT_TOKEN)
}

export default function event ({ name }, { element, scope, isolated }) {
  const expression = getAttr(element, name)
  const evaluator = compileScopedEvaluator(rewriteMethods(expression))

  const parsed = parseEvent(name)
  const { modifiers } = parsed

  let attachMethod = 'addEventListener'

  let actual
  let handler = event => {
    // Externalize event
    scope.$event = event

    evaluator(scope, isolated)

    scope.$event = null
  }

  if (modifiers.self) {
    actual = handler
    handler = event => {
      if (event.target === event.currentTarget) {
        actual(event)
      }
    }
  }

  if (modifiers.prevent) {
    actual = handler
    handler = event => {
      event.preventDefault()
      actual(event)
    }
  }

  if (isGalaxyElement(element)) {
    attachMethod = `$on${modifiers.once ? 'ce' : ''}`
  } else if (modifiers.once) {
    actual = handler
    handler = event => {
      element.removeEventListener(parsed.name, handler)
      actual(event)
    }
  }

  element[attachMethod](parsed.name, handler)
}

function parseEvent (name) {
  const modifiers = {}
  const segments = name.split(EVENT_MODIFIER_TOKEN)

  // Setup modifiers
  if (segments.length > 1) {
    for (let i = 1; i < segments.length; i++) {
      modifiers[segments[i]] = true
    }
  }

  return {
    name: segments[0].slice(1)/* Skip @ */,
    modifiers
  }
}
