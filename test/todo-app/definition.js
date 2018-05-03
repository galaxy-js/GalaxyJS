import { GalaxyElement } from '../../dist/galaxy.js'
import template from './template.js'

export default class TodoApp extends GalaxyElement {
  constructor () {
    super()

    this.state = {
      showClass: false,
      title: 'Galaxy TODO APP',

      todo: {
        name: 'Testing Galaxy',
        done: false
      },

      todos: [
        {
          name: 'Make good things',
          done: false
        }
      ],

      letters: [
        'c', 'b', 'w',
        'j', 'z', 'a',
        'k', 'x', 'y'
      ],

      html: `
        <h2>Dynamic</h2>
        <p>Rendering HTML</p>
      `
    }

    setTimeout(() => {
      this.state.showClass = true
    }, 5000)
  }

  static get is () {
    return 'todo-app'
  }

  onCreated () {
    this.$channel.on('test-props', console.log)

    setTimeout(() => {
      this.state.letters.sort()
    }, 5000)
  }

  reverse (value) {
    return value.split('').reverse().join('')
  }

  addTodo ({ todos, todo }) {
    todos.push(Object.assign({}, todo))

    todo.name = ''
  }

  removeTodo ({ todos }, todo) {
    todos.splice(todos.indexOf(todo), 1)
  }

  setTodoStatus (_, todo, done) {
    todo.done = done.checked
  }
}

// Static template
TodoApp.template = template
