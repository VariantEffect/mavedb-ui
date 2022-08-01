export default () => ({
  copyTextToClipboard: function(text) {
    navigator.clipboard.writeText(text)
  }
})
