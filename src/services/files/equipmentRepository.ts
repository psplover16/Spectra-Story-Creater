import { mkdir, readdir, rm } from 'node:fs/promises'

import type { EquipmentItem, EquipmentKind } from '@/types/equipment'

import { readUtf8Text, writeUtf8TextAtomic } from './encoding'
import { equipmentDir, equipmentFile } from './paths'

const KINDS: readonly EquipmentKind[] = ['wearable', 'consumable', 'misc']

function normalize(raw: unknown, sourcePath: string): EquipmentItem | null {
  if (raw === null || typeof raw !== 'object') return null
  const obj = raw as Partial<EquipmentItem> & Record<string, unknown>
  if (typeof obj.id !== 'string' || obj.id.length === 0) {
    console.warn(`[equipmentRepository] ${sourcePath} 缺合法 id，跳過`)
    return null
  }
  const item: EquipmentItem = {
    id: obj.id,
    name: typeof obj.name === 'string' ? obj.name : '',
    kind:
      typeof obj.kind === 'string' && (KINDS as readonly string[]).includes(obj.kind)
        ? (obj.kind as EquipmentKind)
        : 'misc',
    defaultEffect: typeof obj.defaultEffect === 'string' ? obj.defaultEffect : '',
  }
  if (typeof obj.notes === 'string') item.notes = obj.notes
  if (
    typeof obj.kind !== 'string' ||
    !(KINDS as readonly string[]).includes(obj.kind)
  ) {
    console.warn(`[equipmentRepository] ${sourcePath} 缺或非法 kind，補 'misc'`)
  }
  if (typeof obj.defaultEffect !== 'string') {
    console.warn(`[equipmentRepository] ${sourcePath} 缺 defaultEffect，補空字串`)
  }
  return item
}

export async function listEquipment(novelDir: string): Promise<EquipmentItem[]> {
  const dir = equipmentDir(novelDir)
  let entries: string[] = []
  try {
    entries = await readdir(dir)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
  const result: EquipmentItem[] = []
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue
    const id = entry.slice(0, -'.json'.length)
    const item = await readEquipment(novelDir, id)
    if (item !== null) result.push(item)
  }
  return result
}

export async function readEquipment(
  novelDir: string,
  equipmentId: string,
): Promise<EquipmentItem | null> {
  const sourcePath = equipmentFile(novelDir, equipmentId)
  try {
    const raw = await readUtf8Text(sourcePath)
    const parsed = JSON.parse(raw) as unknown
    return normalize(parsed, sourcePath)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

export async function writeEquipment(
  novelDir: string,
  item: EquipmentItem,
): Promise<EquipmentItem> {
  if (typeof item.id !== 'string' || item.id.length === 0) {
    throw new Error('EquipmentItem.id 必須為非空字串')
  }
  await mkdir(equipmentDir(novelDir), { recursive: true })
  await writeUtf8TextAtomic(equipmentFile(novelDir, item.id), JSON.stringify(item, null, 2))
  return item
}

export async function deleteEquipment(novelDir: string, equipmentId: string): Promise<void> {
  await rm(equipmentFile(novelDir, equipmentId), { force: true })
}
