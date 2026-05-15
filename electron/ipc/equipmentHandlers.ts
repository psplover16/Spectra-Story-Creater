import {
  deleteEquipment,
  listEquipment,
  readEquipment,
  writeEquipment,
} from '../../src/services/files/equipmentRepository'
import type { EquipmentItem } from '../../src/types/equipment'

export const equipmentHandlers = {
  list(novelDir: string): Promise<EquipmentItem[]> {
    return listEquipment(novelDir)
  },
  read(novelDir: string, equipmentId: string): Promise<EquipmentItem | null> {
    return readEquipment(novelDir, equipmentId)
  },
  write(novelDir: string, item: EquipmentItem): Promise<EquipmentItem> {
    return writeEquipment(novelDir, item)
  },
  delete(novelDir: string, equipmentId: string): Promise<void> {
    return deleteEquipment(novelDir, equipmentId)
  },
} as const

export interface IpcLike {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void
}

export function registerEquipmentHandlers(ipc: IpcLike): void {
  ipc.handle('equipment:list', (_e, dir) => equipmentHandlers.list(dir as string))
  ipc.handle('equipment:read', (_e, dir, id) =>
    equipmentHandlers.read(dir as string, id as string),
  )
  ipc.handle('equipment:write', (_e, dir, item) =>
    equipmentHandlers.write(dir as string, item as EquipmentItem),
  )
  ipc.handle('equipment:delete', (_e, dir, id) =>
    equipmentHandlers.delete(dir as string, id as string),
  )
}
