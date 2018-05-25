import { html } from '../../dist/galaxy.js'

export default html`
  <style>
  :host .tomato {
      background: tomato;
    }
  </style>

  <h1 :id="title" class="classes other-class" :class="{ someClass: showClass }">{{ title | reverse }}</h1>
  <input type="text" *bind="title">

  <ul>
    <li>Wrapped (Start)</li>
    <li *for="todo in todos">
      {{ todo.name }}
      <input ::ref="'done' + $index" id="done-{{ $index }}" type="checkbox" @change="setTodoStatus(todo, $refs.get('done' + $index))">
      <button @click="removeTodo(todo)">&times;</button>
    </li>
    <li>Wrapped (End)</li>
  </ul>

  <h2>Letters</h2>

  <ul>
    <li *for="letter in letters">{{ $index + 1 }}. {{ letter }}</li>
  </ul>

  <div>
    <input type="text" *bind="todo.name">
    <button @click="console.log('Adding todo') || addTodo()">Add TODO</button>
  </div>

  <!-- Escaped -->

  <test-props @click.once="console.log($event)" .object="letters" .string="'Hello ' + title">
    <h1 slot="title">Named slot: {{ html }}</h1>
  </test-props>
`
