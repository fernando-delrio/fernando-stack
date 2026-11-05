// The project's tools in rules mode: they format and check the changed files and return each
// failure with its lines, so only the ones that touch what changed are kept.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { attempt } from './attempt.mjs'
import { checkFile } from './light-checker.mjs'
import { failureText, outputOf, run } from './run.mjs'

const ESLINT_CONFIGS = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts']
const ESLINT = join('node_modules', 'eslint', 'bin', 'eslint.js')
const PRETTIER = join('node_modules', 'prettier', 'bin', 'prettier.cjs')
export const STYLE_TEST = join('tests', 'test_style_rules.py')
// -vv without -q: with -q pytest trims long lists and locations would be lost.
const STYLE_TEST_ARGS = ['-vv', '--tb=short', '--no-header', '-p', 'no:cacheprovider']
const HOOK_FOLDER = dirname(fileURLToPath(import.meta.url))
const TRACE_FINDER = join(HOOK_FOLDER, '..', 'skills', 'clean-ai-traces', 'find_ai_traces.py')
const LOCATION_IN_TEST = /([\w./\\-]+\.py):(\d+)(?:-(\d+))?/g
const TEST_HEADER = /_{3,} (test_\w+) _{3,}/
const SUMMARY_START = /^=+ short test summary info =+/

export const nameInRepo = (root, path) => relative(root, path).replaceAll('\\', '/')

export const withName = (root) => (path) => ({ path, name: nameInRepo(root, path) })

// A warning that cannot be placed on a line (a broken tool) is always shown.
const generalWarning = (text) => ({ name: '', from: 0, to: Infinity, isGeneral: true, text })

const readJson = (text) => attempt(() => JSON.parse(text)).value

const searchUpwards = (folder, root, matches) => {
  if (matches(folder)) return folder
  if (folder === root || dirname(folder) === folder) return null
  return searchUpwards(dirname(folder), root, matches)
}

const hasEslint = (folder) =>
  existsSync(join(folder, ESLINT)) && ESLINT_CONFIGS.some((name) => existsSync(join(folder, name)))

const warningsOfEslint = (root) => (file) =>
  file.messages.map((message) => ({
    name: nameInRepo(root, file.filePath),
    from: message.line ?? 0,
    to: message.endLine ?? message.line ?? 0,
    text: `${message.message} (${message.ruleId ?? 'eslint'})`,
  }))

const lintFolder = (root) => ([folder, files]) => {
  run('node', [join(folder, PRETTIER), '--write', ...files], folder)
  const result = run('node', [join(folder, ESLINT), '-f', 'json', ...files], folder)
  const report = readJson(outputOf(result))
  if (!report && result.error) return [generalWarning(`ESLint could not check:\n${failureText(result.error)}`)]
  return (report ?? []).flatMap(warningsOfEslint(root))
}

export const reviewTypeScript = (root, files) => {
  const groups = Object.groupBy(files, (path) => searchUpwards(dirname(path), root, hasEslint) ?? '')
  const { '': withoutEslint = [], ...withEslint } = groups
  return [
    ...Object.entries(withEslint).flatMap(lintFolder(root)),
    ...withoutEslint.map(withName(root)).flatMap(checkFile),
  ]
}

export const projectPython = (root) =>
  [join(root, '.venv', 'Scripts', 'python.exe'), join(root, '.venv', 'bin', 'python')].find(existsSync)

const hasRuffConfig = (root) =>
  existsSync(join(root, 'ruff.toml')) ||
  (existsSync(join(root, 'pyproject.toml')) && readFileSync(join(root, 'pyproject.toml'), 'utf8').includes('[tool.ruff'))

const hasRuff = (root, python) =>
  Boolean(python) && hasRuffConfig(root) && !run(python, ['-m', 'ruff', '--version'], root).error

const warningOfRuff = (root) => (failure) => ({
  name: nameInRepo(root, failure.filename),
  from: failure.location?.row ?? 0,
  to: failure.end_location?.row ?? failure.location?.row ?? 0,
  text: `${failure.code}: ${failure.message} (Ruff)`,
})

const warningsOfRuff = (root, python, files) => {
  run(python, ['-m', 'ruff', 'format', ...files], root)
  const result = run(python, ['-m', 'ruff', 'check', '--output-format', 'json', ...files], root)
  const report = readJson(outputOf(result))
  if (!report && result.error) return [generalWarning(`Ruff could not check:\n${failureText(result.error)}`)]
  return (report ?? []).map(warningOfRuff(root))
}

// The test checks the whole repo; the rule (the test name) and the locations come from its output.
const warningsOfLine = (state, line) => {
  // The final summary repeats the locations under the last header: it is not read.
  if (state.isInSummary || SUMMARY_START.test(line)) return { ...state, isInSummary: true }
  const header = line.match(TEST_HEADER)
  if (header) return { ...state, test: header[1] }
  const warnings = [...line.matchAll(LOCATION_IN_TEST)].map(([, name, from, to]) => ({
    name: name.replaceAll('\\', '/'),
    from: Number(from),
    to: Number(to ?? from),
    text: `violates ${state.test} (tests/test_style_rules.py)`,
  }))
  return { ...state, warnings: [...state.warnings, ...warnings] }
}

const withoutRepeats = (warnings) => [...new Map(warnings.map((warning) => [JSON.stringify(warning), warning])).values()]

const warningsOfStyleTest = (root, python) => {
  if (!existsSync(join(root, STYLE_TEST))) return []
  const { error } = run(python, ['-m', 'pytest', STYLE_TEST, ...STYLE_TEST_ARGS], root)
  if (!error) return []
  // Drop the lines that point at the test itself and the final summary, which repeats locations without the rule.
  const lines = failureText(error)
    .split(/\r?\n/)
    .filter((line) => !/^(tests|FAILED|ERROR)/.test(line.trim()))
  const { warnings } = lines.reduce(warningsOfLine, { test: 'the style test', warnings: [] })
  if (warnings.length === 0) return [generalWarning(`The style test fails:\n${failureText(error).slice(-1500)}`)]
  return withoutRepeats(warnings)
}

export const reviewPython = (root, files) => {
  if (files.length === 0) return []
  const python = projectPython(root)
  if (!hasRuff(root, python)) return files.map(withName(root)).flatMap(checkFile)
  return [...warningsOfRuff(root, python, files), ...warningsOfStyleTest(root, python)]
}

const warningOfTrace = (line) => {
  const [, name, number, text] = line.match(/^(.+?):(\d+): (\[.*)$/)
  return { name, from: Number(number), to: Number(number), text: `comment: ${text}` }
}

// Reuses the finder from the clean-ai-traces skill; without Python it is skipped without blocking.
export const aiTraces = (root, files) => {
  const python = projectPython(root) ?? 'python'
  const { value } = run(python, [TRACE_FINDER, ...files], root)
  return (value ?? '').split(/\r?\n/).filter((line) => /^.+?:\d+: \[/.test(line)).map(warningOfTrace)
}
