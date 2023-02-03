import castArray from 'lodash.castarray'
import { STYLESHEET_ATTRIBUTE_NAME } from '@enhanced-dom/css'
import {
  isAbstractElement,
  StylesTracker,
  HtmlRenderer,
  IAbstractNode,
  IHtmlRenderer,
  IStylesTracker,
  IAbstractElement,
} from '@enhanced-dom/dom'

import { INFERRED_STYLESHEET_NAME } from './constants'
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
    this._htmlRenderer = new htmlRendererFactory(this._name)
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

  private _getAdoptedStyles(templateNodes?: IAbstractNode[]): string {
    const classNamesFromTemplateNodes = this._getClassNames(templateNodes)
    return WebcomponentRenderer.stylesTracker.getStyles(classNamesFromTemplateNodes, this._stylesListenerId)
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
    let adoptedStyles: string = undefined
    try {
      template = this._getAbstractTemplateNodes(args)
      adoptedStyles = this._getAdoptedStyles(template)
      let headNode: IAbstractElement = template.find((n) => n.tag === 'head') as IAbstractElement
      if (!headNode) {
        headNode = { tag: 'head' }
        template.unshift(headNode)
      }
      headNode.children = headNode.children ?? []
      headNode.children.unshift({
        tag: 'style',
        attributes: { [STYLESHEET_ATTRIBUTE_NAME]: INFERRED_STYLESHEET_NAME },
        children: [{ content: adoptedStyles }],
      })
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
        adoptedStyles = this._getAdoptedStyles(template)
        let headNode: IAbstractElement = template.find((n) => n.tag === 'head') as IAbstractElement
        if (!headNode) {
          headNode = { tag: 'head' }
          template.unshift(headNode)
        }
        headNode.children = headNode.children ?? []
        headNode.children.unshift({
          tag: 'style',
          attributes: { STYLESHEET_ATTRIBUTE_NAME: INFERRED_STYLESHEET_NAME },
          children: [{ content: adoptedStyles }],
        })
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
