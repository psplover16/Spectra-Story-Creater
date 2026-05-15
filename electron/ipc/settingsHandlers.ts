import { access } from 'node:fs/promises'

import { detectCli } from '../ai/cliDetector'
import {
  readCliSettings,
  writeCliSettings,
  type CliSettings,
} from '../../src/services/files/cliSettingsRepository'

export interface SettingsHandlerDeps {
  cliSettingsPath: () => string
  now?: () => string
  pathExists?: (path: string) => Promise<boolean>
}

async function defaultPathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export function createSettingsHandlers(deps: SettingsHandlerDeps): {
  readCli: () => Promise<CliSettings>
  writeCli: (settings: CliSettings) => Promise<CliSettings>
  autoDetect: () => Promise<CliSettings>
  ensureCli: () => Promise<CliSettings>
} {
  const now = deps.now ?? (() => new Date().toISOString())
  const pathExists = deps.pathExists ?? defaultPathExists
  return {
    async readCli(): Promise<CliSettings> {
      return readCliSettings(deps.cliSettingsPath())
    },
    async writeCli(settings: CliSettings): Promise<CliSettings> {
      await writeCliSettings(deps.cliSettingsPath(), settings)
      return settings
    },
    async autoDetect(): Promise<CliSettings> {
      const [codex, claude] = await Promise.all([detectCli('codex'), detectCli('claude')])
      const settings: CliSettings = {
        codex,
        claude,
        lastDetectedAt: now(),
      }
      await writeCliSettings(deps.cliSettingsPath(), settings)
      return settings
    },
    async ensureCli(): Promise<CliSettings> {
      const existing = await readCliSettings(deps.cliSettingsPath())
      const codexValid = existing.codex !== null && (await pathExists(existing.codex))
      const claudeValid = existing.claude !== null && (await pathExists(existing.claude))
      if (codexValid && claudeValid) return existing
      const codex = codexValid ? existing.codex : await detectCli('codex')
      const claude = claudeValid ? existing.claude : await detectCli('claude')
      const settings: CliSettings = {
        codex,
        claude,
        lastDetectedAt: now(),
      }
      await writeCliSettings(deps.cliSettingsPath(), settings)
      return settings
    },
  }
}

export interface IpcLike {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void
}

export function registerSettingsHandlers(ipc: IpcLike, deps: SettingsHandlerDeps): void {
  const handlers = createSettingsHandlers(deps)
  ipc.handle('settings:cli:read', () => handlers.readCli())
  ipc.handle('settings:cli:write', (_e, settings) => handlers.writeCli(settings as CliSettings))
  ipc.handle('settings:cli:autoDetect', () => handlers.autoDetect())
  ipc.handle('settings:cli:ensure', () => handlers.ensureCli())
}
