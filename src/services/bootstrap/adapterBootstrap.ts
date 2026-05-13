import type { AiAdapter, AiInvokeInput, AiInvokeResult, AiSource } from '@/types/ai'
import { useAiSettingsStore } from '@/stores/aiSettings'

export interface CliAvailabilityResult {
  codex: boolean | 'unknown'
  claude: boolean | 'unknown'
}

export type CliProbe = () => Promise<{ codex: boolean; claude: boolean }>

export interface BootstrapOptions {
  probe?: CliProbe
}

export interface BootstrapResult {
  codex: AiAdapter
  claude: AiAdapter
  availability: CliAvailabilityResult
}

function createRendererAdapter(source: AiSource): AiAdapter {
  return {
    source,
    async invoke(input: AiInvokeInput): Promise<AiInvokeResult> {
      const api = (window as unknown as { api?: { ai?: { invoke?: unknown } } }).api
      if (!api?.ai?.invoke) {
        throw new Error('window.api.ai.invoke is not available in this environment')
      }
      const invoke = api.ai.invoke as (input: AiInvokeInput) => Promise<AiInvokeResult>
      const result = await invoke(input)
      return { ...result, source }
    },
  }
}

async function safeProbe(probe: CliProbe | undefined): Promise<CliAvailabilityResult> {
  if (!probe) return { codex: true, claude: true }
  try {
    const r = await probe()
    return { codex: r.codex, claude: r.claude }
  } catch {
    return { codex: 'unknown', claude: 'unknown' }
  }
}

export async function bootstrapAdapters(opts: BootstrapOptions = {}): Promise<BootstrapResult> {
  const availability = await safeProbe(opts.probe)
  const codex = createRendererAdapter('codex')
  const claude = createRendererAdapter('claude')

  const store = useAiSettingsStore()
  if (availability.codex === false && availability.claude === true) {
    store.setGlobalDefault('claude')
  }

  return { codex, claude, availability }
}
