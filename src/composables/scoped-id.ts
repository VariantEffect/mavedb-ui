import {v4 as uuidv4} from 'uuid'

export default () => {
  const uniqueId = uuidv4()
  return {
    scopedId: (id?: string) => `uid-${uniqueId}${id ? '-' + id : ''}`
  }
}
