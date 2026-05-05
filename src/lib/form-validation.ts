import _ from 'lodash'

/** Flat map of field paths to error messages, shared by all form screens. */
export type ValidationErrors = Record<string, string | null>

/**
 * Merge server-side and client-side validation errors into a single object.
 * Client-side errors take precedence over server-side errors for the same key.
 */
export function mergeValidationErrors(
  serverErrors: ValidationErrors,
  clientErrors: ValidationErrors
): ValidationErrors {
  return _.merge({}, serverErrors, clientErrors)
}

/**
 * Parse an API 422 response's `detail` array into a flat record of field-path
 * to error message. Handles FastAPI's `loc` array and MaveDB's custom `custom_loc`
 * override.
 *
 * Returns `null` if the detail is a plain string (generic error, not field-level).
 */
export function parseApiValidationErrors(detail: any): Record<string, string> | null {
  if (typeof detail === 'string' || detail instanceof String) {
    return null
  }

  const errors: Record<string, string> = {}
  for (const error of detail) {
    let path = error.loc
    if (error?.ctx?.error?.custom_loc) {
      path = error.ctx.error.custom_loc
    }
    if (path[0] === 'body') {
      path = path.slice(1)
    }
    const fullKey = path.join('.')
    errors[fullKey] = error.msg

    // Also add a collapsed key for array fields (e.g. "contributors.0" → "contributors")
    // so that the error displays on the field component.
    const fieldName = path[0] as string
    if (path.length > 1 && fieldName && !(fieldName in errors)) {
      errors[fieldName] = error.msg
    }
  }
  return errors
}

/**
 * Scroll to and focus the first element with an error indicator.
 * Looks for our error classes, PrimeVue's invalid class, or PrimeVue error messages.
 */
export function scrollToFirstError(): void {
  requestAnimationFrame(() => {
    const el = document.querySelector('.mv-field-error, .mv-field-error-msg, .p-invalid, .p-message-error')
    if (el) {
      el.scrollIntoView({behavior: 'smooth', block: 'center'})
    }
  })
}

/**
 * Parse an API 422 response's `detail` array with score-set-specific path
 * transformations. Handles target gene path insertion (adding 'targetGene'
 * segment for TargetEditor error prefixes), external identifier index-to-name
 * resolution, and separates calibration errors into their own record.
 *
 * Uses concatenation (loc + custom_loc) rather than replacement, matching
 * the score set API's error path convention.
 *
 * Returns `null` if the detail is a plain string (generic error, not field-level).
 */
export function parseScoreSetValidationErrors(
  detail: any,
  targetGenes?: any[]
): {formErrors: Record<string, string>; calibrationErrors: Record<string, string>} | null {
  if (typeof detail === 'string' || detail instanceof String) {
    return null
  }

  const formErrors: Record<string, string> = {}
  const calibrationErrors: Record<string, string> = {}

  for (const error of detail) {
    let path = [...error.loc]
    if (path[0] === 'body') path = path.slice(1)

    const customPath = error.ctx?.error?.custom_loc
    if (customPath) {
      const trimmed = customPath[0] === 'body' ? customPath.slice(1) : customPath
      path = path.concat(trimmed)
    }

    // Insert 'targetGene' segment to match TargetEditor error prefix convention
    if (path[0] === 'targetGenes' && path.length >= 2) {
      if (path[2] === 'externalIdentifiers' && targetGenes) {
        const identifierIndex = path[3]
        const targetGene = targetGenes[path[1]]
        const identifierOffset = targetGene?.externalIdentifiers?.[identifierIndex]
        if (identifierOffset?.identifier?.dbName) {
          path.splice(3, 1, identifierOffset.identifier.dbName)
        }
      }
      path.splice(2, 0, 'targetGene')
    }

    // Separate calibration errors into their own record
    if (path[0] === 'scoreCalibrations') {
      calibrationErrors[path.slice(2).join('.')] = error.msg
    }

    const fullKey = path.join('.')
    formErrors[fullKey] = error.msg

    // Collapse indexed keys so errors display on the field component
    const fieldName = path[0] as string
    if (path.length > 1 && fieldName && !(fieldName in formErrors)) {
      formErrors[fieldName] = error.msg
    }
  }

  return {formErrors, calibrationErrors}
}

/**
 * Validate that parsed JSON is a plain object (not an array or primitive).
 * Returns an error message string if invalid, or `null` if valid.
 */
export function validateJsonObject(data: any, fieldLabel: string): string | null {
  if (!_.isObject(data) || _.isArray(data)) {
    return `${_.startCase(fieldLabel)} must be a JSON object (not an array or simple value).`
  }
  return null
}
