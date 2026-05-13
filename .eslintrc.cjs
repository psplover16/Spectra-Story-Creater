/* eslint-env node */
module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2022,
    sourceType: 'module',
    extraFileExtensions: ['.vue'],
  },
  plugins: ['@typescript-eslint', 'vue'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
  ],
  rules: {
    'vue/multi-word-component-names': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'dist-electron/',
    'release/',
    'coverage/',
    'openspec/',
    '_private/',
    '.spectra/',
    '*.config.cjs',
  ],
}
