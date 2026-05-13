import { exportChapter, type HtmlExporterInput } from '../../src/services/export/htmlExporter'

export const exportHandlers = {
  chapter(input: HtmlExporterInput) {
    return exportChapter(input)
  },
} as const

export interface IpcLike {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void
}

export function registerExportHandlers(ipc: IpcLike): void {
  ipc.handle('export:chapter', (_e, input) => exportHandlers.chapter(input as HtmlExporterInput))
}
