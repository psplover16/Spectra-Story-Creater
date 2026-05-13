/**
 * 三層 proactivity fallback：character → novel → global。
 *
 * 規格：D9 主動性可調整層級採全域 / 小說 / 角色三層 fallback。
 */

export type ProactivityLevel = 'strong' | 'medium' | 'weak' | 'off' | 'inherit'

export type ResolvedLevel = Exclude<ProactivityLevel, 'inherit'>

export interface ProactivityLevels {
  global: ResolvedLevel
  perNovel: Record<string, ProactivityLevel>
  perCharacter: Record<string, ProactivityLevel>
}

export interface ResolveProactivityQuery {
  novelId: string | null
  characterId: string | null
}

export function resolveProactivity(
  state: ProactivityLevels,
  query: ResolveProactivityQuery,
): ResolvedLevel {
  if (query.characterId) {
    const charLevel = state.perCharacter[query.characterId]
    if (charLevel && charLevel !== 'inherit') return charLevel
  }
  if (query.novelId) {
    const novelLevel = state.perNovel[query.novelId]
    if (novelLevel && novelLevel !== 'inherit') return novelLevel
  }
  return state.global
}
