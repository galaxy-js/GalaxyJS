import * as Galaxy from '../dist/galaxy.esm.js'

import TodoApp from './todo-app/definition.js'

Galaxy.setup({

  root: TodoApp,

  // Ready for prod
  debug: true,

  plugins: {
    $test: 'plugins working!'
  },

  filters: {
    reverse (value, ...args) {
      return value.split('').reverse().join('')
    }
  }
})
