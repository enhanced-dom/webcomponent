import '@testing-library/jest-dom'
import { HtmlRenderer, SECTION_ID, type IAbstractNode } from '../src'

describe.only('html renderer', () => {
  test.only('non-element', () => {
    const ast1 = {
      content: 'aaa',
    }

    const renderer = new HtmlRenderer((empty: boolean) => (empty ? null : ast1))
    const div = document.createElement('div')
    renderer.render(div, false)

    expect(div.innerHTML).toEqual('aaa')

    renderer.render(div, true)

    expect(div.innerHTML).toEqual('')
  })

  test('non-matching elements', () => {
    const ast1 = {
      tag: 'span',
      attributes: {
        [SECTION_ID]: 'aaa',
      },
    }

    const ast2 = {
      tag: 'div',
      attributes: {
        [SECTION_ID]: 'aaa',
      },
    }

    const renderer = new HtmlRenderer((ast: IAbstractNode) => ast)
    const div = document.createElement('div')
    renderer.render(div, ast1)

    expect(div.innerHTML).toEqual(`<span ${SECTION_ID}="aaa"></span>`)

    renderer.render(div, ast2)

    expect(div.innerHTML).toEqual(`<div ${SECTION_ID}="aaa"></div>`)
  })

  test('identical elements', () => {
    const ast1 = {
      tag: 'span',
      attributes: {
        [SECTION_ID]: 'aaa',
      },
    }

    const renderer = new HtmlRenderer((ast: IAbstractNode) => ast)
    const div = document.createElement('div')
    renderer.render(div, ast1)

    expect(div.innerHTML).toEqual(`<span ${SECTION_ID}="aaa"></span>`)
    const span = div.querySelector('span')
    div.removeChild(span) // we remove child, but we don't tell the renderer we've removed it

    renderer.render(div, ast1)
    expect(div.innerHTML).toEqual('') // new node was not created, because we think the dom still looks as it once did
  })

  test('matching elements - no children', () => {
    const ast1 = {
      tag: 'span',
      attributes: {
        [SECTION_ID]: 'aaa',
        toRemove: { lala: null },
        toModify: true,
        toIgnore: 3,
      },
    }

    const ast2 = {
      tag: 'span',
      attributes: {
        [SECTION_ID]: 'aaa',
        toModify: 5,
        toIgnore: 3,
        toAdd: 4,
      },
    }

    const renderer = new HtmlRenderer((ast: IAbstractNode) => ast)
    const div = document.createElement('div')
    renderer.render(div, ast1)
    expect(div.innerHTML).toEqual(`<span ${SECTION_ID}="aaa" toremove="{&quot;lala&quot;:null}" tomodify="" toignore="3"></span>`)
    const span = div.querySelector('span')
    span.setAttribute('test', 'should-not-do-complete-rerender')
    renderer.render(div, ast2)
    expect(div.innerHTML).toEqual(
      `<span ${SECTION_ID}="aaa" tomodify="5" toignore="3" test="should-not-do-complete-rerender" toadd="4"></span>`,
    )
  })

  test('matching elements - with children', () => {
    const ast1: IAbstractNode = {
      tag: 'span',
      children: [
        {
          tag: 'div',
        },
        {
          tag: 'span',
          attributes: {
            width: 3,
          },
        },
        {
          tag: 'slot',
          attributes: {
            name: 'aaa',
          },
        },
        {
          content: 3,
        },
      ],
    }

    const ast2: IAbstractNode = {
      tag: 'span',
      children: [
        {
          content: 'AA',
        },
        {
          tag: 'span',
          attributes: {
            width: 20,
          },
        },
        {
          tag: 'div',
          attributes: {
            height: 5,
          },
        },
        {
          tag: 'div',
        },
        {
          tag: 'slot',
          attributes: {
            name: 'aaa',
            color: 'blue',
          },
        },
      ],
    }

    const renderer = new HtmlRenderer((ast: IAbstractNode) => ast)
    const div = document.createElement('div')
    renderer.render(div, ast1)
    expect(div.innerHTML).toEqual('<span><div></div><span width="3"></span><slot name="aaa"></slot>3</span>')
    const span = div.querySelector('span')
    span.setAttribute('test', 'should-not-do-complete-rerender')
    const slot = span.querySelector('slot')
    slot.setAttribute('test', 'should-not-do-complete-rerender')
    renderer.render(div, ast2)
    expect(div.innerHTML).toEqual(
      '<span test="should-not-do-complete-rerender">AA<span width="20"></span><div></div><div height="5"></div><slot name="aaa" test="should-not-do-complete-rerender" color="blue"></slot></span>',
    )
  })
})
