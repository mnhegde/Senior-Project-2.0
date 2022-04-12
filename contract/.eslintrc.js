module.exports = {
    env: {
        node: true,
        mocha: true
    },
    parserOptions: {
        ecmaVersion: 8,
        sourceType: 'script'
    },
    extends: "eslint:recommended",
    rules: {
        indent: ['error', 2],
        quotes: ['error', 'single'],
        semi: ['error', 'always'],
        'no-unused-vars': ['error', { args: 'none' }],
        'no-console': 'off',
        curly: 'error',
        eqeqeq: 'error',
        'no-throw-literal': 'error',
        strict: 'error',
        'no-var': 'error',
        'dot-notation': 'error',
        'no-tabs': 'error',
        'no-use-before-define': 'error',
        'no-useless-call': 'error',
        'no-with': 'error',
        'operator-linebreak': 'error',
        yoda: 'error',
        'quote-props': ['error', 'as-needed']
    }
};
