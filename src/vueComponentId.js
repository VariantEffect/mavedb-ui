import {v4 as uuidv4} from 'uuid'

export default {
  install: (app) => {
    app.mixin({
      beforeCreate: function() {
        this._uid = uuidv4()
      },
    })
    app.config.globalProperties.$scopedId = function(id) {
      return 'uid-' + this._uid + (id ? '-' + id : '')
    }
  }
}
