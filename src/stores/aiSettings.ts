import { defineStore } from 'pinia'

import type { AiRole, AiSource, HitLayer } from '@/types/ai'

export type ProactivityLevel = 'strong' | 'medium' | 'weak' | 'off' | 'inherit'

export interface BindingState {
  globalDefault: AiSource
  /** role -> AiSource，特別職能對應特定 CLI */
  roleBindings: Partial<Record<AiRole, AiSource>>
  /** characterId -> AiSource */
  characterBindings: Record<string, AiSource>
  /** paragraphId -> AiSource，段落級覆寫 */
  paragraphBindings: Record<string, AiSource>
}

export interface ProactivityState {
  global: Exclude<ProactivityLevel, 'inherit'>
  perNovel: Record<string, ProactivityLevel>
  perCharacter: Record<string, ProactivityLevel>
}

interface AiSettingsState {
  binding: BindingState
  proactivity: ProactivityState
}

export interface ResolveAiSourceQuery {
  role: AiRole
  characterId?: string
  paragraphId?: string
}

export interface ResolveAiSourceResult {
  source: AiSource
  hitLayer: HitLayer
}

export interface ResolveProactivityQuery {
  novelId: string | null
  characterId: string | null
}

export const useAiSettingsStore = defineStore('aiSettings', {
  state: (): AiSettingsState => ({
    binding: {
      globalDefault: 'codex',
      roleBindings: {},
      characterBindings: {},
      paragraphBindings: {},
    },
    proactivity: {
      global: 'medium',
      perNovel: {},
      perCharacter: {},
    },
  }),
  actions: {
    setGlobalDefault(source: AiSource): void {
      this.binding.globalDefault = source
    },
    setRoleBinding(role: AiRole, source: AiSource | null): void {
      if (source === null) {
        delete this.binding.roleBindings[role]
      } else {
        this.binding.roleBindings[role] = source
      }
    },
    setCharacterBinding(characterId: string, source: AiSource | null): void {
      if (source === null) {
        delete this.binding.characterBindings[characterId]
      } else {
        this.binding.characterBindings[characterId] = source
      }
    },
    setParagraphBinding(paragraphId: string, source: AiSource | null): void {
      if (source === null) {
        delete this.binding.paragraphBindings[paragraphId]
      } else {
        this.binding.paragraphBindings[paragraphId] = source
      }
    },
    setGlobalProactivity(level: Exclude<ProactivityLevel, 'inherit'>): void {
      this.proactivity.global = level
    },
    setNovelProactivity(novelId: string, level: ProactivityLevel | null): void {
      if (level === null) {
        delete this.proactivity.perNovel[novelId]
      } else {
        this.proactivity.perNovel[novelId] = level
      }
    },
    setCharacterProactivity(characterId: string, level: ProactivityLevel | null): void {
      if (level === null) {
        delete this.proactivity.perCharacter[characterId]
      } else {
        this.proactivity.perCharacter[characterId] = level
      }
    },
    resolveAiSource(query: ResolveAiSourceQuery): ResolveAiSourceResult {
      const { role, characterId, paragraphId } = query
      if (paragraphId && paragraphId in this.binding.paragraphBindings) {
        return { source: this.binding.paragraphBindings[paragraphId]!, hitLayer: 'paragraph' }
      }
      const roleSrc = this.binding.roleBindings[role]
      if (roleSrc) {
        return { source: roleSrc, hitLayer: 'role' }
      }
      if (characterId && characterId in this.binding.characterBindings) {
        return { source: this.binding.characterBindings[characterId]!, hitLayer: 'character' }
      }
      return { source: this.binding.globalDefault, hitLayer: 'global' }
    },
    resolveProactivity(query: ResolveProactivityQuery): Exclude<ProactivityLevel, 'inherit'> {
      const characterLevel =
        query.characterId !== null ? this.proactivity.perCharacter[query.characterId] : undefined
      if (characterLevel && characterLevel !== 'inherit') return characterLevel
      const novelLevel =
        query.novelId !== null ? this.proactivity.perNovel[query.novelId] : undefined
      if (novelLevel && novelLevel !== 'inherit') return novelLevel
      return this.proactivity.global
    },
  },
})
