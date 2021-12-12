export abstract class RendererEvent<T> extends CustomEvent<T> {
    constructor(type: string, eventInitDict?: T) {
        super(type, {detail: eventInitDict})
    }
}

export class UnknownStylesheetEvent<T extends {rendererName?: string}> extends RendererEvent<{stylesheetName: string} & T> {
    static type = 'UnknownStylesheet'
    constructor(stylesheetName: string, context: T) {
        super(UnknownStylesheetEvent.type, {stylesheetName, ...context})
    }
}

export class FailedNodeCloneEvent<T extends {rendererName?: string}> extends RendererEvent<T> {
    static type = 'FailedNodeCloneEvent'
    constructor(context?: T) {
        super(FailedNodeCloneEvent.type, context)
    }
}

export class FailedNodeInsertEvent<T extends {rendererName?: string}> extends RendererEvent<T> {
    static type = 'FailedNodeInsertEvent'
    constructor(context?: T) {
        super(FailedNodeInsertEvent.type, context)
    }
}

export class TemplateRenderErrorEvent<T extends {rendererName?: string}> extends RendererEvent<T> {
    static type = 'TemplateRenderErrorEvent'
    constructor(context?: T) {
        super(TemplateRenderErrorEvent.type, context)
    }
}