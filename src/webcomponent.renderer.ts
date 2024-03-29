import castArray from 'lodash.castarray'
import { HtmlRenderer, type IAbstractNode, type IHtmlRenderer } from '@enhanced-dom/dom'

import type { IRenderingEngine, ITemplate, IHtmlRendererFactory } from './webcomponent.types'
import { TemplateGenerationFallbackErrorEvent, TemplateGenerationMainErrorEvent } from './webcomponent.events'

let htmlRendererFactory: IHtmlRendererFactory = HtmlRenderer

export const registerHtmlRenderer = (rendererType: IHtmlRendererFactory) => {
  htmlRendererFactory = rendererType
}

export class WebcomponentRenderer<T extends Record<string, any>> implements IRenderingEngine {
  private _template: ITemplate<T>
  private _fallback: ITemplate<T> = () => null
  private _renderArgsCache?: [ShadowRoot | Document, T]
  private _name = 'Unknown'
  private _htmlRenderer: IHtmlRenderer
  static eventEmitterType = '@enhanced-dom/webcomponentRenderer'

  constructor(...args: [ITemplate<T>] | [ITemplate<T>, ITemplate<T>] | [string, ITemplate<T>] | [string, ITemplate<T>, ITemplate<T>]) {
    if (args.length === 1) {
      this._template = args[0]
    } else if (args.length === 3) {
      this._name = args[0]
      this._template = args[1]
      this._fallback = args[2]
    } else if (typeof args[0] === 'string') {
      this._name = args[0]
      this._template = args[1]
    } else {
      this._template = args[0]
      this._fallback = args[1]
    }

    this._htmlRenderer = new htmlRendererFactory(this._name)
  }

  private _getAbstractTemplateNodes(args: T): IAbstractNode[] {
    return castArray(this._template(args))
  }

  private _getAbstractFallbackNodes(args: T) {
    return castArray(this._fallback(args))
  }

  render(node: ShadowRoot | Document, args: T) {
    this._renderArgsCache = [node, args]
    let template: IAbstractNode[] = undefined
    try {
      template = this._getAbstractTemplateNodes(args)
    } catch (mainTemplateException) {
      document.dispatchEvent(
        new TemplateGenerationMainErrorEvent({
          emitter: { type: WebcomponentRenderer.eventEmitterType, id: this._name },
          args,
          template: 'main',
          exception: mainTemplateException,
        }),
      )
      try {
        template = this._getAbstractFallbackNodes(args)
      } catch (fallbackTemplateException) {
        document.dispatchEvent(
          new TemplateGenerationFallbackErrorEvent({
            emitter: { type: WebcomponentRenderer.eventEmitterType, id: this._name },
            args,
            template: 'fallback',
            exception: fallbackTemplateException,
          }),
        )
        template = []
      }
    }
    this._htmlRenderer.render(node, template)
  }

  rerender = () => {
    if (this._renderArgsCache) {
      this.render(...this._renderArgsCache)
    }
  }

  clear = () => {
    if (this._renderArgsCache) {
      this._htmlRenderer.render(this._renderArgsCache[0], [])
    }
  }

  cleanup = () => {}
}
