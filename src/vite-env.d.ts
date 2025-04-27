/// <reference types="vite/client" />

declare module '*.svg' {
  import type { ComponentProps } from 'solid-js'
  const SVGComponent: (props: ComponentProps<'svg'>) => JSX.Element
  export default SVGComponent
}

declare module '*.png' {
  const ref: string
  export default ref
}

declare module '*.jpg' {
  const ref: string
  export default ref
}

declare module '*.jpeg' {
  const ref: string
  export default ref
} 