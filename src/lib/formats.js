import moment from 'moment'

export function formatDate(x) {
  return moment(x).format('MMM DD, YYYY')
}

export function formatInt(x) {
  if (x == null) {
    return ''
  }
  return x.toLocaleString(undefined, {
    maximumFractionDigits: 0
  })
}
