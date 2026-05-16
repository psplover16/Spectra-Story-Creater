import { spawn as defaultSpawn } from 'node:child_process'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'

import {
  CliExecutionError,
  CliTimeoutError,
  CliUnavailableError,
} from '../../src/services/ai/errors'
import type { AiInvokeInput, AiInvokeResult, AiSource } from '../../src/types/ai'
import { buildSpawnEnv } from '../spawn'

export type SpawnFn = (
  command: string,
  args: readonly string[],
  options: { env: NodeJS.ProcessEnv; stdio: ['pipe', 'pipe', 'pipe'] },
) => ChildProcessWithoutNullStreams

export interface CliInvokerDeps {
  getCliPath: (source: AiSource) => Promise<string | null>
  spawnFn?: SpawnFn
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 120000

function resolveTimeout(explicit: number | undefined): number {
  if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit > 0) {
    return explicit
  }
  const envRaw = process.env.SPECTRA_AI_TIMEOUT_MS
  if (envRaw !== undefined) {
    const parsed = Number.parseInt(envRaw, 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return DEFAULT_TIMEOUT_MS
}

const CODEX_EXEC_SUBCMD = 'exec'
const CLAUDE_PRINT_FLAG = '-p'

function nonInteractiveArg(source: AiSource): string {
  return source === 'codex' ? CODEX_EXEC_SUBCMD : CLAUDE_PRINT_FLAG
}

function dispatchSpawnArgs(
  cliPath: string,
  source: AiSource,
): { command: string; args: readonly string[] } {
  const subcmd = nonInteractiveArg(source)
  if (process.platform === 'win32') {
    const lower = cliPath.toLowerCase()
    if (lower.endsWith('.cmd') || lower.endsWith('.bat')) {
      return { command: 'cmd.exe', args: ['/d', '/s', '/c', cliPath, subcmd] }
    }
  }
  return { command: cliPath, args: [subcmd] }
}

export async function invokeCli(
  source: AiSource,
  input: AiInvokeInput,
  deps: CliInvokerDeps,
): Promise<AiInvokeResult> {
  const cliPath = await deps.getCliPath(source)
  if (cliPath === null) {
    throw new CliUnavailableError(source)
  }

  const spawnFn = deps.spawnFn ?? (defaultSpawn as unknown as SpawnFn)
  const timeoutMs = resolveTimeout(deps.timeoutMs)
  const start = Date.now()
  const { command, args } = dispatchSpawnArgs(cliPath, source)

  return new Promise<AiInvokeResult>((resolve, reject) => {
    let child: ChildProcessWithoutNullStreams
    try {
      child = spawnFn(command, args, {
        env: buildSpawnEnv(),
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    } catch (err) {
      reject(new CliExecutionError(source, -1, (err as Error).message ?? 'spawn failed'))
      return
    }

    let stdoutBuf = ''
    let stderrBuf = ''
    let settled = false

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      try {
        child.kill('SIGTERM')
      } catch {
        // ignore
      }
      reject(new CliTimeoutError(source, timeoutMs))
    }, timeoutMs)

    child.stdout.on('data', (chunk: Buffer | string) => {
      stdoutBuf += typeof chunk === 'string' ? chunk : chunk.toString('utf-8')
    })
    child.stderr.on('data', (chunk: Buffer | string) => {
      stderrBuf += typeof chunk === 'string' ? chunk : chunk.toString('utf-8')
    })

    child.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(new CliExecutionError(source, -1, err.message ?? 'spawn error'))
    })

    child.on('close', (code: number | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      const exitCode = code ?? -1
      if (exitCode !== 0) {
        reject(new CliExecutionError(source, exitCode, stderrBuf.slice(0, 200)))
        return
      }
      resolve({
        text: stdoutBuf.trim(),
        source,
        durationMs: Date.now() - start,
      })
    })

    try {
      child.stdin.write(input.prompt)
      child.stdin.end()
    } catch (err) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(new CliExecutionError(source, -1, (err as Error).message ?? 'stdin write failed'))
    }
  })
}
