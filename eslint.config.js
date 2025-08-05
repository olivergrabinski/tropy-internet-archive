const js = require('@eslint/js')

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        fetch: 'readonly'
      }
    },
    rules: {
      'array-bracket-spacing': 'error',
      'block-spacing': 'error',
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'comma-dangle': 'error',
      'comma-spacing': 'error',
      'comma-style': 'error',
      'complexity': ['warn', 16],
      'dot-location': ['error', 'property'],
      'eqeqeq': ['error', 'smart'],
      'indent': ['error', 2, { SwitchCase: 1 }],
      'key-spacing': ['warn', { beforeColon: false, afterColon: true }],
      'keyword-spacing': 'error',
      'max-depth': ['warn', 6],
      'max-len': ['warn', 100, 2, {
        ignoreComments: true,
        ignoreUrls: true,
        ignorePattern: '[`\'"./],?$'
      }],
      'max-nested-callbacks': ['warn', 4],
      'no-caller': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-mixed-spaces-and-tabs': 'error',
      'no-multi-str': 'error',
      'no-shadow': ['error', {
        allow: ['done', 'reject', 'resolve', 'conn', 'cb', 'err', 'error']
      }],
      'no-trailing-spaces': 'error',
      'no-unexpected-multiline': 'error',
      'no-unneeded-ternary': 'error',
      'no-unreachable': 'error',
      'no-useless-concat': 'error',
      'no-unsafe-finally': 'off',
      'object-curly-spacing': ['error', 'always'],
      'operator-linebreak': ['error', 'after'],
      'quote-props': ['error', 'consistent-as-needed'],
      'quotes': ['error', 'single', 'avoid-escape'],
      'radix': 'error',
      'require-atomic-updates': 'off',
      'semi-spacing': 'off',
      'semi': ['error', 'never'],
      'space-before-blocks': 'error',
      'space-before-function-paren': ['error', {
        anonymous: 'always',
        named: 'never'
      }],
      'space-infix-ops': 'error',
      'space-unary-ops': 'error',
      'space-in-parens': 'error'
    }
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly'
      }
    },
    rules: {
      'no-console': 'off',
      'max-nested-callbacks': ['warn', 8]
    }
  }
]