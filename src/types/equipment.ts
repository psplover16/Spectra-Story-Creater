/**
 * 角色裝備／道具資料模型（first-class entity 階段）。
 * 規格：equipment-management、novel-data-model（Character.equipment）、character-management、ai-context。
 */

export type EquipmentKind = 'wearable' | 'consumable' | 'misc'

/**
 * 裝備本體：存於 <novel>/equipment/<id>.json，一件裝備一個檔。
 * 不含 per-character overrides；per-character 補充由 EquipmentReference 承載。
 */
export interface EquipmentItem {
  id: string
  name: string
  kind: EquipmentKind
  defaultEffect: string
  notes?: string
}

/**
 * 角色端持有裝備的引用：指向 EquipmentItem id，並可選地補上對該角色的兩種效果。
 *
 * 三狀態語意（適用 realEffect 與 extraEffect）：
 * - undefined：沿用上一層（realEffect 沿用 defaultEffect；extraEffect 不疊加）
 * - ''（空字串）：明確標示為「無」
 * - 非空字串：採用該值
 */
export interface EquipmentReference {
  equipmentId: string
  realEffect?: string
  extraEffect?: string
}

/**
 * ContextAssembler 對某角色 resolve 後的裝備條目，用於 CharacterSlice。
 */
export interface ResolvedEquipment {
  id: string
  name: string
  kind: EquipmentKind
  effect: string
  hasEffect: boolean
  extraEffect: string
  hasExtra: boolean
}
