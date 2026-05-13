import type { AssembledContext } from '@/types/ai'
import type { AuditInconclusive } from '@/types/audit'

export function checkInconclusive(context: AssembledContext): AuditInconclusive | null {
  const missing: string[] = []
  if (context.characters.length === 0) missing.push('characters')
  if (context.worldview.length === 0) missing.push('worldview')
  if (!context.chapterOutline.outline) missing.push('chapterOutline')
  if (missing.length >= 2) {
    return {
      reason: '上下文資料不足，跳過 dry-run',
      missingSlices: missing,
    }
  }
  return null
}
