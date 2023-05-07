module.exports = {
  devServer: {
    headers: { "Access-Control-Allow-Origin": "*" },
    host: 'localhost',
    https: true
  },
  pages: {
    index: {
      entry: 'src/main.js',
      template: 'public/index.html'
    },
    'signed-in': {
      entry: 'src/main.js',
      template: 'public/index.html'
    },
    'signed-out': {
      entry: 'src/main.js',
      template: 'public/index.html'
    }
  }
}
