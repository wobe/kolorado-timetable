# Kolorádó Favs Worker — Deploy Guide

## One-time setup (5 minutes)

### 1. Install Wrangler
```bash
npm install -g wrangler
wrangler login
```

### 2. Create the KV namespace
```bash
wrangler kv:namespace create FAVS_KV
```
Copy the `id` from the output and paste it into `wrangler.toml` replacing `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`.

### 3. Deploy
```bash
cd cloudflare-worker
wrangler deploy
```

Wrangler will print your Worker URL, e.g.:
`https://kolorado-favs.YOUR-SUBDOMAIN.workers.dev`

### 4. Set the Worker URL in the widgets
In both `kolorado-timetable.js` and `kolorado-lineup-v2.js`, find the line:
```js
var FAVS_WORKER_URL = "";
```
Replace the empty string with your Worker URL:
```js
var FAVS_WORKER_URL = "https://kolorado-favs.YOUR-SUBDOMAIN.workers.dev";
```
Then commit and push — the CDN will pick up the new version.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /fav | Record a fav add/remove event |
| GET | /counts | Return full stats JSON |

## Dashboard
The admin dashboard is at `/admin` on your Manus-hosted site.
Password: **HouseATonal67**
