<script setup lang="ts">
import { AI_ROLES, ROLE_LABELS } from '@/services/ai/roles'
import { useAiSettingsStore } from '@/stores/aiSettings'
import type { AiSource } from '@/types/ai'

const store = useAiSettingsStore()
const SOURCES: AiSource[] = ['codex', 'claude']

function setRole(role: (typeof AI_ROLES)[number], source: string): void {
  if (source === '') store.setRoleBinding(role, null)
  else store.setRoleBinding(role, source as AiSource)
}

function setGlobal(source: string): void {
  store.setGlobalDefault(source as AiSource)
}
</script>

<template>
  <section data-testid="ai-binding-panel" class="space-y-3">
    <div>
      <label class="block text-sm">
        <span>全域預設</span>
        <select
          data-testid="binding-global"
          :value="store.binding.globalDefault"
          class="block w-full rounded-md border-slate-300"
          @change="setGlobal(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="s in SOURCES" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>
    </div>
    <div>
      <h4 class="text-sm font-medium">職能綁定</h4>
      <ul class="space-y-1">
        <li v-for="role in AI_ROLES" :key="role" class="flex items-center gap-2">
          <span class="w-32 text-sm">{{ ROLE_LABELS[role] }}</span>
          <select
            :data-testid="`binding-role-${role}`"
            :value="store.binding.roleBindings[role] ?? ''"
            class="rounded-md border-slate-300"
            @change="setRole(role, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">（使用全域預設）</option>
            <option v-for="s in SOURCES" :key="s" :value="s">
              {{ s }}
            </option>
          </select>
        </li>
      </ul>
    </div>
  </section>
</template>
