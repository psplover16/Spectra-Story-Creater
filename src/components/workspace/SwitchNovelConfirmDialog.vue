<script setup lang="ts">
defineProps<{
  fromNovel: string
  toNovel: string
}>()

const emit = defineEmits<{
  save: []
  discard: []
  cancel: []
}>()
</script>

<template>
  <div
    data-testid="switch-novel-dialog"
    class="p-4 bg-white rounded-md border border-slate-200 shadow-md"
  >
    <h3 class="text-base font-semibold mb-2">切換小說</h3>
    <p class="text-sm text-slate-600 mb-3">
      將離開「{{ fromNovel }}」並開啟「{{ toNovel }}」。部分章節仍有未儲存的編輯：
    </p>
    <div class="flex gap-2">
      <button
        type="button"
        data-testid="switch-save"
        class="px-3 py-1 rounded-md bg-slate-800 text-white text-sm"
        @click="emit('save')"
      >
        儲存後切換
      </button>
      <button
        type="button"
        data-testid="switch-discard"
        class="px-3 py-1 rounded-md bg-red-600 text-white text-sm"
        @click="emit('discard')"
      >
        放棄變更並切換
      </button>
      <button
        type="button"
        data-testid="switch-cancel"
        class="px-3 py-1 rounded-md bg-slate-200 text-sm"
        @click="emit('cancel')"
      >
        取消
      </button>
    </div>
  </div>
</template>
