import { describe, expect, it } from 'vitest'

import { AI_ROLES, assertKnownRole, isKnownRole } from '@/services/ai/roles'
import { UnknownRoleError } from '@/services/ai/errors'

describe('roles 列舉與守衛', () => {
  it('共 6 個 AI 職能', () => {
    expect(AI_ROLES).toHaveLength(6)
    expect(AI_ROLES).toContain('plot-driver')
    expect(AI_ROLES).toContain('character-voice')
    expect(AI_ROLES).toContain('worldbuilding')
    expect(AI_ROLES).toContain('character-design')
    expect(AI_ROLES).toContain('outline-assistant')
    expect(AI_ROLES).toContain('consistency-auditor')
  })

  it('isKnownRole 對未知值回 false', () => {
    expect(isKnownRole('plot-driver')).toBe(true)
    expect(isKnownRole('mystery-role')).toBe(false)
  })

  it('assertKnownRole 對未知值拋 UnknownRoleError', () => {
    expect(() => assertKnownRole('plot-driver')).not.toThrow()
    expect(() => assertKnownRole('rogue')).toThrowError(UnknownRoleError)
  })
})
