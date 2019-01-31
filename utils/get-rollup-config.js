/* eslint-disable import/no-extraneous-dependencies */
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import replace from 'rollup-plugin-replace'
import filesize from 'rollup-plugin-filesize'
import minify from 'rollup-plugin-babel-minify'

export default name => ({
  input: 'src/index.js',
  output: {
    name,
    file: 'lib/index.js',
    format: 'umd',
    sourcemap: true,
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV), // For Invariant
    }),
    babel({
      ignore: ['node_modules/**'],
      presets: [['@babel/env', { targets: { chrome: 55 }, modules: false }], '@babel/preset-react'],
      plugins: [
        '@babel/plugin-proposal-class-properties',
        ['@babel/plugin-transform-react-jsx', { pragma: 'h' }],
      ],
    }),
    resolve(),
    commonjs(),
    process.env.NODE_ENV === 'production' && minify({ sourceMap: false }),
    process.env.NODE_ENV === 'production' && filesize(),
  ],
})
