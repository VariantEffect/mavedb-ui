declare module 'fasta-js' {
  export default class Fasta {
    parse(text: string): Array<{id: string; description: string; sequence: string}>
  }
}

declare module "vue-debounce" {
  function debounce(fn: (arg: any) => any, interval: string | number): void
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.svg' {
  const src: string
  export default src
}
