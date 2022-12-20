import castArray from 'lodash.castarray'
import { STYLESHEET_ATTRIBUTE_NAME } from '@enhanced-dom/css'
import { isAbstractElement, StylesTracker, HtmlRenderer, IAbstractNode, IHtmlRenderer, IStylesTracker } from '@enhanced-dom/dom'

import type { IRenderingEngine, ITemplate, IHtmlRendererFactory } from './webcomponent.types'
import { TemplateGenerationFallbackErrorEvent, TemplateGenerationMainErrorEvent } from './webcomponent.events'

let htmlRenderer: IHtmlRendererFactory = HtmlRenderer

export const registerHtmlRenderer = (rendererType: IHtmlRendererFactory) => {
  htmlRenderer = rendererType
}

export class WebcomponentRenderer<T extends Record<string, any>> implements IRenderingEngine {
  private _template: ITemplate<T>
  private _fallback: ITemplate<T> = () => null
  private _renderArgsCache?: [Element | ShadowRoot | DocumentFragment, T]
  private _stylesListenerId: string
  private _name = 'Unknown'
  private _htmlRenderer: IHtmlRenderer
  static eventEmitterType = '@enhanced-dom/webcomponentRenderer'
  static stylesTracker: IStylesTracker = new StylesTracker()

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

    this._stylesListenerId = WebcomponentRenderer.stylesTracker.registerListener(this.rerender)
    this._htmlRenderer = new htmlRenderer(this._name)
  }

  private _getClassNames = (nodes?: IAbstractNode[]) => {
    const classNames = new Set<string>()
    nodes?.forEach((n) => {
      if (isAbstractElement(n)) {
        n.attributes?.class?.split(' ')?.forEach((className: string) => {
          if (className !== '') {
            classNames.add(className)
          }
        })
        this._getClassNames(n.children).forEach((className: string) => classNames.add(className))
      }
    })
    return Array.from(classNames)
  }

  private _getAbstractStyleNodes(templateNodes?: IAbstractNode[]): IAbstractNode[] {
    const classNamesFromTemplateNodes = this._getClassNames(templateNodes)
    const stylesToCopy = WebcomponentRenderer.stylesTracker.getStyles(classNamesFromTemplateNodes, this._stylesListenerId)
    return [
      {
        tag: 'style',
        attributes: {
          type: 'text/css',
          [STYLESHEET_ATTRIBUTE_NAME]: `copied-styles-${JSON.stringify(classNamesFromTemplateNodes)}`,
        },
        children: [
          {
            content: stylesToCopy,
          },
        ],
      },
    ]
  }

  private _getAbstractTemplateNodes(args: T): IAbstractNode[] {
    return castArray(this._template(args))
  }

  private _getAbstractFallbackNodes(args: T) {
    return castArray(this._fallback(args))
  }

  render(node: Element | ShadowRoot | DocumentFragment, args: T) {
    this._renderArgsCache = [node, args]
    let template: IAbstractNode[] = undefined
    try {
      const templateNodes = this._getAbstractTemplateNodes(args)
      const styleNodes = this._getAbstractStyleNodes(templateNodes)
      template = [...styleNodes, ...templateNodes]
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

  cleanup() {
    WebcomponentRenderer.stylesTracker.unregisterListener(this._stylesListenerId)
  }
}
