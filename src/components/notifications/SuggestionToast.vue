<script setup lang="ts">
defineProps<{
  message: string
}>()

const emit = defineEmits<{
  dismiss: []
  openDetails: []
}>()
</script>

<template>
  <aside
    data-testid="suggestion-toast"
    class="fixed bottom-4 right-4 max-w-sm p-3 rounded-md bg-slate-800 text-white text-sm shadow-md"
  >
    <p>{{ message }}</p>
    <div class="flex gap-2 mt-1 justify-end">
      <button
        type="button"
        data-testid="toast-details"
        class="text-xs underline"
        @click="emit('openDetails')"
      >
        查看細節
      </button>
      <button
        type="button"
        data-testid="toast-dismiss"
        class="text-xs underline"
        @click="emit('dismiss')"
      >
        關閉
      </button>
    </div>
  </aside>
</template>
