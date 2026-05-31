# cd - P2P File Transfer

cd is a direct browser-to-browser file sharing app with a loud, fast workbench UI. It uses WebRTC for encrypted P2P transfer, PeerJS for connection signaling, and friendly share codes, links, and QR handoff for quick joining.

## Features

- Direct P2P transfer with no server-side file storage
- Multi-file batches in one session
- Friendly receive codes with a random suffix for safer joining
- Share links using codes like `?receive=spark9x2k`
- Sender QR generation for join links
- Receiver QR scanning from camera with manual code fallback
- Binary chunk transfer with data-channel backpressure
- Browser file streaming where supported, Blob downloads elsewhere
- Brutalist two-column desktop workflow and stacked mobile workflow

## How It Works

### Sender

1. Open cd.
2. Choose or drop one or more files.
3. Share the code, copy the join link, or show the QR code.
4. Keep the tab open until the receiver connects.
5. Transfer starts automatically.

### Receiver

1. Open cd and switch to Receive, or open a `?receive=spark9x2k` link.
2. Enter the code manually or scan the sender QR.
3. Connect to the sender.
4. Save streamed files when prompted, or download through the Blob fallback.

## Tech Stack

- Vite vanilla JavaScript app with ES modules
- [`peerjs@1.5.5`](https://peerjs.com/) for WebRTC signaling
- [`qrcode@1.5.4`](https://github.com/soldair/node-qrcode) for sender QR generation
- [`html5-qrcode@2.3.8`](https://github.com/mebjas/html5-qrcode) for camera scanning
- Cloudflare Pages/Workers static asset hosting

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run audit
```

Cloudflare serves the built app from `dist/`, as configured in `wrangler.jsonc`.

## Safety Notes

- Files are transferred over WebRTC data channels between the sender and receiver browsers.
- The app does not intentionally store file contents on the host server.
- PeerJS signaling is used only to help browsers find each other and open the direct connection.
- Anyone with the current share code can try to connect, so treat codes like temporary links.
- Keep both tabs open until the transfer completes.

## File Structure

```text
/
|-- index.html
|-- src/
|   |-- main.js
|   `-- style.css
|-- favicon.svg
|-- package.json
|-- package-lock.json
|-- wrangler.jsonc
`-- README.md
```

## Test Plan

- Send one file and multiple files.
- Receive by manual code, copied link, generated QR, and in-app QR scan.
- Try invalid codes, unavailable sender, connection timeout, interrupted transfer, and camera permission failure.
- Compare large-file transfer speed and receiver memory behavior before and after.
- Run `npm run build`, `npm run audit`, and desktop/mobile visual QA.

## License

MIT

---

Made by [@Yashas.VM](https://github.com/YashasVM)
