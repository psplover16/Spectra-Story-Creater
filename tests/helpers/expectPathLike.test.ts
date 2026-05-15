import { describe, expect, it, vi } from 'vitest'

import { expectPathLike, isPathLike } from './expectPathLike'

describe('expectPathLike helper', () => {
  it('matches a Windows-style path that ends at the novel folder', () => {
    expect(isPathLike('D:\\Novels\\鹿鼎記', 'D:/Novels', '鹿鼎記')).toBe(true)
  })

  it('matches a POSIX path that ends at the novel folder', () => {
    expect(isPathLike('/home/user/Novels/鹿鼎記', '/home/user/Novels', '鹿鼎記')).toBe(true)
  })

  it('rejects a path whose last segment does not match the novel name', () => {
    expect(isPathLike('D:/Novels/笑傲江湖', 'D:/Novels', '鹿鼎記')).toBe(false)
  })

  it('rejects a non-string value', () => {
    expect(isPathLike(undefined, 'D:/Novels', '鹿鼎記')).toBe(false)
    expect(isPathLike(123, 'D:/Novels', '鹿鼎記')).toBe(false)
  })

  it('rejects a path that does not start under the workspace root', () => {
    expect(isPathLike('E:/Other/鹿鼎記', 'D:/Novels', '鹿鼎記')).toBe(false)
  })

  it('works as an asymmetric matcher inside toHaveBeenCalledWith', () => {
    const fn = vi.fn()
    fn('D:\\Novels\\鹿鼎記', { some: 'payload' })
    expect(fn).toHaveBeenCalledWith(
      expectPathLike('D:/Novels', '鹿鼎記'),
      expect.objectContaining({ some: 'payload' }),
    )
  })

  it('fails an asymmetric match when the value is a UUID rather than a path', () => {
    const matcher = expectPathLike('D:/Novels', '鹿鼎記')
    expect(matcher.asymmetricMatch('32ee689d-b641-4f83-abea-6aea9feae143')).toBe(false)
  })
})
