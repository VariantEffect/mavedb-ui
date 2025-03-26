import moment from 'moment'
import _ from 'lodash'

export function formatDate(x: string) {
  return moment(x).format('MMM DD, YYYY')
}

export function formatInt(x: number | null) {
  if (x == null) {
    return ''
  }
  return x.toLocaleString(undefined, {
    maximumFractionDigits: 0
  })
}

export function beautifyString(x: string) {
  return _.startCase(_.replace(x, /_/g, ' '))
}
