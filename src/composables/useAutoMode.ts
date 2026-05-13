import { computed, ref } from 'vue'

import { decideAutoMode, type AutoModeDecision } from '@/services/ai/autoModeRouter'

export function useAutoMode() {
  const recentInputLength = ref(0)
  const interactionsInLastMinute = ref(0)

  const decision = computed<AutoModeDecision>(() =>
    decideAutoMode({
      lastInputLength: recentInputLength.value,
      recentInteractionCount: interactionsInLastMinute.value,
    }),
  )

  function observeInput(text: string): void {
    recentInputLength.value = text.length
    interactionsInLastMinute.value += 1
  }

  function tickMinute(): void {
    interactionsInLastMinute.value = 0
  }

  return { decision, observeInput, tickMinute }
}
