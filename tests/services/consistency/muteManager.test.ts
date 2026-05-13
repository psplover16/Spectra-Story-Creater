import { describe, expect, it } from 'vitest'

import {
  createMuteWindow,
  isWithinMute,
  pruneExpiredMutes,
} from '@/services/consistency/muteManager'

describe('muteManager', () => {
  it('1 章視窗：startIdx=3 → endIdx=3', () => {
    const w = createMuteWindow('ooc', 3, 1)
    expect(w.endChapterIndex).toBe(3)
  })

  it('3 章視窗：startIdx=3 → endIdx=5', () => {
    const w = createMuteWindow('ooc', 3, 3)
    expect(w.endChapterIndex).toBe(5)
  })

  it('5 章視窗：startIdx=3 → endIdx=7', () => {
    const w = createMuteWindow('ooc', 3, 5)
    expect(w.endChapterIndex).toBe(7)
  })

  it('isWithinMute / pruneExpiredMutes：到期視窗會被清除', () => {
    const w = createMuteWindow('ooc', 3, 3)
    expect(isWithinMute([w], 'ooc', 4)).toBe(true)
    expect(isWithinMute([w], 'ooc', 7)).toBe(false)
    expect(pruneExpiredMutes([w], 8)).toEqual([])
    expect(pruneExpiredMutes([w], 4)).toEqual([w])
  })
})
