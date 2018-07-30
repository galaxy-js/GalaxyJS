import * as Galaxy from '../dist/galaxy.esm.js'

import TestProps from './test-props.js'
import TodoApp from './todo-app/definition.js'

Galaxy.setup({

  // Ready for prod
  debug: true,

  plugins: {
    test: {
      $test: 'plugins working!'
    }
  },

  filters: {
    reverse (value, ...args) {
      return value.split('').reverse().join('')
    }
  },

  elements: [

    // Correct elements registration
    // From childs -> parents
    TestProps,
    TodoApp
  ]
})
