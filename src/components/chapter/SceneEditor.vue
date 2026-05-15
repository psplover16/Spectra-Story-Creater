<script setup lang="ts">
import { reactive } from 'vue'

import type { Scene } from '@/types/chapter'

const props = defineProps<{
  scene: Scene
}>()

const emit = defineEmits<{
  update: [scene: Scene]
}>()

// draft 只在 mount 時初始化；切章節由父層 :key="chapter.id" 強制 re-mount 處理。
// 不 watch props.scene，避免「同章節內勾選在場角色觸發整章 save」時把使用者尚未按「儲存場景」
// 的草稿覆蓋掉。
const draft = reactive<Scene>({
  location: props.scene.location,
  time: props.scene.time,
  weather: props.scene.weather,
  props: [...props.scene.props],
  mood: props.scene.mood,
})

function save(): void {
  emit('update', {
    location: draft.location,
    time: draft.time,
    weather: draft.weather,
    props: [...draft.props],
    mood: draft.mood,
  })
}
</script>

<template>
  <section data-testid="scene-editor" class="space-y-2">
    <label class="block">
      <span class="text-xs text-slate-600">地點</span>
      <input
        v-model="draft.location"
        data-testid="scene-location"
        type="text"
        class="block w-full rounded-md border-slate-300"
      />
    </label>
    <label class="block">
      <span class="text-xs text-slate-600">時間</span>
      <input
        v-model="draft.time"
        data-testid="scene-time"
        type="text"
        class="block w-full rounded-md border-slate-300"
      />
    </label>
    <label class="block">
      <span class="text-xs text-slate-600">天氣</span>
      <input
        v-model="draft.weather"
        data-testid="scene-weather"
        type="text"
        class="block w-full rounded-md border-slate-300"
      />
    </label>
    <label class="block">
      <span class="text-xs text-slate-600">道具（每行一個）</span>
      <textarea
        :value="draft.props.join('\n')"
        data-testid="scene-props"
        class="block w-full rounded-md border-slate-300"
        rows="2"
        @input="
          draft.props = (($event.target as HTMLTextAreaElement).value || '')
            .split('\n')
            .filter((s) => s.length > 0)
        "
      />
    </label>
    <label class="block">
      <span class="text-xs text-slate-600">氛圍</span>
      <input
        v-model="draft.mood"
        data-testid="scene-mood"
        type="text"
        class="block w-full rounded-md border-slate-300"
      />
    </label>
    <button
      type="button"
      data-testid="scene-save"
      class="px-3 py-1 rounded-md bg-slate-800 text-white"
      @click="save"
    >
      儲存場景
    </button>
  </section>
</template>
