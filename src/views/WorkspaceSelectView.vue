<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  pickFolder: () => Promise<string | null>
  isWritable: (path: string) => Promise<boolean>
}>()

const emit = defineEmits<{
  selected: [path: string]
}>()

const error = ref<string | null>(null)
const isPicking = ref(false)

async function handlePick(): Promise<void> {
  error.value = null
  isPicking.value = true
  try {
    const picked = await props.pickFolder()
    if (picked === null) return
    const writable = await props.isWritable(picked)
    if (!writable) {
      error.value = '所選資料夾為唯讀，請重新挑選'
      return
    }
    emit('selected', picked)
  } finally {
    isPicking.value = false
  }
}
</script>

<template>
  <section class="p-8 max-w-xl mx-auto">
    <h2 class="text-xl font-bold mb-4">選擇 workspace 資料夾</h2>
    <p class="text-sm text-slate-600 mb-4">工作目錄會存放所有小說資料，建議放在本機固定路徑。</p>
    <button
      type="button"
      :disabled="isPicking"
      class="px-4 py-2 rounded-md bg-slate-800 text-white disabled:opacity-50"
      data-testid="pick-folder"
      @click="handlePick"
    >
      挑選資料夾
    </button>
    <p v-if="error" class="text-red-600 text-sm mt-3" data-testid="error">
      {{ error }}
    </p>
  </section>
</template>
