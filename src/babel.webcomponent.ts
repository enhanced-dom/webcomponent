HTMLElement = (function (OriginalHTMLElement) {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  function BabelHTMLElement() {
    const newTarget = this.__proto__.constructor
    return Reflect.construct(OriginalHTMLElement, [], newTarget)
  }
  Object.setPrototypeOf(BabelHTMLElement, OriginalHTMLElement)
  Object.setPrototypeOf(BabelHTMLElement.prototype, OriginalHTMLElement.prototype)
  BabelHTMLElement.eventEmitterType = '@enhanced-dom/webcomponent'
  return BabelHTMLElement
})(HTMLElement) as unknown as typeof HTMLElement
