import { readUtf8Text, writeUtf8TextAtomic } from './encoding'

export interface CliSettings {
  codex: string | null
  claude: string | null
  lastDetectedAt: string | null
}

export const EMPTY_CLI_SETTINGS: CliSettings = {
  codex: null,
  claude: null,
  lastDetectedAt: null,
}

export async function readCliSettings(filePath: string): Promise<CliSettings> {
  try {
    const raw = await readUtf8Text(filePath)
    const parsed = JSON.parse(raw) as Partial<CliSettings>
    return {
      codex: typeof parsed.codex === 'string' ? parsed.codex : null,
      claude: typeof parsed.claude === 'string' ? parsed.claude : null,
      lastDetectedAt: typeof parsed.lastDetectedAt === 'string' ? parsed.lastDetectedAt : null,
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { ...EMPTY_CLI_SETTINGS }
    throw err
  }
}

export async function writeCliSettings(filePath: string, settings: CliSettings): Promise<void> {
  await writeUtf8TextAtomic(filePath, JSON.stringify(settings, null, 2))
}
