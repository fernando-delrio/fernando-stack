import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

// Reglas de la norma de estilo de fernando-stack que la máquina puede comprobar.
// El número entre paréntesis es la regla de la norma; (9) es la guía de refactorización.
// Plantilla de fernando-stack: copiar en frontend/ y ajustar las rutas de intentar.ts si cambian.
//
// Excepciones solo donde cumplir la regla empeora la lectura, y con su porqué en la misma línea:
//   // eslint-disable-next-line max-depth -- <porqué>
// no-restricted-syntax, no-ternary, func-style y no-var no admiten excepciones: lo vigilan el
// hook de cierre del plugin y el agente conventions-reviewer.
const sintaxisProhibida = [
  {
    selector: 'IfStatement[alternate]',
    message: 'Sin else (regla 4): usa una guarda o extrae una función con nombre.',
  },
  {
    selector: 'FunctionExpression',
    message: 'Arrow functions siempre (regla 2): const nombre = () => {}.',
  },
  { selector: 'ExportDefaultDeclaration', message: 'Siempre export const (regla 13).' },
  { selector: 'SwitchStatement', message: 'Sin switch (regla 16): usa una tabla.' },
]

// (17) Los errores se recogen solo en core/lib/intentar.ts.
const sinCatch = [
  {
    selector: 'TryStatement',
    message: 'Sin try/catch (regla 17): usa intentar() de core/lib/intentar.ts y una guarda.',
  },
  {
    selector: "CallExpression[callee.property.name='catch']",
    message: 'Sin .catch() (regla 17): usa intentar() de core/lib/intentar.ts y una guarda.',
  },
]

// (3) PascalCase lo que se instancia o se renderiza, camelCase lo que se ejecuta o se guarda y
// UPPER_CASE los valores fijos. Las propiedades no se comprueban: las fija el contrato de la API.
const nombres = [
  { selector: 'typeLike', format: ['PascalCase'] },
  {
    selector: 'typeParameter',
    format: ['PascalCase'],
    custom: { regex: '^[A-Z][a-z]', match: true }, // <Respuesta>, nunca <T>
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

const normaDeFernando = {
  'no-var': 'error',
  'prefer-const': 'error',
  'func-style': ['error', 'expression'], // (2) arrow functions con nombre
  'prefer-arrow-callback': 'error', // (2)
  'no-restricted-syntax': ['error', ...sintaxisProhibida, ...sinCatch],
  'no-ternary': 'error', // (4) una función con guardas o una tabla
  'max-depth': ['error', 1], // (9) un solo nivel de bloques; lo que pida más, a otra función
  'max-params': ['error', 3], // (9) cuatro parámetros o más piden un objeto
  'id-length': ['error', { min: 2 }], // (3) nada de e, o, x, i
  '@typescript-eslint/naming-convention': ['error', ...nombres],
}

// (9) «funciones de más de unas 20 líneas»: 20 para la lógica; los componentes cuentan también su JSX.
const lineasDeLogica = { max: 20, skipBlankLines: true, skipComments: true }
const lineasDeComponente = { max: 40, skipBlankLines: true, skipComments: true }

export default tseslint.config(
  { ignores: ['dist'] },
  // Una excepción que ya no hace falta, fuera.
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
    rules: { ...normaDeFernando, 'max-lines-per-function': ['error', lineasDeLogica] },
  },
  {
    files: ['src/**/*.tsx'],
    rules: { 'max-lines-per-function': ['error', lineasDeComponente] },
  },
  {
    files: ['src/modules/core/lib/intentar.ts'],
    rules: { 'no-restricted-syntax': ['error', ...sintaxisProhibida] },
  },
  {
    // Un describe solo agrupa pruebas y crece con cada una; las pruebas de dentro siguen siendo cortas.
    files: ['src/**/*.test.{ts,tsx}'],
    rules: { 'max-lines-per-function': 'off' },
  }
)
