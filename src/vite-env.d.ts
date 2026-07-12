/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to "1" to fetch real ATS jobs instead of the fixture pipeline. */
  readonly VITE_LIVE_JOBS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
