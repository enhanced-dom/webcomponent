export interface IRenderingEngine {
  render: (node: Node, args?: any) => void
  addStyle: (name: string, style?: string) => void
}

export interface IAbstractElement {
  tag: string
  attributes?: Record<string, any>
  children?: (IAbstractElement | string)[]
}

export type ITemplate<T> = (args?: T) => IAbstractElement | IAbstractElement[]