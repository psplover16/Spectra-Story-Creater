<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  chapterTitle: string
}>()

const emit = defineEmits<{
  confirm: [branchName: string]
  cancel: []
}>()

const branchName = ref('')
const error = ref<string | null>(null)

function submit(): void {
  if (branchName.value.trim() === '') {
    error.value = '分支名稱不可為空'
    return
  }
  emit('confirm', branchName.value)
}
</script>

<template>
  <div data-testid="save-as-branch-dialog" class="p-4 bg-white rounded-md border border-slate-200">
    <h3 class="text-base font-semibold mb-2">將「{{ props.chapterTitle }}」另存為分支</h3>
    <label class="block mb-2">
      <span class="text-xs text-slate-600">分支名稱（會出現在檔名）</span>
      <input
        v-model="branchName"
        data-testid="branch-name"
        type="text"
        class="block w-full rounded-md border-slate-300 mt-1"
      />
    </label>
    <p v-if="error" data-testid="branch-error" class="text-red-600 text-sm">
      {{ error }}
    </p>
    <div class="flex gap-2 mt-3">
      <button
        type="button"
        data-testid="branch-confirm"
        class="px-3 py-1 rounded-md bg-slate-800 text-white"
        @click="submit"
      >
        另存為分支
      </button>
      <button
        type="button"
        data-testid="branch-cancel"
        class="px-3 py-1 rounded-md bg-slate-200"
        @click="emit('cancel')"
      >
        取消
      </button>
    </div>
  </div>
</template>
