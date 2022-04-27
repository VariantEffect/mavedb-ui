module.exports = {
  devServer: {
    headers: { "Access-Control-Allow-Origin": "*" },
    // open: process.platform === 'darwin',
    // host: '0.0.0.0',
    // port: 8082, // CHANGE YOUR PORT HERE!
    https: true
    // hotOnly: false
  }
}
