import type { IAbstractNode, IHtmlRenderer } from '@enhanced-dom/dom'

export type WebcomponentRendererRootType = Element | ShadowRoot | DocumentFragment

export interface IRenderingEngine<T extends Record<string, any> = Record<string, any>> {
  render: (node: WebcomponentRendererRootType, args?: T) => void
  cleanup: () => void
}

export type ITemplate<T> = (args?: T) => IAbstractNode | IAbstractNode[]

export interface IRenderingEventContext {
  emitter: { type: string; id?: string }
}

export interface IHtmlRendererFactory {
  new (name?: string): IHtmlRenderer
}
