import type { SpectraApi } from '../../electron/preload'

declare global {
  interface Window {
    api: SpectraApi
  }
}

export {}
