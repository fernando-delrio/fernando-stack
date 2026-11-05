import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

// The readfirst style rules that a machine can check.
// The number in parentheses is the rule number; (9) is the refactoring guide.
// readfirst template: copy it to frontend/ and adjust the attempt.ts paths if they change.
//
// Exceptions only where following the rule makes the code harder to read, with the reason on the same line:
//   // eslint-disable-next-line max-depth -- <reason>
// no-restricted-syntax, no-ternary, func-style and no-var admit no exceptions: the plugin's
// stop hook and the conventions-reviewer agent watch them.
const forbiddenSyntax = [
  {
    selector: 'IfStatement[alternate]',
    message: 'No else (rule 4): use a guard or extract a named function.',
  },
  {
    selector: 'FunctionExpression',
    message: 'Arrow functions always (rule 2): const name = () => {}.',
  },
  { selector: 'ExportDefaultDeclaration', message: 'Always export const (rule 13).' },
  { selector: 'SwitchStatement', message: 'No switch (rule 16): use a table.' },
]

// (17) Errors are caught only in core/lib/attempt.ts.
const noCatch = [
  {
    selector: 'TryStatement',
    message: 'No try/catch (rule 17): use attempt() from core/lib/attempt.ts and a guard.',
  },
  {
    selector: "CallExpression[callee.property.name='catch']",
    message: 'No .catch() (rule 17): use attempt() from core/lib/attempt.ts and a guard.',
  },
]

// (3) PascalCase what is instantiated or rendered, camelCase what is executed or stored and
// UPPER_CASE fixed values. Properties are not checked: the API contract sets them.
const names = [
  { selector: 'typeLike', format: ['PascalCase'] },
  {
    selector: 'typeParameter',
    format: ['PascalCase'],
    custom: { regex: '^[A-Z][a-z]', match: true }, // <Response>, never <T>
  },
  { selector: 'enumMember', format: ['PascalCase'] },
  { selector: 'variable', modifiers: ['destructured'], format: null },
  {
    selector: 'variable',
    modifiers: ['const', 'global'],
    format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
  },
  { selector: 'variable', format: ['camelCase', 'PascalCase'] },
  { selector: 'function', format: ['camelCase', 'PascalCase'] },
  { selector: 'parameter', format: ['camelCase', 'PascalCase'], leadingUnderscore: 'allow' },
]

const readfirstRules = {
  'no-var': 'error',
  'prefer-const': 'error',
  'func-style': ['error', 'expression'], // (2) named arrow functions
  'prefer-arrow-callback': 'error', // (2)
  'no-restricted-syntax': ['error', ...forbiddenSyntax, ...noCatch],
  'no-ternary': 'error', // (4) a function with guards or a table
  'max-depth': ['error', 1], // (9) one level of blocks; anything deeper goes to another function
  'max-params': ['error', 3], // (9) four or more parameters call for an object
  'id-length': ['error', { min: 2 }], // (3) no e, o, x, i
  '@typescript-eslint/naming-convention': ['error', ...names],
}

// (9) "functions of more than about 20 lines": 20 for logic; components also count their JSX.
const logicLines = { max: 20, skipBlankLines: true, skipComments: true }
const componentLines = { max: 40, skipBlankLines: true, skipComments: true }

export default tseslint.config(
  { ignores: ['dist'] },
  // An exception that is no longer needed goes away.
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      prettierConfig,
    ],
    languageOptions: { globals: globals.browser },
    rules: { ...readfirstRules, 'max-lines-per-function': ['error', logicLines] },
  },
  {
    files: ['src/**/*.tsx'],
    rules: { 'max-lines-per-function': ['error', componentLines] },
  },
  {
    files: ['src/modules/core/lib/attempt.ts'],
    rules: { 'no-restricted-syntax': ['error', ...forbiddenSyntax] },
  },
  {
    // A describe only groups tests and grows with each one; the tests inside stay short.
    files: ['src/**/*.test.{ts,tsx}'],
    rules: { 'max-lines-per-function': 'off' },
  }
)
