import { RenderingEvent } from '@enhanced-dom/dom'

import type { IRenderingEventContext } from './webcomponent.types'

export class TemplateGenerationMainErrorEvent<T extends IRenderingEventContext> extends RenderingEvent<T> {
  static type = 'TemplateGenerationMainErrorEvent'
  constructor(context?: T) {
    super(TemplateGenerationMainErrorEvent.type, context)
  }
}

export class TemplateGenerationFallbackErrorEvent<T extends IRenderingEventContext> extends RenderingEvent<T> {
  static type = 'TemplateGenerationFallbackErrorEvent'
  constructor(context?: T) {
    super(TemplateGenerationFallbackErrorEvent.type, context)
  }
}
