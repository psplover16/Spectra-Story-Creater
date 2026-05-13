import type { AiSource } from '@/types/ai'

export type CliAvailability =
  | { kind: 'installed'; commandPath: string }
  | { kind: 'not-found' }
  | { kind: 'no-execute-permission'; path: string }

export interface CliProbeRunner {
  exists(command: string): Promise<boolean>
  isExecutable(command: string): Promise<boolean>
  resolvePath(command: string): Promise<string | null>
}

export async function probeCli(source: AiSource, runner: CliProbeRunner): Promise<CliAvailability> {
  const command = source === 'codex' ? 'codex' : 'claude'
  const resolved = await runner.resolvePath(command)
  if (resolved === null) {
    return { kind: 'not-found' }
  }
  const exec = await runner.isExecutable(resolved)
  if (!exec) {
    return { kind: 'no-execute-permission', path: resolved }
  }
  return { kind: 'installed', commandPath: resolved }
}
