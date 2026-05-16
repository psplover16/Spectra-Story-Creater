import { access, constants } from 'node:fs/promises'
import path from 'node:path'

import {
  EMPTY_CLI_SETTINGS,
  readCliSettings,
  writeCliSettings,
  type CliSettings,
} from '../../src/services/files/cliSettingsRepository'
import type { AiSource } from '../../src/types/ai'
import { detectCli } from './cliDetector'

const WINDOWS_EXEC_EXTENSIONS = ['.cmd', '.exe', '.bat'] as const

export function isUsableCliPath(p: string): boolean {
  if (process.platform !== 'win32') return true
  const lower = p.toLowerCase()
  return WINDOWS_EXEC_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

export interface CliPathResolverDeps {
  cliJsonPath: () => string
  readSettings: (p: string) => Promise<CliSettings>
  writeSettings: (p: string, s: CliSettings) => Promise<void>
  detect: (name: 'codex' | 'claude') => Promise<string | null>
  pathExists: (p: string) => Promise<boolean>
  nowIso: () => string
}

export async function resolveCliPath(
  source: AiSource,
  deps: CliPathResolverDeps,
): Promise<string | null> {
  const cliJsonPath = deps.cliJsonPath()
  let settings: CliSettings
  try {
    settings = await deps.readSettings(cliJsonPath)
  } catch {
    settings = { ...EMPTY_CLI_SETTINGS }
  }

  const candidate = source === 'codex' ? settings.codex : settings.claude
  if (typeof candidate === 'string' && candidate.length > 0 && isUsableCliPath(candidate)) {
    if (await deps.pathExists(candidate)) {
      return candidate
    }
  }

  const detected = await deps.detect(source)
  const next: CliSettings = {
    codex: source === 'codex' ? detected : settings.codex,
    claude: source === 'claude' ? detected : settings.claude,
    lastDetectedAt: deps.nowIso(),
  }
  try {
    await deps.writeSettings(cliJsonPath, next)
  } catch {
    // 寫盤失敗不阻斷主流程；下次啟動會再次自我修復
  }
  return detected
}

export function defaultCliPathResolverDeps(cliJsonPathFactory: () => string): CliPathResolverDeps {
  return {
    cliJsonPath: cliJsonPathFactory,
    readSettings: readCliSettings,
    writeSettings: writeCliSettings,
    detect: detectCli,
    pathExists: async (p: string) => {
      try {
        await access(p, constants.F_OK)
        return true
      } catch {
        return false
      }
    },
    nowIso: () => new Date().toISOString(),
  }
}

// re-export for convenience callers that want a one-shot helper using app.getPath
export function buildDefaultDeps(getUserDataPath: () => string): CliPathResolverDeps {
  return defaultCliPathResolverDeps(() => path.join(getUserDataPath(), 'cli.json'))
}
