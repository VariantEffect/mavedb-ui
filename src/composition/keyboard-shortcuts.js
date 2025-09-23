import _ from 'lodash'

export default () => {
  const isMac = navigator.userAgent.indexOf('Mac OS X') != -1

  const macKeyboardShortcutGlyphs = {
    cmd: '⌘',
    ctrl: '⌃',
    option: '⌥',
    shift: '⇧'
  }

  const keyboardShortcutText = (...keys) => {
    return keys
      .map((key) => (key == 'cmd' ? (isMac ? 'cmd' : 'ctrl') : key))
      .map((key) => {
        if (isMac && _.has(macKeyboardShortcutGlyphs, key)) {
          return macKeyboardShortcutGlyphs[key]
        }
        return key
      })
      .map((key) => _.upperFirst(key))
      .join('-')
  }

  return {
    // Data
    //roleNames: computed(() => store.state.auth.roleNames),
    //user: computed(() => store.state.auth.user),

    // Methods
    keyboardShortcutText
  }
}
