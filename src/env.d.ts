declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface Window {
  userProperties: Record<string, unknown>
  wallpaperPropertyListener?: {
    applyUserProperties(properties: Record<string, { value: unknown }>): void
  }
}
