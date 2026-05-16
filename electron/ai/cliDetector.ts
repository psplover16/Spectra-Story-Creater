import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { homedir, platform } from 'node:os'
import { join } from 'node:path'

const IS_WIN = platform() === 'win32'

const WINDOWS_EXEC_PRIORITY = ['.cmd', '.exe', '.bat'] as const

export function pickWindowsCandidate(lines: readonly string[]): string | null {
  const normalized = lines.map((s) => s.trim()).filter((s) => s.length > 0)
  for (const ext of WINDOWS_EXEC_PRIORITY) {
    const hit = normalized.find((line) => line.toLowerCase().endsWith(ext))
    if (hit !== undefined) return hit
  }
  return null
}

async function defaultSpawnLookup(name: string): Promise<string | null> {
  return new Promise((resolve) => {
    const cmd = IS_WIN ? 'where' : 'which'
    let proc
    try {
      proc = spawn(cmd, [name], { shell: false })
    } catch {
      return resolve(null)
    }
    let stdout = ''
    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    proc.on('error', () => resolve(null))
    proc.on('close', (code) => {
      if (code !== 0) return resolve(null)
      const lines = stdout.split(/\r?\n/)
      if (IS_WIN) {
        resolve(pickWindowsCandidate(lines))
        return
      }
      const line = lines.map((s) => s.trim()).find((s) => s.length > 0)
      resolve(line ?? null)
    })
  })
}

async function defaultPathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function windowsFallbacks(name: string): string[] {
  const home = homedir()
  const appData = process.env.APPDATA ?? join(home, 'AppData', 'Roaming')
  const localAppData = process.env.LOCALAPPDATA ?? join(home, 'AppData', 'Local')
  return [
    join(appData, 'npm', `${name}.cmd`),
    join(appData, 'npm', `${name}.exe`),
    join(localAppData, 'Programs', name, `${name}.exe`),
  ]
}

function posixFallbacks(name: string): string[] {
  const home = homedir()
  return [
    join(home, '.npm', 'global', 'bin', name),
    '/usr/local/bin/' + name,
    '/opt/homebrew/bin/' + name,
  ]
}

export interface CliDetectorDeps {
  spawnLookup?: (name: string) => Promise<string | null>
  pathExists?: (path: string) => Promise<boolean>
  fallbacks?: (name: string) => string[]
}

export type CliName = 'codex' | 'claude'

export async function detectCli(name: CliName, deps: CliDetectorDeps = {}): Promise<string | null> {
  const spawnLookup = deps.spawnLookup ?? defaultSpawnLookup
  const pathExists = deps.pathExists ?? defaultPathExists
  const fallbacks = deps.fallbacks ?? (IS_WIN ? windowsFallbacks : posixFallbacks)

  const fromPath = await spawnLookup(name)
  if (fromPath !== null && (await pathExists(fromPath))) {
    return fromPath
  }
  for (const candidate of fallbacks(name)) {
    if (await pathExists(candidate)) {
      return candidate
    }
  }
  return null
}
