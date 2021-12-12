import castArray from 'lodash.castarray'

import type { IRenderingEngine } from './renderer.types'
import { UnknownStylesheetEvent, FailedNodeCloneEvent, FailedNodeInsertEvent, TemplateRenderErrorEvent } from './renderer.events'

export interface IAbstractElement {
  tag: string
  attributes?: Record<string, any>
  children?: (IAbstractElement | string)[]
}

export type ITemplate<T> = (args?: T) => IAbstractElement | IAbstractElement[]

export class HtmlRenderer<T> implements IRenderingEngine {
  private _template: ITemplate<T>
  private _fallback: ITemplate<T>
  private _name?: string
  private _stylesRepository: Record<string, string> = {}

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
  }

  createElement = (ae?: IAbstractElement) => {
    if (ae == null) {
      return null
    }

    const { tag, attributes = {}, children = [] } = ae

    const element = document.createElement(tag)

    for (const attr in attributes) {
      if (typeof attributes[attr] === 'boolean') {
        if (attributes[attr]) {
          element.setAttribute(attr, '')
        }
      } else if (attributes[attr] != null) {
        element.setAttribute(attr, attributes[attr].toString())
      }
    }

    const innerHtml = children
      .filter((c) => c !== null)
      .map((child) => {
        if (typeof child === 'string') {
          return child
        }
        return this.createElement(child).outerHTML
      })
      .join('')
    if (innerHtml !== '') {
      element.innerHTML = innerHtml
    }
    return element
  }

  createElements = (aes?: IAbstractElement[]) => {
    return aes?.map(this.createElement) ?? []
  }

  getFallbackMarkup(args: T) {
    const abstractElements = castArray(this._fallback(args))
    const renderedNodes = this.createElements(abstractElements).filter((n) => !!n)
    return renderedNodes.length ? renderedNodes.map((n) => n.outerHTML).join('') : ''
  }

  getTemplateMarkup(args: T) {
    const abstractElements = castArray(this._template(args))
    const renderedNodes = this.createElements(abstractElements).filter((n) => !!n)
    return renderedNodes.length ? renderedNodes.map((n) => n.outerHTML).join('') : ''
  }

  getStylesMarkup() {
    return Object.entries(this._stylesRepository)
      .map(([stylesheetName, stylesheetContents]) => {
        if (stylesheetContents) {
          return `<style title="${stylesheetName}">${stylesheetContents}</style>`
        } else {
          const stylesheetToAdopt = Array.from(document.styleSheets).find(s => s.title === stylesheetName)
          if (!stylesheetToAdopt) {
            document.dispatchEvent(new UnknownStylesheetEvent(stylesheetName, {rendererName: this._name}))
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
      document.dispatchEvent(new FailedNodeCloneEvent({rendererName: this._name}))
      return
    }
    try {
      const templateMarkup = this.getTemplateMarkup(args)
      const stylesMarkup = this.getStylesMarkup()
      newNode.innerHTML = `${stylesMarkup}${templateMarkup}`
    } catch {
      document.dispatchEvent(new TemplateRenderErrorEvent({rendererName: this._name}))
      newNode.innerHTML = this.getFallbackMarkup(args)
    }
   
    try {
      node.parentNode?.replaceChild(newNode, node)
    } catch {
      document.dispatchEvent(new FailedNodeInsertEvent({rendererName: this._name}))
      return
    }
  }

  addStyle(name: string, style?: string) {
    this._stylesRepository[name] = style
  }
}
