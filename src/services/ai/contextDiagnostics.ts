import type { AssemblerDiagnostics } from './contextAssembler'

export interface ContextDiagnosticsView {
  totalSkipped: number
  skippedByBudget: string[]
  skippedBySize: string[]
}

export function diagnosticsToView(d: AssemblerDiagnostics): ContextDiagnosticsView {
  return {
    totalSkipped: d.skippedByBudget.length + d.skippedBySize.length,
    skippedByBudget: [...d.skippedByBudget],
    skippedBySize: [...d.skippedBySize],
  }
}
