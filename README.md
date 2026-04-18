# Geektool-Sytem-Performance-Graph

Standalone GeekTool web widget project for:

- CPU ring graph
- Memory ring graph
- Network mini bar graphs
- Battery status

This project is intentionally separated from `Geektool-System-Perfomance-geeklet`.

## Preview

![GeekTool system performance graph widget](assets/performance-graph-widget.png)

## Requirements

- macOS
- Homebrew
- Node.js 20+ and npm
- GeekTool

## Install (simple)

```bash
mkdir -p ~/Documents/Geektool
cd ~/Documents/Geektool
if [ ! -d "Geektool-Sytem-Performance-Graph" ]; then
  git clone https://github.com/dmccullo/Geektool-Sytem-Performance-Graph.git
fi
cd Geektool-Sytem-Performance-Graph
./install.sh
```

This setup script:

- verifies macOS + Homebrew
- installs Node.js/npm if missing
- installs `osx-cpu-temp` (optional CPU temp fallback)
- runs `npm install`

You can also run:

```bash
npm run setup
```

## Run

```bash
npm start
```

By default the server stays **quiet** (no per-request console logs). For Fastify access logs while debugging:

```bash
VERBOSE=1 npm start
```

Stop the server (frees the default port **26498**; respects `PORT` if you set it when starting):

```bash
npm run stop
```

Then point a GeekTool **Web** geeklet to:

```text
http://127.0.0.1:26498
```

### Port already in use (`EADDRINUSE`)

Only **one** process can listen on `127.0.0.1:26498`. If `npm start` fails with that error, GeekTool is still using an **older** server (and you will not see newer UI like the external IP).

1. See what is using the port:

```bash
lsof -nP -iTCP:26498 -sTCP:LISTEN
```

2. Stop it (replace `<PID>` with the number from the `lsof` output):

```bash
kill <PID>
```

3. Start this project again from **your** clone:

```bash
cd ~/Documents/Geektool/Geektool-Sytem-Performance-Graph
git pull
npm start
```

Or use another port and **change the GeekTool URL** to match:

```bash
PORT=26499 npm start
```

```text
http://127.0.0.1:26499
```

## Notes

- CPU temp is best-effort:
  - Uses `systeminformation` first.
  - Falls back to `osx-cpu-temp` on macOS if available.
- If no valid temp is available, it stays hidden.
- **External IP** (shown under Up/Down) uses the same lookup as:
  - `dig +short myip.opendns.com @resolver1.opendns.com`
  - macOS includes `dig` at `/usr/bin/dig` in most setups.
  - Result is cached for **5 minutes** so the widget does not query OpenDNS on every refresh.
- Server listens on `127.0.0.1:26498` by default.

## License

MIT
