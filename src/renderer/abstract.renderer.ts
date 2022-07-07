import type { IAbstractNode, IAbstractElement } from './renderer.types'
import { SECTION_ID } from '../constants'

export const isAbstractElement = (ae: IAbstractNode): ae is IAbstractElement => {
  return ae != undefined && ae.content === undefined
}

export enum AbstractDomOperationType {
  ADD = 'add',
  REMOVE = 'remove',
  MODIFY = 'modify',
  REPLACE = 'replace',
  INSERT = 'insert',
  MOVE = 'move',
}

interface IOperationBase {
  path: string
}

export interface IAddOperation extends IOperationBase {
  type: AbstractDomOperationType.ADD
  data: IAbstractNode
}

export interface IReplaceOperation extends IOperationBase {
  type: AbstractDomOperationType.REPLACE
  data: IAbstractNode
}

export interface IRemoveOperation extends IOperationBase {
  type: AbstractDomOperationType.REMOVE
}

export interface IMoveOperation extends IOperationBase {
  type: AbstractDomOperationType.MOVE
  data: number
}

export interface IModifyOperation extends IOperationBase {
  type: AbstractDomOperationType.MODIFY
  data: any
}

export interface IInsertOperation extends IOperationBase {
  type: AbstractDomOperationType.INSERT
  data: IAbstractNode
}

export type IAbstractDomOperation =
  | IAddOperation
  | IRemoveOperation
  | IReplaceOperation
  | IMoveOperation
  | IModifyOperation
  | IInsertOperation

export class AbstractDomIncrementalDiff {
  static areMatching(node1: IAbstractNode, node2: IAbstractNode) {
    const getNodeIdentifier = (node: IAbstractNode) => {
      if (isAbstractElement(node)) {
        const tag = node.tag
        let key = node._key ?? node.attributes?.[SECTION_ID]
        if (tag === 'slot') {
          key = key ?? node.attributes?.name
        }
        if (tag === 'style') {
          key = key ?? node.attributes.title
        }
        return `tag:${tag}-identifier:${key}`
      } else {
        return `content:${node.content}`
      }
    }
    return getNodeIdentifier(node1) === getNodeIdentifier(node2)
  }

  static separators = {
    path: '/',
    attribute: '.',
    childIdx: '#',
  }

  private _lastElementVersion: IAbstractNode = null

  diff(newElementVersion: IAbstractNode) {
    const operations: IAbstractDomOperation[] = []

    const actualDiff = (prevNode: IAbstractNode, currNode: IAbstractNode, parentPath = '') => {
      if (prevNode == null) {
        operations.push({ path: parentPath, type: AbstractDomOperationType.ADD, data: currNode })
      } else if (currNode == null) {
        operations.push({ path: parentPath, type: AbstractDomOperationType.REMOVE })
      } else {
        if (!AbstractDomIncrementalDiff.areMatching(prevNode, currNode)) {
          operations.push({ path: parentPath, type: AbstractDomOperationType.REPLACE, data: currNode })
        } else if (isAbstractElement(prevNode) && isAbstractElement(currNode)) {
          const prevNodeAttributeKeys = Object.keys(prevNode.attributes ?? {})
          const currNodeAttributeKeys = Object.keys(currNode.attributes ?? {})
          const commonKeys = prevNodeAttributeKeys.filter((k) => currNodeAttributeKeys.includes(k))
          const keysToRemove = prevNodeAttributeKeys.filter((k) => !currNodeAttributeKeys.includes(k))
          const keysToAdd = currNodeAttributeKeys.filter((k) => !prevNodeAttributeKeys.includes(k))
          const keysToModify = commonKeys.filter((k) => currNode.attributes[k] !== prevNode.attributes[k])
          keysToAdd.forEach((k) =>
            operations.push({
              path: `${parentPath}${AbstractDomIncrementalDiff.separators.attribute}${k}`,
              type: AbstractDomOperationType.MODIFY,
              data: currNode.attributes[k],
            }),
          )
          keysToModify.forEach((k) =>
            operations.push({
              path: `${parentPath}${AbstractDomIncrementalDiff.separators.attribute}${k}`,
              type: AbstractDomOperationType.MODIFY,
              data: currNode.attributes[k],
            }),
          )
          keysToRemove.forEach((k) =>
            operations.push({
              path: `${parentPath}${AbstractDomIncrementalDiff.separators.attribute}${k}`,
              type: AbstractDomOperationType.MODIFY,
              data: null,
            }),
          )
          const prevNodeChildren = prevNode.children?.filter?.((c) => c != null) ?? []
          const currNodeChildren = currNode.children?.filter?.((c) => c != null) ?? []
          if (!prevNodeChildren.length) {
            currNodeChildren
              ?.filter((n) => n != null)
              .forEach((n) =>
                operations.push({
                  path: `${parentPath}${AbstractDomIncrementalDiff.separators.path}children`,
                  type: AbstractDomOperationType.ADD,
                  data: n,
                }),
              )
          } else if (!currNodeChildren.length) {
            operations.push({
              path: `${parentPath}${AbstractDomIncrementalDiff.separators.path}children`,
              type: AbstractDomOperationType.REMOVE,
            })
          } else {
            const matchedChildren: Record<number, number> = {}
            const childrenToInsert: number[] = []
            currNodeChildren.forEach((c, idx) => {
              const matchedPrevChild = prevNodeChildren.find(
                (pc, pidx) => AbstractDomIncrementalDiff.areMatching(c, pc) && !matchedChildren[pidx],
              )
              if (matchedPrevChild) {
                matchedChildren[prevNodeChildren.indexOf(matchedPrevChild)] = idx
              } else {
                childrenToInsert.push(idx)
              }
            })
            const indexesToRemove = prevNodeChildren.map((_, idx) => idx).filter((idx) => matchedChildren[idx] === undefined)
            Object.entries(matchedChildren).forEach((value) => {
              const prevChildNode = prevNodeChildren[value[0]]
              const currentChildNode = currNodeChildren[value[1]]
              actualDiff(prevChildNode, currentChildNode, `${parentPath}${AbstractDomIncrementalDiff.separators.path}children#${value[0]}`)
            })
            indexesToRemove.reverse().forEach((idx) =>
              operations.push({
                type: AbstractDomOperationType.REMOVE,
                path: `${parentPath}${AbstractDomIncrementalDiff.separators.path}children${AbstractDomIncrementalDiff.separators.childIdx}${idx}`,
              }),
            )
            childrenToInsert.reverse().forEach((idx) =>
              operations.push({
                type: AbstractDomOperationType.INSERT,
                path: `${parentPath}${AbstractDomIncrementalDiff.separators.path}children${AbstractDomIncrementalDiff.separators.childIdx}0`,
                data: currNodeChildren[idx],
              }),
            )
            Object.entries(matchedChildren).forEach((value) => {
              const itemsRemovedBeforeCurrent = indexesToRemove.filter((i) => i < parseInt(value[0])).length
              const itemsAddedBeforeCurrent = childrenToInsert.length
              const correctedActualPosition = parseInt(value[0]) - itemsRemovedBeforeCurrent + itemsAddedBeforeCurrent
              if (correctedActualPosition !== value[1]) {
                operations.push({
                  type: AbstractDomOperationType.MOVE,
                  path: `${parentPath}${AbstractDomIncrementalDiff.separators.path}children#${correctedActualPosition}`,
                  data: value[1],
                })
              }
            })
          }
        }
      }
    }

    actualDiff(this._lastElementVersion, newElementVersion)
    this._lastElementVersion = newElementVersion
    return operations
  }
}
