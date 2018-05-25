import { compileScopedEvaluator, getEvent } from '../../compiler/index.js'

import { getAttr } from '../../utils/generic.js'
import { isGalaxyElement } from '../../utils/type-check.js'

const EVENT_TOKEN = '@'
const EVENT_MODIFIER_TOKEN = '.'

export function isEvent ({ name }) {
  return name.startsWith(EVENT_TOKEN)
}

export default function event ({ name }, context) {
  const $el = context.element

  const expression = getAttr($el, name)
  const evaluator = compileScopedEvaluator(getEvent(expression), context)

  const parsed = parseEvent(name)
  const { modifiers } = parsed

  let attachMethod = 'addEventListener'

  let actual
  let handler = event => {
    // Externalize event
    context.scope.$event = event

    evaluator()

    context.scope.$event = null
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

  if (isGalaxyElement($el)) {
    attachMethod = `$on${modifiers.once ? 'ce' : ''}`
  } else if (modifiers.once) {
    actual = handler
    handler = event => {
      $el.removeEventListener(parsed.name, handler)
      actual(event)
    }
  }

  $el[attachMethod](parsed.name, handler)
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
