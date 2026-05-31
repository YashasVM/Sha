<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/cd-Direct_Browser_to_Browser_File_Handoff-f4ed28?style=for-the-badge&labelColor=101010">
  <img alt="cd banner" src="https://img.shields.io/badge/cd-Direct_Browser_to_Browser_File_Handoff-164bff?style=for-the-badge&labelColor=f2ecd7">
</picture>

### Send files straight between browsers with codes, links, and QR handoff.

[![Status](https://img.shields.io/badge/status-active-008f5a?style=flat-square&labelColor=111111)](https://github.com/YashasVM/Sha)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square&labelColor=111111)](LICENSE)
[![Stack](https://img.shields.io/badge/stack-Vite%20%2B%20WebRTC-f04435?style=flat-square&labelColor=111111)](https://vite.dev)
[![Live](https://img.shields.io/badge/live-sha.yashasvm.workers.dev-f4ed28?style=flat-square&labelColor=111111)](https://sha.yashasvm.workers.dev/)

**No login** . **No server-side file storage** . **Multi-file transfer** . **QR ready**

[Open cd](https://sha.yashasvm.workers.dev/) . [Source Code](https://github.com/YashasVM/Sha) . [Report an Issue](https://github.com/YashasVM/Sha/issues)

---

</div>

> [!IMPORTANT]
> cd is a browser-to-browser transfer app. File contents move over WebRTC data channels between peers, while PeerJS is used for connection signaling. Anyone with a live share code can try to connect, so treat codes like temporary private links.

## What is cd?

cd is a small, loud, direct file handoff tool. Pick files, get a friendly receive code, share the code or QR link, and keep both browser tabs open while the transfer runs.

```text
Sender Browser -> WebRTC Data Channel -> Receiver Browser
       |                 ^
       |                 |
       +-- PeerJS signaling for connection setup
```

---

## Features

### Transfer Flow

| Feature | Details |
|---|---|
| **Direct P2P Transfer** | Files transfer between browsers over WebRTC data channels |
| **No Server Storage** | The hosted app does not intentionally store transferred file contents |
| **Multi-File Batches** | Send one file or many files in a single session |
| **Friendly Codes** | Human-readable word plus random suffix, like `spark9x2k` |
| **Share Links** | Receiver links support `?receive=spark9x2k` deep linking |
| **QR Handoff** | Sender generates a QR code for quick phone-to-desktop or desktop-to-phone joining |

### Browser Experience

| Feature | Details |
|---|---|
| **Drag and Drop** | Drop files directly on the sender workbench |
| **Camera Scanner** | Receiver can scan the sender QR code from the browser |
| **Manual Fallback** | Codes still work when camera access is blocked |
| **Live Progress** | Transfer percentage, moved bytes, and current speed update during transfer |
| **Backpressure Aware** | Data-channel buffering is throttled to keep large transfers steadier |
| **Responsive UI** | Brutalist two-column desktop layout with a compact stacked mobile layout |

---

## Quick Start

### 1. Install

```bash
npm install
```

### 2. Run Locally

```bash
npm run dev
```

Open the local Vite URL in two browser windows or on two devices on the same network.

### 3. Send

1. Choose or drop one or more files.
2. Share the generated code, copy the join link, or show the QR code.
3. Keep the sender tab open until the receiver connects.

### 4. Receive

1. Switch to **Receive**, open a `?receive=spark9x2k` link, or scan the QR code.
2. Connect with the code.
3. Save streamed files when prompted, or let the browser download Blob fallbacks.

> [!TIP]
> For the smoothest transfer, keep both tabs active, avoid VPNs that block peer connections, and test on the same Wi-Fi network first.

---

## Architecture

```text
+-------------------+        PeerJS signaling        +-------------------+
|   Sender Browser  | <----------------------------> | Receiver Browser |
|                   |                                |                  |
| File picker/drop  |                                | Code/QR scanner  |
| Manifest builder  |                                | Manifest reader  |
| Stream reader     |                                | Save/download    |
+---------+---------+                                +---------+--------+
          |                                                    ^
          |              WebRTC data channel                   |
          +----------------------------------------------------+
                         Raw binary chunks
```

### Runtime Defaults

| Parameter | Value |
|---|---|
| App Runtime | Vite vanilla JavaScript with ES modules |
| Signaling | `peerjs@1.5.5` |
| QR Generation | `qrcode@1.5.4` |
| QR Scanning | `html5-qrcode@2.3.8` |
| Hosting Target | Cloudflare static assets from `dist/` |
| Code Format | Curated word plus 5-character random base36 suffix |
| Buffer Guard | Data channel pauses above `8 MB` buffered |

---

## Repository Layout

```text
/
|-- index.html              App shell and accessible transfer views
|-- src/
|   |-- main.js             Sender, receiver, WebRTC, QR, and transfer logic
|   `-- style.css           Brutalist responsive interface
|-- favicon.svg             App icon
|-- package.json            Scripts and dependencies
|-- package-lock.json       Locked dependency graph
|-- wrangler.jsonc          Cloudflare static asset config
`-- README.md               Project documentation
```

---

## Build and Checks

```bash
npm run build
npm run audit
```

Cloudflare serves the production build from `dist/`, as configured in `wrangler.jsonc`.

---

## Safety Notes

- File contents are sent over WebRTC data channels between connected browsers.
- The hosted app serves static assets and does not intentionally store transferred files.
- PeerJS signaling helps establish the connection, but it is not a file storage layer.
- Share codes are temporary secrets. Send them only to the intended receiver.
- The sender should keep the tab open until the transfer completes.
- Browser support, NAT behavior, VPNs, and local network policies can affect peer connectivity.

---

## Test Plan

- Send one file and multiple files.
- Receive by manual code, copied link, generated QR, and in-app QR scan.
- Try invalid codes, unavailable sender, connection timeout, interrupted transfer, and camera permission failure.
- Compare large-file transfer speed and receiver memory behavior.
- Run `npm run build`, `npm run audit`, and desktop/mobile visual QA.

---

## License

MIT

---

<div align="center">

**Made by [@yashas.vm](https://github.com/YashasVM)**

*Move the file. Keep the drama in the UI.*

</div>
