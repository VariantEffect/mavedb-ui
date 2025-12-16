import _ from 'lodash'
import pluralize from 'pluralize'

import {formatDate, formatInt, linkifyTextHtml} from '@/lib/formats'

export default () => ({
  formatDate,
  formatInt,
  linkifyTextHtml,
  pluralize,
  startCase: (s: string) => _.startCase(s)
})
