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

  onCreated () {
    setTimeout(() => {
      this.state.letters.sort()
    }, 5000)
  }

  addTodo ({ todos, todo }) {
    todos.push(Object.assign({}, todo))

    todo.name = ''
  }

  removeTodo ({ todos }, todo) {
    todos.splice(todos.indexOf(todo), 1)
    console.log('Removed todo:', todo)
  }

  sortTodos ({ todos }) {
    todos.sort((a, b) => (
      a.name > b.name ? -1 :
      a.name < b.name ? 1 : 0
    ))
  }

  showStatus () {
    console.log('Todos:', JSON.parse(JSON.stringify(this.state.todos)))
  }
}

// Static template
TodoApp.template = template
