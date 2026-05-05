import type {LocationQueryValue} from 'vue-router'

/** Normalize a route query value (single or array) into a string array, filtering out nulls. */
export function extractQueryParam(content: LocationQueryValue | LocationQueryValue[]): Array<string> {
  if (Array.isArray(content)) {
    return content.filter((item) => !!item) as Array<string>
  }
  return content ? [content] : []
}
