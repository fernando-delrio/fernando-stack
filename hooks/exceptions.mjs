// The style rules allow local exceptions when a rule makes the code harder to read, always with the
// reason on the same line. Some rules allow none because a readable alternative always exists.
import { readFileSync } from 'node:fs'
import { extname } from 'node:path'

// no-restricted-syntax carries else, function, export default, switch and try/catch.
const ESLINT_RULES_WITHOUT_EXCEPTION = new Set([
  'no-restricted-syntax',
  'no-ternary',
  'no-nested-ternary',
  'func-style',
  'prefer-arrow-callback',
  'no-var',
])
const PYTHON_RULES_WITH_EXCEPTION = new Set(['depth', 'lines', 'params'])

const ESLINT_DISABLE = /eslint-disable(?:-next-line|-line)?(?<rules>[^*\n]*?)(?:\s--\s(?<reason>.*))?\s*(?:\*\/)?\s*$/
const STYLE_MARK = /#\s*style:\s*allow\s+(?<rule>[\w-]+)(?:\s+--\s+(?<reason>\S.*))?/
const NOQA = /#\s*noqa\b(?<rest>.*)$/

const rulesOf = (text) => text.split(',').map((rule) => rule.trim()).filter(Boolean)

const warningsOfEslint = ({ rules, reason }) => [
  rulesOf(rules).length === 0 && 'eslint-disable without a rule: say which rule is disabled',
  !reason?.trim() && 'exception without a reason: add " -- <reason>"',
  rulesOf(rules).some((rule) => ESLINT_RULES_WITHOUT_EXCEPTION.has(rule)) &&
    'that rule admits no exceptions (else, ternaries, switch, try/catch, function, export default)',
]

const warningsOfMark = ({ rule, reason }) => [
  !PYTHON_RULES_WITH_EXCEPTION.has(rule) && `"${rule}" admits no exceptions; only depth, lines or params`,
  !reason && 'exception without a reason: add " -- <reason>"',
]

const warningsOfNoqa = ({ rest }) => [
  !/:\s*[A-Z]+\d+/.test(rest) && 'noqa without a code: say which Ruff rule is disabled',
  !/\s--\s+\S/.test(rest) && 'exception without a reason: add " -- <reason>"',
]

const CHECKS = {
  ts: [{ pattern: ESLINT_DISABLE, warnings: warningsOfEslint }],
  py: [
    { pattern: STYLE_MARK, warnings: warningsOfMark },
    { pattern: NOQA, warnings: warningsOfNoqa },
  ],
}

const LANGUAGE_BY_EXTENSION = { '.ts': 'ts', '.tsx': 'ts', '.js': 'ts', '.jsx': 'ts', '.mjs': 'ts', '.py': 'py' }

const warningsIfMatches = (checks) => (text) =>
  checks
    .filter(({ pattern }) => pattern.test(text))
    .flatMap(({ pattern, warnings }) => warnings(text.match(pattern).groups))
    .filter(Boolean)

export const checkExceptions = ({ path, name }) => {
  const checks = CHECKS[LANGUAGE_BY_EXTENSION[extname(path)]]
  if (!checks) return []
  const warningsOf = warningsIfMatches(checks)
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .flatMap((line, position) =>
      warningsOf(line).map((text) => ({ name, from: position + 1, to: position + 1, text }))
    )
}
