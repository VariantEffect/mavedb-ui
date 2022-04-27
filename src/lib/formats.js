import moment from 'moment'

export function formatDate(x) {
  return moment(x).format('MMMM d, YYYY')
}

export function formatInt(x) {
  if (x == null) {
    return ''
  }
  return x.toLocaleString(undefined, {
    maximumFractionDigits: 0
  })
}
