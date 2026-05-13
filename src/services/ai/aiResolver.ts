import type {
  AiAdapter,
  AiResolver,
  AiSource,
  HitLayer,
  ResolveQuery,
  ResolveResult,
} from '@/types/ai'

import { assertKnownRole } from './roles'

export interface AiResolverDeps {
  getParagraphBinding(paragraphId: string): AiSource | undefined
  getRoleBinding(role: string): AiSource | undefined
  getCharacterBinding(characterId: string): AiSource | undefined
  getGlobalDefault(): AiSource
  getAdapter(source: AiSource): AiAdapter
}

export function createAiResolver(deps: AiResolverDeps): AiResolver {
  return {
    resolve(query: ResolveQuery): ResolveResult {
      assertKnownRole(query.role)

      if (query.paragraphId) {
        const src = deps.getParagraphBinding(query.paragraphId)
        if (src) {
          return makeResult(
            deps.getAdapter(src),
            'paragraph',
            `段落覆寫：${query.paragraphId} → ${src}`,
          )
        }
      }

      const roleSrc = deps.getRoleBinding(query.role)
      if (roleSrc) {
        return makeResult(deps.getAdapter(roleSrc), 'role', `職能綁定：${query.role} → ${roleSrc}`)
      }

      if (query.characterId) {
        const src = deps.getCharacterBinding(query.characterId)
        if (src) {
          return makeResult(
            deps.getAdapter(src),
            'character',
            `角色綁定：${query.characterId} → ${src}`,
          )
        }
      }

      const globalSrc = deps.getGlobalDefault()
      return makeResult(deps.getAdapter(globalSrc), 'global', `全域預設：${globalSrc}`)
    },
  }
}

function makeResult(adapter: AiAdapter, hitLayer: HitLayer, reason: string): ResolveResult {
  return { adapter, hitLayer, reason }
}
