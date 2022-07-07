export class FailedNodeCloneEvent<T extends { emitter: { type: string; id?: string } }> extends CustomEvent<T> {
  static type = 'FailedNodeCloneEvent'
  constructor(context?: T) {
    super(FailedNodeCloneEvent.type, { detail: context })
  }
}

export class FailedNodeInsertEvent<T extends { emitter: { type: string; id?: string } }> extends CustomEvent<T> {
  static type = 'FailedNodeInsertEvent'
  constructor(context?: T) {
    super(FailedNodeInsertEvent.type, { detail: context })
  }
}

export class TemplateRenderErrorEvent<T extends { emitter: { type: string; id?: string } }> extends CustomEvent<T> {
  static type = 'TemplateRenderErrorEvent'
  constructor(context?: T) {
    super(TemplateRenderErrorEvent.type, { detail: context })
  }
}

export class TemplateDiffErrorEvent<T extends { emitter: { type: string; id?: string } }> extends CustomEvent<T> {
  static type = 'TemplateDiffErrorEvent'
  constructor(context?: T) {
    super(TemplateRenderErrorEvent.type, { detail: context })
  }
}
