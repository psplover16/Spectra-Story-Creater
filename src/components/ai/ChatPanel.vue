<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

export interface ChatMessage {
  id: string
  author: 'user' | 'ai'
  text: string
  at: string
}

const props = defineProps<{
  messages: ChatMessage[]
}>()

const emit = defineEmits<{
  send: [text: string]
}>()

const input = ref('')
const scrollRef = ref<HTMLDivElement | null>(null)
const visibleMessages = computed(() => props.messages)

watch(visibleMessages, async () => {
  await nextTick()
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }
})

function send(): void {
  if (input.value.trim() === '') return
  emit('send', input.value)
  input.value = ''
}
</script>

<template>
  <section data-testid="chat-panel" class="flex flex-col h-full">
    <div ref="scrollRef" data-testid="chat-scroll" class="flex-1 overflow-y-auto space-y-2 p-3">
      <div
        v-for="message in visibleMessages"
        :key="message.id"
        :data-testid="`chat-msg-${message.id}`"
        :class="[
          'p-2 rounded-md text-sm',
          message.author === 'user' ? 'bg-slate-100 text-right' : 'bg-blue-50',
        ]"
      >
        {{ message.text }}
      </div>
    </div>
    <form class="p-2 border-t border-slate-200 flex gap-2" @submit.prevent="send">
      <input
        v-model="input"
        type="text"
        data-testid="chat-input"
        class="flex-1 rounded-md border-slate-300 px-2 py-1 text-sm"
      />
      <button
        type="submit"
        data-testid="chat-send"
        class="px-3 py-1 rounded-md bg-slate-800 text-white text-sm"
      >
        送出
      </button>
    </form>
  </section>
</template>
