import { describe, expect, it } from 'vitest'
import { reactive, ref } from 'vue'

import { toPlain } from '@/services/ipc/toPlain'

describe('toPlain', () => {
  it('primitives are returned as-is', () => {
    expect(toPlain(1)).toBe(1)
    expect(toPlain('a')).toBe('a')
    expect(toPlain(null)).toBeNull()
    expect(toPlain(true)).toBe(true)
  })

  it('plain object is deep-equal but not the same reference', () => {
    const input = { a: 1, b: { c: [1, 2] } }
    const out = toPlain(input)
    expect(out).toEqual(input)
    expect(out).not.toBe(input)
    expect(out.b).not.toBe(input.b)
  })

  it('reactive Proxy is flattened so the result can be structuredCloned', () => {
    const r = reactive({
      id: 'n1',
      worldview: [{ id: 'w1', title: '魔法系統', content: '元素四系。' }],
    })
    const plain = toPlain(r)
    expect(() => structuredClone(plain)).not.toThrow()
    expect(() => structuredClone(r)).toThrow()
  })

  it('ref.value reactive subtree is flattened too', () => {
    const r = ref({ a: 1, list: [{ x: 1 }] })
    const plain = toPlain(r.value)
    expect(() => structuredClone(plain)).not.toThrow()
    expect(plain).toEqual({ a: 1, list: [{ x: 1 }] })
  })
})
