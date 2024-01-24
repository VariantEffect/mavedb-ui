import {decode, encode} from 'universal-base64url'

export function encodeState(state) {
  if (state == null) {
    return null
  }
  return encode(JSON.stringify(state))
}

export function decodeState(stateQueryParam) {
  if (stateQueryParam == null || stateQueryParam == '') {
    return {}
  }
  try {
    return JSON.parse(decode(stateQueryParam))
  } catch (e) {
    console.log('Invalid state query parameter', {stateQueryParam})
    return {}
  }
}
