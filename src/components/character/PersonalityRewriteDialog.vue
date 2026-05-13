<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  characterName: string
  currentPersonality: string
  suggestedPersonality: string
}>()

const emit = defineEmits<{
  confirm: [finalPersonality: string]
  cancel: []
}>()

const edited = ref(props.suggestedPersonality)
</script>

<template>
  <div data-testid="rewrite-dialog" class="p-4 bg-white rounded-md border border-slate-200">
    <h3 class="text-base font-semibold mb-2">更新「{{ props.characterName }}」性格</h3>
    <p class="text-xs text-slate-600 mb-1">目前：{{ props.currentPersonality }}</p>
    <label class="block">
      <span class="text-xs text-slate-600">最終 personality</span>
      <textarea
        v-model="edited"
        data-testid="rewrite-text"
        class="block w-full rounded-md border-slate-300 mt-1"
        rows="3"
      />
    </label>
    <div class="flex gap-2 mt-2">
      <button
        type="button"
        data-testid="rewrite-confirm"
        class="px-3 py-1 rounded-md bg-slate-800 text-white text-sm"
        @click="emit('confirm', edited)"
      >
        確認寫入
      </button>
      <button
        type="button"
        data-testid="rewrite-cancel"
        class="px-3 py-1 rounded-md bg-slate-200 text-sm"
        @click="emit('cancel')"
      >
        取消
      </button>
    </div>
  </div>
</template>
