// Sender functionality
const Sender = (function() {
    // Code generation characters (excludes confusing chars: 0,O,I,l,1)
    const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const CODE_LENGTH = 6;
    const CHUNK_SIZE = 64 * 1024; // 64KB chunks

    let peer = null;
    let connection = null;
    let file = null;
    let code = null;
    let transferStartTime = null;
    let bytesSent = 0;

    function generateCode() {
        let result = '';
        for (let i = 0; i < CODE_LENGTH; i++) {
            result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
        }
        return result;
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }

    function init(selectedFile) {
        file = selectedFile;
        code = generateCode();
        bytesSent = 0;
        transferStartTime = null;

        // Display file info
        const fileInfo = document.getElementById('sender-file-info');
        fileInfo.querySelector('.file-name').textContent = file.name;
        fileInfo.querySelector('.file-size').textContent = formatSize(file.size);
        fileInfo.classList.remove('hidden');

        // Display code
        const codeSection = document.getElementById('sender-code-section');
        document.getElementById('share-code').textContent = code;
        codeSection.classList.remove('hidden');

        // Hide drop zone
        document.getElementById('drop-zone').classList.add('hidden');

        // Create peer with code as ID
        createPeer();
    }

    function createPeer() {
        // Use lowercase for PeerJS ID
        const peerId = 'shata-' + code.toLowerCase();

        peer = new Peer(peerId, {
            debug: 0 // Disable debug logging
        });

        peer.on('open', () => {
            updateStatus('Waiting for receiver...');
        });

        peer.on('connection', (conn) => {
            connection = conn;
            updateStatus('Receiver connected!');

            conn.on('open', () => {
                sendFile();
            });

            conn.on('error', (err) => {
                console.error('Connection error:', err);
                updateStatus('Connection error. Try again.');
            });
        });

        peer.on('error', (err) => {
            console.error('Peer error:', err);
            if (err.type === 'unavailable-id') {
                // Code collision, generate new code
                code = generateCode();
                document.getElementById('share-code').textContent = code;
                createPeer();
            } else {
                updateStatus('Connection error. Please refresh.');
            }
        });
    }

    function sendFile() {
        // Show progress section
        document.getElementById('sender-code-section').classList.add('hidden');
        const progressSection = document.getElementById('sender-progress');
        progressSection.classList.remove('hidden');

        // Send metadata first
        connection.send({
            type: 'metadata',
            name: file.name,
            size: file.size,
            mimeType: file.type
        });

        // Start transfer
        transferStartTime = Date.now();
        sendChunks();
    }

    async function sendChunks() {
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        let chunkIndex = 0;

        const reader = new FileReader();

        async function readAndSendChunk(start) {
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const blob = file.slice(start, end);

            return new Promise((resolve) => {
                reader.onload = async (e) => {
                    const chunk = e.target.result;

                    // Wait for buffer to drain if needed
                    await waitForBuffer();

                    connection.send({
                        type: 'chunk',
                        index: chunkIndex,
                        data: chunk
                    });

                    bytesSent = end;
                    updateProgress();
                    chunkIndex++;
                    resolve();
                };
                reader.readAsArrayBuffer(blob);
            });
        }

        // Send chunks sequentially
        for (let start = 0; start < file.size; start += CHUNK_SIZE) {
            await readAndSendChunk(start);
        }

        // Send complete message
        connection.send({ type: 'complete' });
        showComplete();
    }

    function waitForBuffer() {
        return new Promise((resolve) => {
            const checkBuffer = () => {
                // Check if underlying data channel buffer is full
                if (connection.dataChannel &&
                    connection.dataChannel.bufferedAmount > 1024 * 1024) { // 1MB buffer limit
                    setTimeout(checkBuffer, 10);
                } else {
                    resolve();
                }
            };
            checkBuffer();
        });
    }

    function updateProgress() {
        const percent = (bytesSent / file.size) * 100;
        const elapsed = (Date.now() - transferStartTime) / 1000; // seconds
        const speed = bytesSent / elapsed; // bytes per second

        const progressSection = document.getElementById('sender-progress');
        progressSection.querySelector('.progress-fill').style.width = percent + '%';
        progressSection.querySelector('.progress-percent').textContent = percent.toFixed(1) + '%';
        progressSection.querySelector('.progress-speed').textContent = formatSize(speed) + '/s';
        progressSection.querySelector('.progress-transferred').textContent =
            formatSize(bytesSent) + ' / ' + formatSize(file.size);
    }

    function updateStatus(message) {
        document.getElementById('sender-status').textContent = message;
    }

    function showComplete() {
        document.getElementById('sender-progress').classList.add('hidden');
        document.getElementById('sender-complete').classList.remove('hidden');
    }

    function reset() {
        if (peer) {
            peer.destroy();
            peer = null;
        }
        connection = null;
        file = null;
        code = null;
        bytesSent = 0;
        transferStartTime = null;

        // Reset UI
        document.getElementById('drop-zone').classList.remove('hidden');
        document.getElementById('sender-file-info').classList.add('hidden');
        document.getElementById('sender-code-section').classList.add('hidden');
        document.getElementById('sender-progress').classList.add('hidden');
        document.getElementById('sender-complete').classList.add('hidden');

        // Reset progress bar
        document.querySelector('#sender-progress .progress-fill').style.width = '0%';
    }

    function copyCode() {
        if (code) {
            navigator.clipboard.writeText(code).then(() => {
                const btn = document.getElementById('copy-code-btn');
                btn.classList.add('copied');
                btn.innerHTML = '&#10003;';
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
                }, 1500);
            });
        }
    }

    return {
        init,
        reset,
        copyCode
    };
})();
