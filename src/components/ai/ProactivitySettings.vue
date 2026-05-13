<script setup lang="ts">
import { useAiSettingsStore } from '@/stores/aiSettings'
import type { ProactivityLevel } from '@/stores/aiSettings'

const props = defineProps<{
  novelId: string
  characterId: string | null
}>()

const store = useAiSettingsStore()

const LEVELS: ProactivityLevel[] = ['strong', 'medium', 'weak', 'off', 'inherit']

function setGlobal(value: string): void {
  store.setGlobalProactivity(value as Exclude<ProactivityLevel, 'inherit'>)
}

function setNovel(value: string): void {
  store.setNovelProactivity(props.novelId, value as ProactivityLevel)
}

function setCharacter(value: string): void {
  if (props.characterId === null) return
  store.setCharacterProactivity(props.characterId, value as ProactivityLevel)
}
</script>

<template>
  <section data-testid="proactivity-settings" class="space-y-2">
    <label class="block">
      <span class="text-xs text-slate-600">全域</span>
      <select
        data-testid="proactivity-global"
        :value="store.proactivity.global"
        class="block w-full rounded-md border-slate-300"
        @change="setGlobal(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="l in ['strong', 'medium', 'weak', 'off'] as const" :key="l" :value="l">
          {{ l }}
        </option>
      </select>
    </label>
    <label class="block">
      <span class="text-xs text-slate-600">本小說</span>
      <select
        data-testid="proactivity-novel"
        :value="store.proactivity.perNovel[novelId] ?? 'inherit'"
        class="block w-full rounded-md border-slate-300"
        @change="setNovel(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
      </select>
    </label>
    <label v-if="characterId" class="block">
      <span class="text-xs text-slate-600">角色</span>
      <select
        :data-testid="`proactivity-character-${characterId}`"
        :value="store.proactivity.perCharacter[characterId] ?? 'inherit'"
        class="block w-full rounded-md border-slate-300"
        @change="setCharacter(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
      </select>
    </label>
  </section>
</template>
