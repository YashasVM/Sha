# Shata - P2P File Transfer

P2P file transfer. No servers. No bull.

## Features

- **Direct P2P Transfer**: Files are transferred directly between browsers using WebRTC
- **No Server Storage**: Your files never touch our servers
- **Simple Code Sharing**: 6-character alphanumeric codes for easy sharing
- **Progress Tracking**: Real-time progress bar with transfer speed
- **No Login Required**: Just open and share

## How It Works

### Sender
1. Open the website
2. Select or drag & drop a file
3. Share the 6-character code with the receiver
4. Wait for the receiver to connect
5. Transfer happens automatically

### Receiver
1. Open the website
2. Switch to "Receive" mode
3. Enter the 6-character code
4. Click "Connect"
5. File downloads automatically when transfer completes

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **P2P**: [PeerJS](https://peerjs.com/) for WebRTC signaling
- **Hosting**: Cloudflare Pages

## Local Development

Simply open `index.html` in a browser, or serve with any static file server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Cloudflare Pages                       │
│                   (Static Files)                         │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        ▼                                      ▼
┌───────────────┐                      ┌───────────────┐
│    SENDER     │                      │   RECEIVER    │
│   Browser     │                      │   Browser     │
│               │    PeerJS Cloud      │               │
│  1. Select    │◄────(Signaling)─────►│  3. Enter     │
│     file      │                      │     code      │
│  2. Get code  │                      │               │
│               │◄═══════════════════►│               │
│               │   Direct WebRTC      │  4. Download  │
│               │   (P2P Transfer)     │               │
└───────────────┘                      └───────────────┘
```

## Performance Optimizations

- **Binary ArrayBuffer transfers** (33% smaller than base64)
- **64KB chunk size** (optimal for WebRTC data channels)
- **Flow control** with bufferedAmount monitoring
- **Minimal protocol overhead** (metadata once, then raw chunks)

## File Structure

```
/
├── index.html          # Main HTML
├── css/
│   └── style.css       # Styling
├── js/
│   ├── app.js          # Main app logic
│   ├── sender.js       # Sender functionality
│   └── receiver.js     # Receiver functionality
└── README.md           # This file
```

## License

MIT
