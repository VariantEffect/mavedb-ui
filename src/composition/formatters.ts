import _ from 'lodash'
import pluralize from 'pluralize'

import {formatDate, formatInt} from '@/lib/formats'

export default () => ({
  formatDate,
  formatInt,
  pluralize,
  startCase: (s: string) => _.startCase(s)
})
