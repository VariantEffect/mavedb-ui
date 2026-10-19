// Plain-HTTP dev server for coding agents and embedded browser panes, which reject the self-signed certificate.
// ORCID sign-in doesn't work here: only ports 8081 and 8082 are registered redirect URLs.
import base from './vite.config.js'

export default {
  ...base,
  plugins: base.plugins.filter((p) => p?.name !== 'vite:basic-ssl'),
  server: {...base.server, host: '127.0.0.1', port: Number(process.env.PORT) || 8090}
}
