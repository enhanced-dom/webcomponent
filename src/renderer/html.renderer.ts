import castArray from 'lodash.castarray'
import { StylesheetsRepository } from '@enhanced-dom/css'

import type { IRenderingEngine, IAbstractNode, ITemplate, IAbstractElement } from './renderer.types'
import { TemplateDiffErrorEvent, TemplateRenderErrorEvent } from './renderer.events'
import {
  AbstractDomIncrementalDiff,
  AbstractDomOperationType,
  IAbstractDomOperation,
  IAddOperation,
  IInsertOperation,
  IModifyOperation,
  IMoveOperation,
  IRemoveOperation,
  IReplaceOperation,
  isAbstractElement,
} from './abstract.renderer'

export class HtmlRenderer<T> implements IRenderingEngine {
  private _template: ITemplate<T>
  private _fallback: ITemplate<T>
  private _name?: string
  static eventEmitterType = '@enhanced-dom/htmlRenderer'
  private _stylesRepository: Record<string, string> = {}
  private _stylesheetsRepository: StylesheetsRepository = new StylesheetsRepository(document)
  private _abstractDomDiff = new AbstractDomIncrementalDiff()

  constructor(...args: [ITemplate<T>] | [ITemplate<T>, ITemplate<T>] | [string, ITemplate<T>] | [string, ITemplate<T>, ITemplate<T>]) {
    if (args.length === 1) {
      this._name = 'Unknown'
      this._template = args[0]
      // eslint-disable-next-line react/display-name
      this._fallback = () => null
    } else if (args.length === 3) {
      this._name = args[0]
      this._template = args[1]
      this._fallback = args[2]
    } else if (typeof args[0] === 'string') {
      this._name = args[0]
      this._template = args[1]
      // eslint-disable-next-line react/display-name
      this._fallback = () => null
    } else {
      this._name = 'Unknown'
      this._template = args[0]
      this._fallback = args[1]
    }

    this._stylesheetsRepository = new StylesheetsRepository(document, { type: HtmlRenderer.eventEmitterType, id: this._name })
  }

  private _getAdoptedStylesheetContents = (title: string) => {
    if (!title) return ''
    const stylesheetToAdopt = this._stylesheetsRepository.getStylesheet(title)
    if (stylesheetToAdopt) {
      return Array.from(stylesheetToAdopt.cssRules)
        .map((rule) => rule.cssText)
        .join('')
    }
    return ''
  }

  private _serializeAttributeValue(attributeValue: any) {
    if (typeof attributeValue === 'boolean') {
      if (attributeValue) {
        return ''
      }
    } else if (typeof attributeValue === 'string') {
      return attributeValue
    } else if (typeof attributeValue === 'number') {
      return attributeValue.toString()
    } else if (attributeValue != null) {
      return JSON.stringify(attributeValue)
    }
    return null
  }

  private _createDomNode = (ae?: IAbstractNode) => {
    if (ae == null) {
      return null
    }
    if (!isAbstractElement(ae)) {
      if (ae.content == null) {
        return null
      }
      return document.createTextNode(ae.content?.toString())
    }

    const { tag, attributes = {}, children = [] } = ae
    let node: Element | DocumentFragment = null
    if (tag === 'fragment') {
      node = document.createDocumentFragment()
    } else {
      const element = document.createElement(tag)
      Object.keys(attributes).forEach((attrName) => {
        const serializedAttributeValue = this._serializeAttributeValue(attributes[attrName])
        if (serializedAttributeValue != null) {
          element.setAttribute(attrName, serializedAttributeValue)
        }
      })
      if (tag === 'style' && !children.length) {
        element.innerText = this._getAdoptedStylesheetContents(attributes.title)
      }

      node = element
    }

    const childNodes = this._createDomNodes(children.filter((c) => c !== null))

    childNodes.forEach((n) => node.appendChild(n))

    return node
  }

  private _createDomNodes = (aes?: IAbstractNode[]) => {
    return aes?.map(this._createDomNode) ?? []
  }

  private _getAbstractStyleNodes(): IAbstractNode[] {
    return Object.entries(this._stylesRepository).map(([stylesheetName, stylesheetContents]) => {
      const stylesheetNode: IAbstractElement = {
        tag: 'style',
        attributes: {
          title: stylesheetName,
        },
      }
      if (stylesheetContents) {
        stylesheetNode.children = [
          {
            content: stylesheetContents,
          },
        ]
      }

      return stylesheetNode
    })
  }

  private _getAbstractTemplateNodes(args: T): IAbstractNode[] {
    return castArray(this._template(args))
  }

  private _getAbstractFallbackNodes(args: T) {
    return castArray(this._fallback(args))
  }

  private _getDomNodeByPath(node: Element | ShadowRoot | DocumentFragment, path: string) {
    const splitPath = path.split(AbstractDomIncrementalDiff.separators.path)
    let finalNode: Node = node
    splitPath.some((pathPart) => {
      if (pathPart.startsWith(AbstractDomIncrementalDiff.separators.attribute)) {
        return true
      } else {
        // children pathPart
        const subpathParts = pathPart.split(AbstractDomIncrementalDiff.separators.childIdx)
        if (subpathParts.length > 1) {
          // we should definitely access a child
          const childIndex = parseInt(subpathParts[1].split('.')[0], 10)
          finalNode = finalNode?.childNodes?.[childIndex]
        }
      }
    })
    return finalNode
  }

  private _processAddOperation(node: Element | ShadowRoot | DocumentFragment, operation: IAddOperation) {
    const childToAdd = this._createDomNode(operation.data)
    const parentNode = this._getDomNodeByPath(node, operation.path)
    parentNode.appendChild(childToAdd)
  }

  private _processMoveOperation(node: Element | ShadowRoot | DocumentFragment, operation: IMoveOperation) {
    const childToMove = this._getDomNodeByPath(node, operation.path) as ChildNode
    const parentNode = childToMove.parentNode
    const allParentChildren = Array.from(parentNode.childNodes).filter((n) => n !== childToMove) as Node[]
    allParentChildren.splice(operation.data, 0, childToMove)
    allParentChildren.forEach((c) => parentNode.appendChild(c))
  }

  private _processRemoveOperation(node: Element | ShadowRoot | DocumentFragment, operation: IRemoveOperation) {
    const nodeToRemove = this._getDomNodeByPath(node, operation.path)
    const isRemoveAllChildren = operation.path.endsWith('children')
    if (node !== nodeToRemove && !isRemoveAllChildren) {
      const parentNode = nodeToRemove.parentNode
      parentNode.removeChild(nodeToRemove)
    } else {
      Array.from(node.childNodes).forEach((cn) => node.removeChild(cn))
    }
  }

  private _processReplaceOperation(node: Element | ShadowRoot | DocumentFragment, operation: IReplaceOperation) {
    const nodeToReplace = this._getDomNodeByPath(node, operation.path) as ChildNode
    const newNode = this._createDomNode(operation.data)
    const parentNode = nodeToReplace.parentNode
    const allParentChildren = Array.from(parentNode.childNodes) as Node[]
    allParentChildren.splice(allParentChildren.indexOf(nodeToReplace), 0, newNode)
    allParentChildren.forEach((c) => parentNode.appendChild(c))
  }

  private _processModifyOperation(node: Element | ShadowRoot | DocumentFragment, operation: IModifyOperation) {
    const nodeToModify = this._getDomNodeByPath(node, operation.path) as Element
    const attrName = operation.path.split(AbstractDomIncrementalDiff.separators.attribute)[1]
    const serializedAttributeValue = this._serializeAttributeValue(operation.data)
    if (serializedAttributeValue != null) {
      nodeToModify.setAttribute(attrName, serializedAttributeValue)
    } else {
      nodeToModify.removeAttribute(attrName)
    }
  }

  private _processInsertOperation(node: Element | ShadowRoot | DocumentFragment, operation: IInsertOperation) {
    const existentChild = this._getDomNodeByPath(node, operation.path)
    const newNode = this._createDomNode(operation.data)
    if (existentChild) {
      existentChild.parentNode.insertBefore(newNode, existentChild)
    } else {
      const parentNode = this._getDomNodeByPath(
        node,
        operation.path.slice(0, operation.path.lastIndexOf(AbstractDomIncrementalDiff.separators.childIdx)),
      )
      parentNode.appendChild(newNode)
    }
  }

  render(node: Element | ShadowRoot, args: T) {
    let operations: IAbstractDomOperation[] = []
    try {
      const styleNodes = this._getAbstractStyleNodes()
      const templateNodes = this._getAbstractTemplateNodes(args)
      operations = this._abstractDomDiff.diff({ tag: 'fragment', children: [...styleNodes, ...templateNodes] })
    } catch {
      document.dispatchEvent(new TemplateDiffErrorEvent({ emitter: { type: HtmlRenderer.eventEmitterType, id: this._name } }))
      const fallbackNodes = this._getAbstractFallbackNodes(args)
      operations = this._abstractDomDiff.diff({ tag: 'fragment', children: [...fallbackNodes] })
    }

    try {
      operations.forEach((operation) => {
        switch (operation.type) {
          case AbstractDomOperationType.ADD:
            this._processAddOperation(node, operation)
            break
          case AbstractDomOperationType.MOVE:
            this._processMoveOperation(node, operation)
            break
          case AbstractDomOperationType.REMOVE:
            this._processRemoveOperation(node, operation)
            break
          case AbstractDomOperationType.REPLACE:
            this._processReplaceOperation(node, operation)
            break
          case AbstractDomOperationType.MODIFY:
            this._processModifyOperation(node, operation)
            break
          case AbstractDomOperationType.INSERT:
            this._processInsertOperation(node, operation)
            break
        }
      })
    } catch (ex) {
      document.dispatchEvent(new TemplateRenderErrorEvent({ emitter: { type: HtmlRenderer.eventEmitterType, id: this._name } }))
    }
  }

  addStyle(name: string, style?: string) {
    this._stylesRepository[name] = style
  }
}
