// readfirst Stop hook. When a turn ends with code changes, it reviews only the lines that changed
// (a new file, entirely), so old code touched in passing does not have to be redone.
//   - Repo with the rules (it has their templates): formatter, linter and the style test; whatever
//     fails goes back to Claude to fix, at most MAX_ATTEMPTS times, and then it warns and stops.
//   - Repo without the rules: light checker, formats nothing; it only warns the user, never blocks.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'
import { attempt } from './attempt.mjs'
import { checkExceptions } from './exceptions.mjs'
import { ALL_LINES, changedFiles, changedLines, PY_EXTENSIONS, repoRoot, TS_EXTENSIONS } from './git.mjs'
import { checkFile } from './light-checker.mjs'
import { aiTraces, nameInRepo, reviewPython, reviewTypeScript, STYLE_TEST, withName } from './tools.mjs'

// Claude Code only cuts a Stop hook after 8 blocks in a row with no tool use in between; since
// fixing uses tools, that cap never stops this hook and it needs its own.
const MAX_ATTEMPTS = 2
const MAX_WARNINGS_IN_MESSAGE = 40
// Claude Code trims what a hook returns to 10,000 characters.
const MAX_CHARACTERS = 9_000
const RULES_MARK = /readfirst/
const FILES_THAT_MARK_THE_RULES = ['ruff.toml', 'eslint.config.js', join('frontend', 'eslint.config.js')]
const HOW_TO_EXCEPT =
  'If a rule makes the code harder to read: `// eslint-disable-next-line <rule> -- <reason>` or `# style: allow <rule> -- <reason>`. ' +
  'else, ternaries, switch/match, try outside attempt, function and export default admit no exception.'

const readInput = async () => Buffer.concat(await Array.fromAsync(process.stdin)).toString('utf8')

const fingerprintOf = (text) => createHash('sha1').update(text).digest('hex')

const temporaryFile = (kind, key) => join(tmpdir(), `readfirst-${kind}-${fingerprintOf(String(key)).slice(0, 12)}.txt`)

const readIfExists = (path) => existsSync(path) && readFileSync(path, 'utf8')

const fingerprintOfChanges = (files) =>
  fingerprintOf(files.map((path) => `${path}\n${readFileSync(path, 'utf8')}`).join('\n'))

const isAlreadyReviewed = (root, fingerprint) => readIfExists(temporaryFile('stop', root)) === fingerprint

const attemptsDone = (session) => Number(readIfExists(temporaryFile('attempts', session)) || 0)

// stop_hook_active means a Stop hook already extended this turn: attempts keep being counted.
const attemptsOfTurn = (input, session) => {
  if (!input.stop_hook_active) return 0
  return attemptsDone(session)
}

const mentionsTheRules = (root) => (file) => RULES_MARK.test(readIfExists(join(root, file)) || '')

export const isRepoWithRules = (root) =>
  existsSync(join(root, STYLE_TEST)) || FILES_THAT_MARK_THE_RULES.some(mentionsTheRules(root))

const isOf = (extensions) => (path) => extensions.has(extname(path))

const reviewWithRules = (root, files) => [
  ...reviewTypeScript(root, files.filter(isOf(TS_EXTENSIONS))),
  ...reviewPython(root, files.filter(isOf(PY_EXTENSIONS))),
]

const review = (root, files, isWithRules) => {
  const common = [...files.map(withName(root)).flatMap(checkExceptions), ...aiTraces(root, files)]
  if (isWithRules) return [...common, ...reviewWithRules(root, files)]
  return [...common, ...files.map(withName(root)).flatMap(checkFile)]
}

const isInLines = (ranges) => (warning) =>
  warning.isGeneral ||
  ranges === ALL_LINES ||
  ranges.some(([from, to]) => warning.from <= to && warning.to >= from)

const rangesByFile = (root, files) =>
  new Map(files.map((path) => [nameInRepo(root, path), changedLines(root, path)]))

// Only what touches a changed line of a changed file counts; the rest is old code.
const onlyWhatChanged = (warnings, ranges) =>
  warnings.filter((warning) => warning.isGeneral || (ranges.has(warning.name) && isInLines(ranges.get(warning.name))(warning)))

const lineOfWarning = ({ name, from, text, isGeneral }) => {
  if (isGeneral) return text
  return `${name}:${from}: ${text}`
}

const listOfWarnings = (warnings) => {
  const lines = warnings.slice(0, MAX_WARNINGS_IN_MESSAGE).map(lineOfWarning)
  const rest = warnings.length - lines.length
  return [...lines, rest > 0 && `… and ${rest} more`].filter(Boolean).join('\n').slice(0, MAX_CHARACTERS)
}

const respond = (output) => process.stdout.write(JSON.stringify(output))

const save = (kind, key, content) => writeFileSync(temporaryFile(kind, key), String(content))

const forgetAttempts = (session) => rmSync(temporaryFile('attempts', session), { force: true })

const sendBackToClaude = ({ warnings, attempts, session }) => {
  save('attempts', session, attempts + 1)
  respond({
    systemMessage: `Style rules: ${warnings.length} warnings in what changed; Claude fixes them (attempt ${attempts + 1} of ${MAX_ATTEMPTS}).`,
    hookSpecificOutput: {
      hookEventName: 'Stop',
      additionalContext: `The readfirst style rules find this in the lines you changed. Fix it before finishing. ${HOW_TO_EXCEPT}\n\n${listOfWarnings(warnings)}`,
    },
  })
}

const giveUpAndWarn = ({ warnings, session }) => {
  forgetAttempts(session)
  respond({
    systemMessage: `Style rules: after ${MAX_ATTEMPTS} attempts, ${warnings.length} warnings remain unfixed in what changed. Claude has stopped; review them:\n${listOfWarnings(warnings)}`,
  })
}

const onlyWarn = ({ warnings }) =>
  respond({ systemMessage: `Style rules (repo without the rules, warning only): ${warnings.length} warnings in what changed:\n${listOfWarnings(warnings)}` })

const decide = (situation) => {
  const { warnings, isWithRules, attempts, session, root, fingerprint } = situation
  if (warnings.length === 0) return forgetAttempts(session)
  if (!isWithRules) return onlyWarn(situation)
  if (attempts < MAX_ATTEMPTS) return sendBackToClaude(situation)
  // Whatever was given up on is not retried until the files change.
  save('stop', root, fingerprint)
  giveUpAndWarn(situation)
}

const checkOnStop = async () => {
  const { value: input } = attempt(JSON.parse.bind(null, await readInput()))
  const root = input && repoRoot(input.cwd ?? process.cwd())
  if (!root) return
  const files = changedFiles(root)
  const fingerprint = fingerprintOfChanges(files)
  if (files.length === 0 || isAlreadyReviewed(root, fingerprint)) return
  const isWithRules = isRepoWithRules(root)
  const warnings = onlyWhatChanged(review(root, files, isWithRules), rangesByFile(root, files))
  const session = input.session_id ?? root
  const attempts = attemptsOfTurn(input, session)
  // Green, or already warned in a repo without the rules: not repeated until the files change.
  const isReviewClosed = warnings.length === 0 || !isWithRules
  if (isReviewClosed) save('stop', root, fingerprint)
  decide({ warnings, isWithRules, attempts, session, root, fingerprint })
}

checkOnStop()
