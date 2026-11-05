import { execFileSync } from 'node:child_process'
import { attempt } from './attempt.mjs'

const MAX_WAIT_PER_TOOL_MS = 60_000

// Returns { value, error } like attempt(): value is the output; error is the failure with its stdout and stderr.
export const run = (program, args, folder) =>
  attempt(() =>
    execFileSync(program, args, {
      cwd: folder,
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: MAX_WAIT_PER_TOOL_MS,
      // Without this, Python on Windows writes cp1252 and accented characters arrive broken.
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    })
  )

// Linters exit with an error when they find something: their report still arrives on stdout.
export const outputOf = ({ value, error }) => value ?? error?.stdout ?? ''

export const failureText = (error) => `${error.stdout ?? ''}${error.stderr ?? ''}`.trim() || error.message
