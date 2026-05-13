import type { AssembledContext } from '@/types/ai'
import type { Character } from '@/types/character'
import type { AuditCategory, AuditFinding, AuditResult, MuteWindow } from '@/types/audit'
import type { WorldviewEntry } from '@/types/novel'

import { detectOoc } from './detectors/oocDetector'
import { detectUnexplainedAbility } from './detectors/abilityDetector'
import { detectRelationshipConflict } from './detectors/relationshipDetector'
import { detectWorldviewConflict } from './detectors/worldviewDetector'
import { detectTimelineConflict } from './detectors/timelineDetector'
import { checkInconclusive } from './inconclusive'

export interface AuditorInput {
  candidateResponse: string
  chapterId: string
  chapterIndex: number
  presentCharacters: Character[]
  worldview: WorldviewEntry[]
  deceasedCharacterIds: string[]
  context: AssembledContext
  mutes: MuteWindow[]
}

export function auditorDryRun(input: AuditorInput): AuditResult {
  const inconclusive = checkInconclusive(input.context)
  if (inconclusive) {
    return { kind: 'inconclusive', details: inconclusive }
  }

  const findings: AuditFinding[] = [
    ...detectOoc({
      candidateResponse: input.candidateResponse,
      presentCharacters: input.presentCharacters,
      chapterId: input.chapterId,
    }),
    ...detectUnexplainedAbility({
      candidateResponse: input.candidateResponse,
      presentCharacters: input.presentCharacters,
      chapterId: input.chapterId,
    }),
    ...detectRelationshipConflict({
      candidateResponse: input.candidateResponse,
      presentCharacters: input.presentCharacters,
      chapterId: input.chapterId,
    }),
    ...detectWorldviewConflict({
      candidateResponse: input.candidateResponse,
      worldview: input.worldview,
      chapterId: input.chapterId,
    }),
    ...detectTimelineConflict({
      candidateResponse: input.candidateResponse,
      presentCharacters: input.presentCharacters,
      deceasedCharacterIds: input.deceasedCharacterIds,
      chapterId: input.chapterId,
    }),
  ]

  const filtered = findings.filter((f) => !isMuted(f.category, input.chapterIndex, input.mutes))

  if (filtered.length === 0) return { kind: 'clean' }
  return { kind: 'findings', findings: filtered }
}

function isMuted(category: AuditCategory, idx: number, mutes: MuteWindow[]): boolean {
  return mutes.some(
    (m) => m.category === category && idx >= m.startChapterIndex && idx <= m.endChapterIndex,
  )
}
