/**
 * 把 Vue 3 reactive Proxy 攤平成可被 V8 structured clone 的純物件。
 *
 * Electron 在 `contextIsolation: true` 下，renderer 透過 `window.api.*` 呼叫
 * preload 暴露的函式時，參數會在跨 context bridge 邊界當下做 structured clone。
 * Proxy 物件無法被結構化克隆，會丟出 `An object could not be cloned.`。
 * preload 端的 normalize 來不及救這段，必須在 renderer 出口前先攤平。
 */
export function toPlain<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  return JSON.parse(JSON.stringify(value)) as T
}
