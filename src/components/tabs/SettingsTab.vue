<script setup lang="ts">
import { ref } from 'vue'

import SettingsView from '@/views/SettingsView.vue'

const props = defineProps<{
  novelDir: string
  novelId: string
}>()

interface SavedCliPaths {
  codex: string
  claude: string
}

const saved = ref<SavedCliPaths | null>(null)

function handleSave(paths: { codex: string; claude: string }): void {
  saved.value = { ...paths }
}
</script>

<template>
  <section data-testid="settings-tab" class="space-y-3">
    <SettingsView :novel-id="props.novelId" @save-cli-paths="handleSave" />
    <p v-if="saved !== null" data-testid="settings-saved" class="text-xs text-emerald-700 px-4">
      已儲存：codex={{ saved.codex }} / claude={{ saved.claude }}
    </p>
  </section>
</template>
