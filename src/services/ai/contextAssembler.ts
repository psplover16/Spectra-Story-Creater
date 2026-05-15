import type {
  AssembledContext,
  CharacterSlice,
  ChapterOutlineSlice,
  ChapterSceneSlice,
  ContextAssembler,
  ContextQuery,
  PlotSlice,
  WorldviewSlice,
} from '@/types/ai'
import type { Character } from '@/types/character'
import type { Chapter, Scene } from '@/types/chapter'
import type { EquipmentItem } from '@/types/equipment'
import type { Novel } from '@/types/novel'

import { scoreRelevance } from './relevance'

const EMPTY_SCENE: Scene = { location: '', time: '', weather: '', props: [], mood: '' }

export interface ContextAssemblerDeps {
  loadNovel(novelId: string): Promise<Novel>
  loadCharacters(novelId: string): Promise<Character[]>
  loadChapters(novelId: string): Promise<Chapter[]>
  loadEquipment?(novelId: string): Promise<EquipmentItem[]>
}

export interface AssemblerDiagnostics {
  skippedByBudget: string[]
  skippedBySize: string[]
}

const SLICE_TOKEN_ESTIMATE = (text: string): number => Math.ceil(text.length / 2)

function stableSort<T>(items: T[], compare: (a: T, b: T) => number): T[] {
  return items
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => {
      const c = compare(a.item, b.item)
      return c !== 0 ? c : a.idx - b.idx
    })
    .map((wrapped) => wrapped.item)
}

export interface AssembleResult {
  context: AssembledContext
  diagnostics: AssemblerDiagnostics
}

export function createContextAssembler(deps: ContextAssemblerDeps): ContextAssembler & {
  assembleWithDiagnostics(query: ContextQuery): Promise<AssembleResult>
} {
  async function assembleInner(query: ContextQuery): Promise<AssembleResult> {
    const novel = await deps.loadNovel(query.novelId)
    const characters = await deps.loadCharacters(query.novelId)
    const chapters = await deps.loadChapters(query.novelId)
    const equipmentList = deps.loadEquipment ? await deps.loadEquipment(query.novelId) : []
    const equipmentById = new Map<string, EquipmentItem>()
    for (const eq of equipmentList) equipmentById.set(eq.id, eq)
    const chapter = chapters.find((c) => c.id === query.chapterId)
    const presentCharIds = new Set(chapter?.presentCharacters ?? [])
    const presentFactionIds = new Set<string>()
    for (const c of characters) {
      if (presentCharIds.has(c.id)) {
        for (const fid of c.factionIds) {
          presentFactionIds.add(fid)
        }
      }
    }

    const chapterKeywords = [
      ...(chapter?.outline ?? '').split(/[，。\s]/).filter((s) => s.length > 0),
      ...(chapter?.scene.location ? [chapter.scene.location] : []),
      ...(chapter?.scene.mood ? [chapter.scene.mood] : []),
    ]

    const diagnostics: AssemblerDiagnostics = { skippedByBudget: [], skippedBySize: [] }
    let remainingBudget = Math.max(query.tokenBudget, 0)

    // Worldview
    const worldviewSlices = stableSort(
      novel.worldview.map<WorldviewSlice>((w) => ({
        ...w,
        score: scoreRelevance(
          {
            keywords: w.title.split(/\s+/),
            factionId: null,
            isPresent: false,
          },
          { chapterKeywords, presentFactionIds },
        ),
      })),
      (a, b) => b.score - a.score || a.id.localeCompare(b.id),
    )
    const worldview = take(
      worldviewSlices,
      (s) => s.id,
      (s) => s.content,
      diagnostics,
      () => remainingBudget,
      (n) => (remainingBudget = n),
    )

    // Characters
    const characterSlices = stableSort(
      characters.map<CharacterSlice>((c) => ({
        characterId: c.id,
        name: c.name,
        personality: c.personality,
        abilities: c.abilities,
        factionId: c.factionIds[0] ?? null,
        equipment: (c.equipment ?? []).flatMap((ref) => {
          const item = equipmentById.get(ref.equipmentId)
          if (!item) {
            console.warn(
              `[contextAssembler] dangling equipment reference ${ref.equipmentId} in character ${c.id}`,
            )
            return []
          }
          const effect = ref.realEffect !== undefined ? ref.realEffect : item.defaultEffect
          const extraEffect = ref.extraEffect ?? ''
          return [
            {
              id: item.id,
              name: item.name,
              kind: item.kind,
              effect,
              hasEffect: effect !== '',
              extraEffect,
              hasExtra: ref.extraEffect !== undefined,
            },
          ]
        }),
        score: scoreRelevance(
          {
            keywords: [c.name, c.personality],
            factionId: c.factionIds[0] ?? null,
            isPresent: presentCharIds.has(c.id),
          },
          { chapterKeywords, presentFactionIds },
        ),
      })),
      (a, b) => b.score - a.score || a.characterId.localeCompare(b.characterId),
    )
    const charactersSlice = take(
      characterSlices,
      (s) => s.characterId,
      (s) => `${s.name}: ${s.personality}`,
      diagnostics,
      () => remainingBudget,
      (n) => (remainingBudget = n),
    )

    const overallPlot: PlotSlice = {
      summary: novel.overallOutline.summary,
      chapters: novel.overallOutline.chapters,
    }

    const presentCharacters: CharacterSlice[] = characterSlices.filter((c) =>
      presentCharIds.has(c.characterId),
    )

    const chapterOutline: ChapterOutlineSlice = {
      chapterId: chapter?.id ?? '',
      outline: chapter?.outline ?? '',
    }
    const chapterScene: ChapterSceneSlice = {
      chapterId: chapter?.id ?? '',
      scene: chapter?.scene ?? EMPTY_SCENE,
    }

    return {
      context: {
        worldview,
        characters: charactersSlice,
        overallPlot,
        presentCharacters,
        chapterOutline,
        chapterScene,
      },
      diagnostics,
    }
  }

  return {
    async assemble(query: ContextQuery): Promise<AssembledContext> {
      return (await assembleInner(query)).context
    },
    async assembleWithDiagnostics(query: ContextQuery): Promise<AssembleResult> {
      return assembleInner(query)
    },
  }
}

function take<T>(
  items: T[],
  idOf: (item: T) => string,
  textOf: (item: T) => string,
  diagnostics: AssemblerDiagnostics,
  getRemaining: () => number,
  setRemaining: (n: number) => void,
): T[] {
  const out: T[] = []
  for (const item of items) {
    const cost = SLICE_TOKEN_ESTIMATE(textOf(item))
    if (cost > getRemaining()) {
      // 個別 slice 過大或剩餘預算不足 → 跳過
      if (cost > 200 && out.length === 0) {
        diagnostics.skippedBySize.push(idOf(item))
      } else {
        diagnostics.skippedByBudget.push(idOf(item))
      }
      continue
    }
    setRemaining(getRemaining() - cost)
    out.push(item)
  }
  return out
}
