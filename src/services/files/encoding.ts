import { readFile, rename, writeFile } from 'node:fs/promises'

export class EncodingError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'EncodingError'
  }
}

const UTF8_BOM_0 = 0xef
const UTF8_BOM_1 = 0xbb
const UTF8_BOM_2 = 0xbf

function hasUtf8Bom(buffer: Buffer): boolean {
  return (
    buffer.length >= 3 &&
    buffer[0] === UTF8_BOM_0 &&
    buffer[1] === UTF8_BOM_1 &&
    buffer[2] === UTF8_BOM_2
  )
}

function decodeStrict(buffer: Buffer, filePath: string): string {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false })
    return decoder.decode(buffer)
  } catch (cause) {
    throw new EncodingError(`檔案不是合法 UTF-8 編碼：${filePath}`, filePath, cause)
  }
}

export async function readUtf8Text(filePath: string): Promise<string> {
  const raw = await readFile(filePath)
  const stripped = hasUtf8Bom(raw) ? raw.subarray(3) : raw
  return decodeStrict(stripped, filePath)
}

export async function writeUtf8Text(filePath: string, text: string): Promise<void> {
  if (text.length > 0 && text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
  }
  await writeFile(filePath, text, { encoding: 'utf-8' })
}

export async function writeUtf8TextAtomic(filePath: string, text: string): Promise<void> {
  if (text.length > 0 && text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
  }
  const tmp = `${filePath}.tmp`
  await writeFile(tmp, text, { encoding: 'utf-8' })
  await rename(tmp, filePath)
}
