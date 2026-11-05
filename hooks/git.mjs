import { existsSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { run } from './run.mjs'

export const TS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs'])
export const PY_EXTENSIONS = new Set(['.py'])

// null means "the whole file": it is new, or the repo has no commits yet.
export const ALL_LINES = null

const HUNK = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm

export const repoRoot = (folder) => run('git', ['rev-parse', '--show-toplevel'], folder).value?.trim()

// "R old -> new" for renames; paths with spaces arrive quoted.
const pathOfLine = (line) => line.slice(3).split(' -> ').at(-1).replace(/^"|"$/g, '')

const isCode = (path) => TS_EXTENSIONS.has(extname(path)) || PY_EXTENSIONS.has(extname(path))

const isDeleted = (line) => line.startsWith(' D') || line.startsWith('D')

export const changedFiles = (root) =>
  (run('git', ['status', '--porcelain', '-uall'], root).value ?? '')
    .split(/\r?\n/)
    .filter((line) => line.trim() && !isDeleted(line))
    .map((line) => resolve(root, pathOfLine(line)))
    .filter((path) => isCode(path) && existsSync(path))

const rangeOfHunk = ([, start, count = '1']) => [Number(start), Number(start) + Number(count) - 1]

// The lines added or changed relative to HEAD, as [from, to] ranges.
export const changedLines = (root, path) => {
  const { value, error } = run('git', ['diff', '-U0', '--no-color', 'HEAD', '--', path], root)
  if (error || !value.trim()) return ALL_LINES
  return [...value.matchAll(HUNK)].map(rangeOfHunk).filter(([from, to]) => to >= from)
}
