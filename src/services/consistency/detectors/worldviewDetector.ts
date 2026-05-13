import type { WorldviewEntry } from '@/types/novel'
import type { AuditFinding } from '@/types/audit'

export interface WorldviewDetectorInput {
  candidateResponse: string
  worldview: WorldviewEntry[]
  chapterId: string
}

const MODERN_TECH_KEYWORDS = ['手機', '網路', '電腦', '汽車']

export function detectWorldviewConflict(input: WorldviewDetectorInput): AuditFinding[] {
  const findings: AuditFinding[] = []
  const isAncient = input.worldview.some(
    (w) => w.content.includes('古代') || w.content.includes('清初') || w.content.includes('明朝'),
  )
  if (!isAncient) return findings

  for (const keyword of MODERN_TECH_KEYWORDS) {
    if (input.candidateResponse.includes(keyword)) {
      findings.push({
        category: 'worldview-conflict',
        chapterId: input.chapterId,
        evidence: `世界觀設定為古代背景，候選回應出現現代科技詞「${keyword}」`,
        severity: 'high',
      })
    }
  }
  return findings
}
