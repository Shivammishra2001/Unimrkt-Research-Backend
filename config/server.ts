export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  // The admin panel's client bundle bakes this in at `strapi build` time as
  // its API base URL — without it (or behind a reverse proxy that changes
  // the public host/port), the bundle calls back to `127.0.0.1:1337`
  // instead of the public domain the browser actually loaded it from.
  url: env('PUBLIC_URL'),
  // Trust X-Forwarded-* headers from the nginx proxy in front of this app
  // (scheme/host/port), rather than the raw 127.0.0.1 connection details.
  proxy: true,
  app: {
    keys: env.array('APP_KEYS'),
  },
});
