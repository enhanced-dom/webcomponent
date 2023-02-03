import type { IAbstractNode, IHtmlRenderer } from '@enhanced-dom/dom'

export interface IRenderingEngine {
  render: (node: ShadowRoot | Document, args?: Record<string, any>) => void
  cleanup: () => void
}

export type ITemplate<T> = (args?: T) => IAbstractNode | IAbstractNode[]

export interface IRenderingEventContext {
  emitter: { type: string; id?: string }
}

export interface IHtmlRendererFactory {
  new (name?: string): IHtmlRenderer
}
