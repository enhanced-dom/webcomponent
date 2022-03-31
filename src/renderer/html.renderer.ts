import castArray from 'lodash.castarray'

import type { IRenderingEngine, IAbstractElement, ITemplate } from './renderer.types'
import { FailedNodeCloneEvent, FailedNodeInsertEvent, TemplateRenderErrorEvent } from './renderer.events'
import { StylesheetsRepository } from '@enhanced-dom/css'


export class HtmlRenderer<T> implements IRenderingEngine {
  private _template: ITemplate<T>
  private _fallback: ITemplate<T>
  private _name?: string
  static eventEmitterType = '@enhanced-dom/htmlRenderer'
  private _stylesRepository: Record<string, string> = {}
  private _stylesheetsRepository: StylesheetsRepository = new StylesheetsRepository(document)

  constructor(...args: [ITemplate<T>] | [ITemplate<T>, ITemplate<T>] | [string, ITemplate<T>] | [string, ITemplate<T>, ITemplate<T>]) {
    if (args.length === 1) {
      this._name = 'Unknown'
      this._template = args[0]
      this._fallback = () => null
    } else if (args.length === 3) {
      this._name = args[0]
      this._template = args[1]
      this._fallback = args[2]
    } else if (typeof args[0] === 'string') {
      this._name = args[0]
      this._template = args[1]
      this._fallback = () => null
    } else {
      this._name = 'Unknown'
      this._template = args[0]
      this._fallback = args[1]
    }

    this._stylesheetsRepository = new StylesheetsRepository(document, {type: HtmlRenderer.eventEmitterType, id: this._name})
  }

  createElement = (ae?: IAbstractElement | string | null) => {
    if (ae == null) {
      return null
    }
    if (typeof ae === 'string') {
      return ae
    }

    const { tag, attributes = {}, children = [] } = ae

    const serializedAttributes = Object.keys(attributes).reduce((acc, attr) => {
      if (typeof attributes[attr] === 'boolean') {
        if (attributes[attr]) {
          acc[attr] = ''
        }
      } else if (attributes[attr] != null) {
        acc[attr] = JSON.stringify(attributes[attr])
      }
      return acc
    }, {})
    
    const innerHtml = this.createElements(children
      .filter((c) => c !== null))
      .join('')
    return `<${tag} ${Object.keys(serializedAttributes).map(k => `${k}=${serializedAttributes[k]}`).join(' ')}>${innerHtml}</${tag}>`
  }

  createElements = (aes?: (string | IAbstractElement)[]) => {
    return aes?.map(this.createElement) ?? []
  }

  getFallbackMarkup(args: T) {
    const abstractElements = castArray(this._fallback(args))
    const renderedNodes = this.createElements(abstractElements).filter((n) => !!n)
    return renderedNodes.length ? renderedNodes.map((n) => n.outerHTML).join('') : ''
  }

  getTemplateMarkup(args: T) {
    const abstractElements = castArray(this._template(args))
    const renderedNodes = this.createElements(abstractElements).filter(n => !!n)
    return renderedNodes.length ? renderedNodes : ''
  }

  getStylesMarkup(node?: Element | ShadowRoot) {
    return Object.entries(this._stylesRepository)
      .map(([stylesheetName, stylesheetContents]) => {
        if (node?.querySelector(`style[title="${stylesheetName}"]`)) {
          return node?.querySelector(`style[title="${stylesheetName}"]`).outerHTML
        }
        if (stylesheetContents) {
          return `<style title="${stylesheetName}">${stylesheetContents}</style>`
        } else {
          
          const stylesheetToAdopt = this._stylesheetsRepository.getStylesheet(stylesheetName)
          if (!stylesheetToAdopt) {
            return ''
          }
          const stylesheetContentsToAdopt = Array.from(stylesheetToAdopt.cssRules).map(rule => rule.cssText).join('')
          return `<style title="${stylesheetName}">${stylesheetContentsToAdopt}</style>`
        }
      })
      .join('')
  }

  render(node: Element | ShadowRoot, args: T) {
    let newNode = node
    try {
      newNode = node.parentNode ? node.cloneNode(false) as Element : node
    } catch {
      document.dispatchEvent(new FailedNodeCloneEvent({emitter: {type: HtmlRenderer.eventEmitterType, id: this._name}}))
      return
    }
    try {
      const templateMarkup = this.getTemplateMarkup(args)
      const stylesMarkup = this.getStylesMarkup(node)
      newNode.innerHTML = `${stylesMarkup}${templateMarkup}`
    } catch {
      document.dispatchEvent(new TemplateRenderErrorEvent({emitter: {type: HtmlRenderer.eventEmitterType, id: this._name}}))
      newNode.innerHTML = this.getFallbackMarkup(args)
    }
   
    try {
      node.parentNode?.replaceChild(newNode, node)
    } catch {
      document.dispatchEvent(new FailedNodeInsertEvent({emitter: {type: HtmlRenderer.eventEmitterType, id: this._name}}))
      return
    }
  }

  addStyle(name: string, style?: string) {
    this._stylesRepository[name] = style
  }
}
