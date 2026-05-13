import type { AiRole } from '@/types/ai'

import { UnknownRoleError } from './errors'

export const AI_ROLES = [
  'plot-driver',
  'character-voice',
  'worldbuilding',
  'character-design',
  'outline-assistant',
  'consistency-auditor',
] as const satisfies readonly AiRole[]

export type KnownAiRole = (typeof AI_ROLES)[number]

const ROLE_SET = new Set<string>(AI_ROLES)

export function isKnownRole(role: string): role is KnownAiRole {
  return ROLE_SET.has(role)
}

export function assertKnownRole(role: string): asserts role is KnownAiRole {
  if (!isKnownRole(role)) {
    throw new UnknownRoleError(role)
  }
}

export const ROLE_LABELS: Record<KnownAiRole, string> = {
  'plot-driver': '劇情推進',
  'character-voice': '角色對話',
  worldbuilding: '世界觀建構',
  'character-design': '角色設計',
  'outline-assistant': '大綱協助',
  'consistency-auditor': '一致性審核',
}
