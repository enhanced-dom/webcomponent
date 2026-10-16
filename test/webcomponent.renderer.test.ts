import '@testing-library/jest-dom'
import { HtmlRenderer } from '@enhanced-dom/dom'

import { registerHtmlRenderer, WebcomponentRenderer } from '../src'

describe('WebcomponentRenderer', () => {
  let renderer: WebcomponentRenderer<any>

  beforeAll(() => {
    registerHtmlRenderer(HtmlRenderer)
  })

  beforeEach(() => {
    renderer = new WebcomponentRenderer(() => ({
      tag: 'span',
      attributes: { class: 'lala' },
    }))
  })

  it('should render with template', () => {
    const args = { test: 'value' }
    const div = document.createElement('div')
    renderer.render(div, args)
    const element = div.querySelector('.lala')
    expect(element?.tagName).toEqual('SPAN')
  })
})
