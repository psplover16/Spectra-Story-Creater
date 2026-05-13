<script setup lang="ts">
import { ref } from 'vue'

import CollaborationModeSelectView from '@/views/CollaborationModeSelectView.vue'
import { saveWorkspaceState } from '@/services/files/workspaceStateRepository'
import type { CollaborationMode } from '@/types/collaboration'

const props = withDefaults(
  defineProps<{
    workspacePath?: string
    activeNovelName?: string | null
    storage?: Storage
  }>(),
  {
    workspacePath: '',
    activeNovelName: null,
    storage: undefined,
  },
)

const emit = defineEmits<{
  'mode-selected': [mode: CollaborationMode]
}>()

const active = ref<CollaborationMode | null>(null)

function handleSelect(mode: CollaborationMode): void {
  active.value = mode
  const persistTarget =
    props.storage !== undefined ? props.storage : window.localStorage
  saveWorkspaceState(
    {
      workspacePath: props.workspacePath ?? '',
      activeNovelName: props.activeNovelName ?? null,
      collaborationMode: mode,
    },
    persistTarget,
  )
  emit('mode-selected', mode)
}
</script>

<template>
  <section data-testid="collaboration-mode-gate">
    <CollaborationModeSelectView :active="active" @select="handleSelect" />
  </section>
</template>
