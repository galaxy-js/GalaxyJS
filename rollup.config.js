import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

export default {
  input: './src/index.js',

  output: [
    {
      file: './dist/galaxy.esm.js',
      format: 'es'
    },
    {
      file: './dist/galaxy.umd.js',
      format: 'umd',
      name: 'Galaxy'
    }
  ],

  plugins: [
    resolve(),
    commonjs()
  ],

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
