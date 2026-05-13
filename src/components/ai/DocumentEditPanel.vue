<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  initial: string
}>()

const emit = defineEmits<{
  change: [text: string]
}>()

const text = ref(props.initial)
const history = ref<string[]>([])

function applyAiInsertion(insertion: string, caret: number): void {
  history.value.push(text.value)
  const before = text.value.slice(0, caret)
  const after = text.value.slice(caret)
  text.value = `${before}${insertion}${after}`
  emit('change', text.value)
}

function undo(): void {
  const last = history.value.pop()
  if (last !== undefined) {
    text.value = last
    emit('change', text.value)
  }
}

defineExpose({ applyAiInsertion, undo, text })
</script>

<template>
  <section data-testid="document-edit-panel" class="space-y-2">
    <textarea
      v-model="text"
      data-testid="document-text"
      class="w-full min-h-[160px] rounded-md border-slate-300 p-2"
      @input="emit('change', text)"
    />
    <button
      type="button"
      data-testid="document-undo"
      :disabled="history.length === 0"
      class="px-3 py-1 rounded-md bg-slate-200 text-sm disabled:opacity-50"
      @click="undo"
    >
      復原 AI 插入
    </button>
  </section>
</template>
