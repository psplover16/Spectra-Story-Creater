import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { EncodingError, readUtf8Text, writeUtf8Text } from '@/services/files/encoding'

const TMP_ROOT = path.join(tmpdir(), 'spectra-encoding-tests')

async function tmpFile(name: string): Promise<string> {
  await mkdir(TMP_ROOT, { recursive: true })
  return path.join(TMP_ROOT, name)
}

describe('encoding 服務（UTF-8 無 BOM）', () => {
  beforeEach(async () => {
    await mkdir(TMP_ROOT, { recursive: true })
  })

  afterEach(async () => {
    await rm(TMP_ROOT, { recursive: true, force: true })
  })

  it('writeUtf8Text 寫入後檔案內容不得含 BOM 開頭', async () => {
    const file = await tmpFile('no-bom.json')
    await writeUtf8Text(file, '{"name":"鹿鼎記"}')
    const raw = await readFile(file)
    expect(raw[0]).not.toBe(0xef)
    expect(raw[1]).not.toBe(0xbb)
    expect(raw[2]).not.toBe(0xbf)
    expect(raw.toString('utf-8')).toBe('{"name":"鹿鼎記"}')
  })

  it('readUtf8Text 能讀取帶 BOM 的 UTF-8 檔，且回傳值不含 BOM', async () => {
    const file = await tmpFile('with-bom.json')
    const bom = Buffer.from([0xef, 0xbb, 0xbf])
    const body = Buffer.from('{"name":"鹿鼎記"}', 'utf-8')
    await writeFile(file, Buffer.concat([bom, body]))
    const text = await readUtf8Text(file)
    expect(text).toBe('{"name":"鹿鼎記"}')
    expect(text.charCodeAt(0)).not.toBe(0xfeff)
  })

  it('readUtf8Text 對無法以 UTF-8 解碼的 byte 序列拋 EncodingError', async () => {
    const file = await tmpFile('not-utf8.json')
    await writeFile(file, Buffer.from([0xff, 0xfe, 0x4a, 0x00, 0x73, 0x00]))
    await expect(readUtf8Text(file)).rejects.toBeInstanceOf(EncodingError)
  })
})
