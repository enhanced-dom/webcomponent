import castArray from 'lodash.castarray'

import type { IRenderingEngine } from './renderer.types'

export interface IAbstractElement {
  tag: string
  attributes?: Record<string, any>
  children?: (IAbstractElement | string)[]
}

export type ITemplate<T> = (args: T) => IAbstractElement | IAbstractElement[]

export class HtmlRenderer<T> implements IRenderingEngine {
  private _template: ITemplate<T>
  private _stylesRepository: Record<string, string> = {}

  constructor(template: ITemplate<T>) {
    this._template = template
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

  render(node: Element | ShadowRoot, args: T) {
    let newNode = node
    try {
      newNode = node.cloneNode(false) as Element
    } catch {}
    const abstractElements = castArray(this._template(args))
    const renderedNodes = this.createElements(abstractElements).filter((n) => !!n)
    const styles = Object.values(this._stylesRepository)
      .map((s) => `<style>${s}</style>`)
      .join('')
    newNode.innerHTML = `${styles}${renderedNodes.length ? renderedNodes.map((n) => n.outerHTML).join('') : ''}`
    try {
      node.parentNode.replaceChild(newNode, node)
    } catch {}
  }

  addStyle(name: string, style: string) {
    this._stylesRepository[name] = style
  }
}
