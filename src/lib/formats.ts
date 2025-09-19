import moment from 'moment'

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
