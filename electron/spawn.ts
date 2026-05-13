/**
 * 提供 spawn child_process 時要強制套用的 UTF-8 環境變數，
 * 對應 Risk「Windows code page 950 與 UTF-8 衝突」的 mitigation。
 *
 * 子行程（如 Codex CLI / Claude Code）stdout 應一律 UTF-8 解碼，
 * 不應沿用 Windows 預設 code page。
 */
export interface SpawnEnvOptions {
  baseEnv?: NodeJS.ProcessEnv
}

export function buildSpawnEnv(opts: SpawnEnvOptions = {}): NodeJS.ProcessEnv {
  const base = opts.baseEnv ?? process.env
  return {
    ...base,
    PYTHONIOENCODING: 'utf-8',
    LANG: base['LANG'] ?? 'en_US.UTF-8',
    LC_ALL: base['LC_ALL'] ?? 'en_US.UTF-8',
    NODE_OPTIONS: [base['NODE_OPTIONS'] ?? '', '--use-largepages=off']
      .filter((x) => x.length > 0)
      .join(' '),
    // Windows-specific: Force UTF-8 code page for child processes
    // 65001 是 Windows code page for UTF-8
    SPECTRA_CHCP: '65001',
  }
}
