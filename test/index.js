import * as Galaxy from '../dist/galaxy.js'

import TestProps from './test-props.js'
import TodoApp from './todo-app/definition.js'

Galaxy.setup({

  // Ready for prod
  debug: false,

  elements: [

    // Correct elements registration
    // From childs -> parents
    TestProps,
    TodoApp
  ]
})
