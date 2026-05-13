<script setup lang="ts">
import type { Novel } from '@/types/novel'

defineProps<{
  novels: Novel[]
}>()

const emit = defineEmits<{
  open: [name: string]
}>()

function handleOpen(name: string): void {
  emit('open', name)
}
</script>

<template>
  <section class="p-8 max-w-3xl mx-auto">
    <h2 class="text-xl font-bold mb-4">工作目錄內的小說</h2>
    <ul v-if="novels.length > 0" data-testid="novel-list" class="space-y-2">
      <li
        v-for="novel in novels"
        :key="novel.id"
        class="p-4 rounded-md border border-slate-200 flex items-center justify-between"
      >
        <div>
          <p class="font-medium">
            {{ novel.name }}
          </p>
          <p v-if="novel.style" class="text-xs text-slate-500">風格：{{ novel.style }}</p>
        </div>
        <button
          type="button"
          class="px-3 py-1 text-sm rounded-md bg-slate-700 text-white"
          :data-testid="`open-${novel.name}`"
          @click="handleOpen(novel.name)"
        >
          打開
        </button>
      </li>
    </ul>
    <p v-else class="text-slate-500 text-sm" data-testid="empty">此工作目錄尚未建立任何小說。</p>
  </section>
</template>
