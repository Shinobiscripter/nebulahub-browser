# NebulaHub Browser

A compact, space-themed browser interface powered by [Scramjet](https://github.com/MercuryWorkshop/scramjet). It accepts URLs or search terms, loads the destination inside a proxied iframe, and provides back, forward, reload, and home controls.

## Run locally

Requirements: Node.js 20 or newer and Corepack.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm start
```

Open `http://localhost:8080`. Production use requires HTTPS because the proxy registers a service worker.

## Architecture

- Fastify serves the NebulaHub interface and Scramjet runtime assets.
- Scramjet rewrites pages inside a service worker and displays them in an iframe.
- BareMux and libcurl transport browser traffic over a Wisp WebSocket endpoint.
- The same Node process hosts Wisp at `/wisp/`.

## Deploy

The included `Dockerfile`, `railway.json`, and `render.yaml` support a WebSocket-capable container host.

### Railway

Create a service from this repository. Railway detects `railway.json` and builds the Dockerfile. Generate a public domain after the first deployment.

### Render

Create a Blueprint from this repository. The included `render.yaml` creates a free Docker web service with `/health` monitoring.

## Updating

Edit the files under `public/` for the interface and `src/index.js` for server settings. Push to the connected repository; Railway or Render will redeploy automatically.

## Limitations

- Some sites block proxies, embedded browsing, or automated traffic.
- CAPTCHAs, OAuth sign-ins, downloads, media DRM, WebRTC, and some WebSocket-heavy applications can fail.
- Free hosting may sleep when idle and can have bandwidth or memory limits.
- This project is not an anonymity network. The host can see outbound destinations; do not treat it as Tor or a VPN.
- Use only where you are authorized and follow the destination site's terms and applicable laws.

## License

AGPL-3.0-only. Scramjet and its related Mercury Workshop packages retain their original licenses and notices.
