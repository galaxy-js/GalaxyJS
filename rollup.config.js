export default {
  input: './src/index.js',

  output: {
    format: 'es',
    file: './dist/galaxy.js'
  },

  /**
   * @see https://github.com/rollup/rollup/issues/1185#issuecomment-384631306
   */
  acorn: {
    plugins: {
      classFields: true
    }
  },

  acornInjectPlugins: [
    require('acorn-class-fields/inject')
  ]
}
