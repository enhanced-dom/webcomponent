export interface IRenderingEngine {
  render: (node: Node, args?: any) => void
  addStyle: (name: string, style?: string) => void
}

export interface IAbstractNodeBase {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  _key?: string
}

export interface IAbstractElement extends IAbstractNodeBase {
  tag: string
  attributes?: Record<string, any>
  children?: IAbstractNode[]
  content?: never
}

export interface IAbstractNonElement extends IAbstractNodeBase {
  tag?: never
  content: string | number | null
}

export type IAbstractNode = IAbstractElement | IAbstractNonElement

export type ITemplate<T> = (args?: T) => IAbstractNode | IAbstractNode[]
