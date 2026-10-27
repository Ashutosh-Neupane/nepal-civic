/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend base URL, e.g. http://localhost:8080 */
  readonly VITE_API_URL?: string;
  readonly VITE_GEOAPIFY_API_KEY?: string;
  readonly GEOAPIFY_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
