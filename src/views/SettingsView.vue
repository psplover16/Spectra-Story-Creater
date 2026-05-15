<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import AiBindingPanel from '@/components/ai/AiBindingPanel.vue'
import ProactivitySettings from '@/components/ai/ProactivitySettings.vue'

const props = defineProps<{
  novelId: string
}>()

const cliPaths = reactive({
  codex: '',
  claude: '',
})

const detectStatus = ref<'idle' | 'detecting' | 'done'>('idle')

const emit = defineEmits<{
  saveCliPaths: [paths: { codex: string; claude: string }]
}>()

interface CliSettingsShape {
  codex: string | null
  claude: string | null
  lastDetectedAt: string | null
}

interface SettingsApi {
  cli: {
    ensure: () => Promise<CliSettingsShape>
    write: (settings: CliSettingsShape) => Promise<CliSettingsShape>
  }
}

function settingsApi(): SettingsApi | null {
  const api = (window as unknown as { api?: { settings?: SettingsApi } }).api
  return api?.settings ?? null
}

async function loadCliPaths(): Promise<void> {
  const api = settingsApi()
  if (api === null) return
  detectStatus.value = 'detecting'
  try {
    const settings = await api.cli.ensure()
    cliPaths.codex = settings.codex ?? ''
    cliPaths.claude = settings.claude ?? ''
  } finally {
    detectStatus.value = 'done'
  }
}

onMounted(() => {
  void loadCliPaths()
})

async function save(): Promise<void> {
  const api = settingsApi()
  if (api !== null) {
    await api.cli.write({
      codex: cliPaths.codex === '' ? null : cliPaths.codex,
      claude: cliPaths.claude === '' ? null : cliPaths.claude,
      lastDetectedAt: new Date().toISOString(),
    })
  }
  emit('saveCliPaths', { ...cliPaths })
}
</script>

<template>
  <section data-testid="settings-view" class="p-4 space-y-6">
    <fieldset data-testid="settings-group-global" class="space-y-3 border border-slate-200 rounded-md p-3">
      <legend class="text-sm font-semibold px-1">全域設定</legend>
      <p class="text-xs text-slate-500">下列設定套用於所有小說，跨小說共用。</p>

      <div class="space-y-2">
        <p class="text-sm font-medium">CLI 執行檔路徑</p>
        <p v-if="detectStatus === 'detecting'" data-testid="cli-detect-status" class="text-xs text-slate-500">
          自動偵測中…
        </p>
        <label class="block">
          <span class="text-xs text-slate-600">Codex CLI 路徑</span>
          <input
            v-model="cliPaths.codex"
            data-testid="cli-path-codex"
            type="text"
            class="block w-full rounded-md border-slate-300"
            placeholder="例如：C:/Users/.../codex.cmd（未偵測到請手動指定）"
          />
        </label>
        <label class="block">
          <span class="text-xs text-slate-600">Claude Code 路徑</span>
          <input
            v-model="cliPaths.claude"
            data-testid="cli-path-claude"
            type="text"
            class="block w-full rounded-md border-slate-300"
            placeholder="例如：/usr/local/bin/claude（未偵測到請手動指定）"
          />
        </label>
        <button
          type="button"
          data-testid="cli-path-save"
          class="px-3 py-1 rounded-md bg-slate-800 text-white text-sm"
          @click="save"
        >
          儲存路徑
        </button>
      </div>

      <AiBindingPanel />
    </fieldset>

    <fieldset data-testid="settings-group-novel" class="space-y-2 border border-slate-200 rounded-md p-3">
      <legend class="text-sm font-semibold px-1">本小說設定</legend>
      <p class="text-xs text-slate-500">下列設定只影響當前小說，不會影響其他小說。</p>
      <ProactivitySettings :novel-id="props.novelId" :character-id="null" />
    </fieldset>
  </section>
</template>
