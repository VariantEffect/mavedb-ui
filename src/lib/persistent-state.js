import base64url from 'base64url'

export function encodeState(state) {
  if (state == null) {
    return null
  }
  return base64url(JSON.stringify(state))
}

export function decodeState(stateQueryParam) {
  if (stateQueryParam == null || stateQueryParam == '') {
    return {}
  }
  try {
    return JSON.parse(base64url.decode(stateQueryParam))
  } catch (e) {
    console.log('Invalid state query parameter', {stateQueryParam})
    return {}
  }
}
