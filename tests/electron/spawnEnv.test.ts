import { describe, expect, it } from 'vitest'

import { buildSpawnEnv } from '../../electron/spawn'

describe('buildSpawnEnv（強制 UTF-8 子行程環境）', () => {
  it('輸出含 PYTHONIOENCODING=utf-8 與 UTF-8 LANG/LC_ALL', () => {
    const env = buildSpawnEnv({ baseEnv: {} })
    expect(env.PYTHONIOENCODING).toBe('utf-8')
    expect(env.LANG).toBe('en_US.UTF-8')
    expect(env.LC_ALL).toBe('en_US.UTF-8')
    expect(env.SPECTRA_CHCP).toBe('65001')
  })

  it('保留呼叫方原有 LANG / LC_ALL', () => {
    const env = buildSpawnEnv({
      baseEnv: { LANG: 'zh_TW.UTF-8', LC_ALL: 'zh_TW.UTF-8' },
    })
    expect(env.LANG).toBe('zh_TW.UTF-8')
    expect(env.LC_ALL).toBe('zh_TW.UTF-8')
    expect(env.PYTHONIOENCODING).toBe('utf-8')
  })

  it('合併 baseEnv 並蓋上強制設定', () => {
    const env = buildSpawnEnv({
      baseEnv: { CUSTOM: 'value', PYTHONIOENCODING: 'latin1' },
    })
    expect(env.CUSTOM).toBe('value')
    expect(env.PYTHONIOENCODING).toBe('utf-8')
  })
})
