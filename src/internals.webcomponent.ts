/* global ElementInternals */
// https://github.com/microsoft/TypeScript/issues/33218
export interface IElementInternalsExtended extends ElementInternals {
  readonly form: HTMLFormElement
  readonly validity: ValidityState
  readonly willValidate: boolean
  readonly states: unknown
  readonly validationMessage: string
  readonly labels: NodeList

  setFormValue: (value: File | string | FormData, state?: File | string | FormData) => void

  setValidity: (
    // A dictionary object containing one or more flags indicating the validity state of the element:
    flags?: {
      // A boolean value that is true if the element has a required attribute, but no value, or false otherwise. If true, the element matches the :invalid CSS pseudo-class.
      valueMissing?: boolean

      // A boolean value that is true if the value is not in the required syntax (when type is email or url), or false if the syntax is correct. If true, the element matches the :invalid CSS pseudo-class.
      typeMismatch?: boolean

      // A boolean value that is true if the value does not match the specified pattern, and false if it does match. If true, the element matches the :invalid CSS pseudo-class.
      patternMismatch?: boolean

      // A boolean value that is true if the value exceeds the specified maxlength for HTMLInputElement or HTMLTextAreaElement objects, or false if its length is less than or equal to the maximum length. If true, the element matches the :invalid and :out-of-range CSS pseudo-classes.
      tooLong?: boolean

      // A boolean value that is true if the value fails to meet the specified minlength for HTMLInputElement or HTMLTextAreaElement objects, or false if its length is greater than or equal to the minimum length. If true, the element matches the :invalid and :out-of-range CSS pseudo-classes.
      tooShort?: boolean

      // A boolean value that is true if the value is less than the minimum specified by the min attribute, or false if it is greater than or equal to the minimum. If true, the element matches the :invalid and :out-of-range CSS pseudo-classes.
      rangeUnderflow?: boolean

      // A boolean value that is true if the value is greater than the maximum specified by the max attribute, or false if it is less than or equal to the maximum. If true, the element matches the :invalid and :out-of-range and CSS pseudo-classes.
      rangeOverflow?: boolean

      // A boolean value that is true if the value does not fit the rules determined by the step attribute (that is, it's not evenly divisible by the step value), or false if it does fit the step rule. If true, the element matches the :invalid and :out-of-range CSS pseudo-classes.
      stepMismatch?: boolean

      // A boolean value that is true if the user has provided input that the browser is unable to convert.
      badInput?: boolean

      // A boolean value indicating whether the element's custom validity message has been set to a non-empty string by calling the element's setCustomValidity() method.
      customError?: boolean
    },
    // A string containing a message, which will be set if any flags are true. This parameter is only optional if all flags are false.
    message?: string,
    // An HTMLElement which can be used by the user agent to report problems with this form submission.
    anchor?: HTMLElement,
  ) => void

  checkValidity: () => boolean
  reportValidity: () => boolean
}
