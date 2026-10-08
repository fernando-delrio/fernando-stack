import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

// Reglas de la norma de estilo de fernando-stack que la máquina puede comprobar.
// El número entre paréntesis es la regla de la norma; (9) es la guía de refactorización.
// Plantilla de fernando-stack: copiar en frontend/ y ajustar las rutas de intentar.ts si cambian.
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

const normaDeFernando = {
  'no-var': 'error',
  'prefer-const': 'error',
  'func-style': ['error', 'expression'], // (2) arrow functions con nombre
  'prefer-arrow-callback': 'error', // (2)
  'no-restricted-syntax': ['error', ...sintaxisProhibida, ...sinCatch],
  'no-nested-ternary': 'error', // (4) una condición, una decisión
  'max-depth': ['error', 2], // (9) tres niveles de if anidados piden guardas
  'max-params': ['error', 3], // (9) cuatro parámetros o más piden un objeto
  'id-length': ['error', { min: 2 }], // (3) nada de e, o, x, i
  '@typescript-eslint/naming-convention': [
    'error',
    {
      selector: 'typeParameter',
      format: ['PascalCase'],
      custom: { regex: '^[A-Z][a-z]', match: true }, // (3) <Respuesta>, nunca <T>
    },
  ],
}

// (9) «funciones de más de unas 20 líneas»: 20 para la lógica; los componentes cuentan también su JSX.
const lineasDeLogica = { max: 20, skipBlankLines: true, skipComments: true }
const lineasDeComponente = { max: 40, skipBlankLines: true, skipComments: true }

export default tseslint.config(
  { ignores: ['dist'] },
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
