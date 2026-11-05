// Checker for projects without ESLint or Ruff configured. It works line by line without really
// parsing the code: it can be fooled by long strings or docstrings, so it only warns about what the
// rules forbid without exception, about indentation and about names.
import { readFileSync } from 'node:fs'
import { basename, extname } from 'node:path'

const MAX_BLOCK_LEVELS = 1
const TRY_WARNING = 'try/catch outside attempt(): use attempt() and a guard'
const EXCEPT_WARNING = 'except outside attempt.py: use attempt() and a guard'
const DEPTH_WARNING = 'more than one level of blocks: extract a function'

const TS_RULES = [
  { pattern: /\belse\b/, warning: 'else: use a guard or a named function' },
  { pattern: /\bswitch\s*\(/, warning: 'switch: use a table (an object of values or functions)' },
  { pattern: /\s\?\s[^:]+\s:\s/, warning: 'ternary: use a function with guards or a table' },
  { pattern: /\bfunction\b/, warning: 'function: use a named arrow function' },
  { pattern: /\bexport\s+default\b/, warning: 'export default: use export const' },
  { pattern: /\btry\s*\{|\.catch\(/, warning: TRY_WARNING },
  { pattern: /\b(const|let)\s+[a-z]+_[a-z0-9_]*\s*=/, warning: 'snake_case in TypeScript: use camelCase' },
  { pattern: /\b(interface|type|class|enum)\s+[a-z]/, warning: 'types, classes, interfaces and enums in PascalCase' },
  { pattern: /<[A-Z]\s*[,>]/, warning: 'one-letter generic: give it a name (<Response>, <Data>)' },
  { pattern: /\bvar\s/, warning: 'var: use const' },
]

const PY_RULES = [
  { pattern: /^\s*(else|elif)\b/, warning: 'else/elif: use a guard or a named function' },
  { pattern: /^\s*match\s+.+:\s*$/, warning: 'match: use a dictionary of values or functions' },
  { pattern: /\sif\s.+\selse\s/, warning: 'ternary: use a function with guards or a dictionary' },
  { pattern: /^\s*except\b/, warning: EXCEPT_WARNING },
  { pattern: /^\s*(async\s+)?def\s+(?![a-z_][a-z0-9_]*\s*[([])/, warning: 'functions in snake_case' },
  { pattern: /^\s*class\s+(?![A-Z][A-Za-z0-9]*\b)/, warning: 'classes in PascalCase' },
  { pattern: /^\s*[a-z]+[A-Z]\w*\s*=(?!=)/, warning: 'camelCase in Python: use snake_case' },
]

// The error rules do not apply to the file that exists to catch errors.
const ATTEMPT_FILES = new Set(['attempt.ts', 'attempt.js', 'attempt.mjs', 'attempt.py'])
const ERROR_WARNINGS = new Set([TRY_WARNING, EXCEPT_WARNING])

const LANGUAGE_BY_EXTENSION = {
  '.ts': 'ts',
  '.tsx': 'ts',
  '.js': 'ts',
  '.jsx': 'ts',
  '.mjs': 'ts',
  '.py': 'py',
}

const SYNTAX = {
  ts: {
    rules: TS_RULES,
    comment: /\/\/.*$/,
    opensBlock: /^\s*(\}\s*)?(if|for|while|do|try|catch|finally|else)\b/,
    opensFunction: /(=>\s*\{|\bfunction\b.*\{)\s*$/,
    allowsDepth: /eslint-disable(-next)?-line\s+[^-]*\bmax-depth\b.*--\s+\S/,
  },
  py: {
    rules: PY_RULES,
    comment: /#.*$/,
    opensBlock: /^\s*(if|elif|else|for|while|try|except|finally|with|async\s+(for|with))\b.*:\s*(#.*)?$/,
    opensFunction: /^\s*(async\s+)?def\s/,
    allowsDepth: /#\s*style:\s*allow\s+depth\s+--\s+\S/,
  },
}

const TEXT_STRING = /(["'`])(?:\\.|(?!\1).)*\1/g

const withoutStringsAndComments = (line, syntax) =>
  line.replace(TEXT_STRING, '""').replace(syntax.comment, '')

const indentOf = (line) => line.length - line.trimStart().length

const isWarningApplicable = (path) => (warning) =>
  !ATTEMPT_FILES.has(basename(path)) || !ERROR_WARNINGS.has(warning)

const warningsOfRules = (code, syntax, path) =>
  syntax.rules
    .filter(({ pattern }) => pattern.test(code))
    .map(({ warning }) => warning)
    .filter(isWarningApplicable(path))

// Counts the blocks open since the last function: a new function starts at zero,
// like ESLint's max-depth.
const levelsInsideFunction = (open) =>
  open.length - open.findLastIndex((block) => block.isFunction) - 1

// A mark above a function covers the whole function; above a block, only that block.
const blockOfLine = (code, indent, { syntax, isAllowed }) => {
  if (syntax.opensFunction.test(code)) return { indent, isFunction: true, isAllowed }
  if (syntax.opensBlock.test(code)) return { indent, isFunction: false, isAllowed }
  return null
}

const isFunctionAllowed = (open) => Boolean(open.findLast((block) => block.isFunction)?.isAllowed)

const isTooDeep = (block, open) =>
  Boolean(block) &&
  !block.isFunction &&
  !block.isAllowed &&
  !isFunctionAllowed(open) &&
  levelsInsideFunction(open) >= MAX_BLOCK_LEVELS

const advanceLine = (syntax, name) => (state, { text, previous, number }) => {
  const code = withoutStringsAndComments(text, syntax)
  if (!code.trim()) return state
  const indent = indentOf(text)
  const open = state.stack.filter((block) => block.indent < indent)
  const isAllowed = syntax.allowsDepth.test(previous)
  const block = blockOfLine(code, indent, { syntax, isAllowed })
  const depthWarning = isTooDeep(block, open) && DEPTH_WARNING
  const warnings = [...warningsOfRules(code, syntax, name), depthWarning].filter(Boolean)
  return {
    stack: [...open, block].filter(Boolean),
    warnings: [...state.warnings, ...warnings.map((warning) => ({ name, from: number, to: number, text: warning }))],
  }
}

const numberedLines = (content) =>
  content.split(/\r?\n/).map((text, position, lines) => ({
    text,
    previous: lines[position - 1] ?? '',
    number: position + 1,
  }))

// name is the path the agent will see, normally relative to the repo root. Each warning carries
// its lines (from, to) so the hook keeps only the ones that touch what changed.
export const checkFile = ({ path, name }) => {
  const syntax = SYNTAX[LANGUAGE_BY_EXTENSION[extname(path)]]
  if (!syntax) return []
  const lines = numberedLines(readFileSync(path, 'utf8'))
  return lines.reduce(advanceLine(syntax, name), { stack: [], warnings: [] }).warnings
}
