// Sender functionality
const Sender = (function() {
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    const CODE_LENGTH = 6;
    const MAX_BUFFERED_AMOUNT = 4 * 1024 * 1024;
    const BUFFER_LOW_AMOUNT = 1 * 1024 * 1024;
    const PROGRESS_UPDATE_INTERVAL = 80;

    let peer = null;
    let connection = null;
    let files = [];
    let code = null;
    let transferStartTime = null;
    let bytesSent = 0;
    let totalSize = 0;
    let lastProgressUpdate = 0;
    let transferFinished = false;

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

    function setFileInfo(title, size, subtitle) {
        const fileInfo = document.getElementById('sender-file-info');
        fileInfo.querySelector('.file-name').textContent = title;
        fileInfo.querySelector('.file-size').textContent = size;
        fileInfo.querySelector('.file-subtext').textContent = subtitle || '';
        fileInfo.classList.remove('hidden');
    }

    function renderSelectionSummary() {
        if (files.length === 0) return;

        if (files.length === 1) {
            setFileInfo(files[0].name, formatSize(files[0].size), 'Ready to send');
            return;
        }

        const previewNames = files.slice(0, 3).map((item) => item.name).join(', ');
        const remaining = files.length - 3;
        const suffix = remaining > 0 ? ` + ${remaining} more` : '';

        setFileInfo(
            `${files.length} files selected`,
            formatSize(totalSize),
            previewNames + suffix
        );
    }

    function showCurrentFile(index) {
        const currentFile = files[index];
        setFileInfo(
            currentFile.name,
            formatSize(currentFile.size),
            `File ${index + 1} of ${files.length}`
        );
    }

    function init(selectedFiles) {
        files = selectedFiles.filter(Boolean);
        code = generateCode();
        bytesSent = 0;
        totalSize = files.reduce((sum, item) => sum + item.size, 0);
        transferStartTime = null;
        lastProgressUpdate = 0;
        transferFinished = false;

        renderSelectionSummary();

        const codeSection = document.getElementById('sender-code-section');
        document.getElementById('share-code').textContent = code;
        codeSection.classList.remove('hidden');

        document.getElementById('drop-zone').classList.add('hidden');

        createPeer();
    }

    function createPeer() {
        if (peer) {
            peer.destroy();
        }

        const peerId = 'shata-' + code.toLowerCase();

        peer = new Peer(peerId, {
            debug: 0
        });

        peer.on('open', () => {
            updateStatus('Waiting for receiver...');
        });

        peer.on('connection', (conn) => {
            connection = conn;
            updateStatus('Receiver connected!');

            conn.on('open', () => {
                void sendFiles();
            });

            conn.on('error', (err) => {
                console.error('Connection error:', err);
                updateStatus('Connection error. Try again.');
            });

            conn.on('close', () => {
                if (!transferFinished) {
                    updateStatus('Connection closed before transfer finished.');
                }
            });
        });

        peer.on('error', (err) => {
            console.error('Peer error:', err);
            if (err.type === 'unavailable-id') {
                code = generateCode();
                document.getElementById('share-code').textContent = code;
                createPeer();
            } else {
                updateStatus('Connection error. Please refresh.');
            }
        });
    }

    async function sendFiles() {
        if (!connection || files.length === 0) return;

        document.getElementById('sender-code-section').classList.add('hidden');
        document.getElementById('sender-progress').classList.remove('hidden');

        connection.send({
            type: 'manifest',
            totalFiles: files.length,
            totalSize,
            files: files.map((item, index) => ({
                index,
                name: item.name,
                size: item.size,
                mimeType: item.type || 'application/octet-stream'
            }))
        });

        transferStartTime = Date.now();
        updateProgress(true);

        for (let index = 0; index < files.length; index++) {
            showCurrentFile(index);
            updateStatus(`Sending file ${index + 1} of ${files.length}`);

            connection.send({
                type: 'file-start',
                index
            });

            await sendSingleFile(files[index]);

            connection.send({
                type: 'file-complete',
                index
            });
        }

        connection.send({ type: 'transfer-complete' });
        transferFinished = true;
        showComplete();
    }

    async function sendSingleFile(file) {
        const reader = file.stream().getReader();

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    updateProgress(true);
                    return;
                }

                await waitForBuffer();

                connection.send(value);
                bytesSent += value.byteLength;
                updateProgress();
            }
        } finally {
            reader.releaseLock();
        }
    }

    function waitForBuffer() {
        const dataChannel = connection?.dataChannel;

        if (!dataChannel || dataChannel.bufferedAmount <= MAX_BUFFERED_AMOUNT) {
            return Promise.resolve();
        }

        dataChannel.bufferedAmountLowThreshold = BUFFER_LOW_AMOUNT;

        return new Promise((resolve) => {
            let settled = false;
            let intervalId = null;

            const finish = () => {
                if (settled) return;
                settled = true;
                if (typeof dataChannel.removeEventListener === 'function') {
                    dataChannel.removeEventListener('bufferedamountlow', onBufferedLow);
                }
                if (intervalId) {
                    clearInterval(intervalId);
                }
                resolve();
            };

            const onBufferedLow = () => {
                if (!connection?.open || dataChannel.bufferedAmount <= BUFFER_LOW_AMOUNT) {
                    finish();
                }
            };

            if (typeof dataChannel.addEventListener === 'function') {
                dataChannel.addEventListener('bufferedamountlow', onBufferedLow);
            }

            intervalId = setInterval(() => {
                if (!connection?.open || dataChannel.bufferedAmount <= BUFFER_LOW_AMOUNT) {
                    finish();
                }
            }, 16);
        });
    }

    function updateProgress(force) {
        if (!transferStartTime) return;

        const now = performance.now();
        if (!force && now - lastProgressUpdate < PROGRESS_UPDATE_INTERVAL) {
            return;
        }

        lastProgressUpdate = now;

        const percent = totalSize === 0 ? 100 : (bytesSent / totalSize) * 100;
        const elapsed = Math.max((Date.now() - transferStartTime) / 1000, 0.001);
        const speed = bytesSent / elapsed;

        const progressSection = document.getElementById('sender-progress');
        progressSection.querySelector('.progress-fill').style.width = percent + '%';
        progressSection.querySelector('.progress-percent').textContent = percent.toFixed(1) + '%';
        progressSection.querySelector('.progress-speed').textContent = formatSize(speed) + '/s';
        progressSection.querySelector('.progress-transferred').textContent =
            formatSize(bytesSent) + ' / ' + formatSize(totalSize);
    }

    function updateStatus(message) {
        document.getElementById('sender-status').textContent = message;
    }

    function showComplete() {
        document.getElementById('sender-progress').classList.add('hidden');
        document.getElementById('sender-complete').classList.remove('hidden');
        document.getElementById('sender-complete-message').textContent =
            files.length === 1 ? 'Transfer complete' : `${files.length} files transferred`;
    }

    function reset() {
        if (peer) {
            peer.destroy();
            peer = null;
        }

        connection = null;
        files = [];
        code = null;
        transferStartTime = null;
        bytesSent = 0;
        totalSize = 0;
        lastProgressUpdate = 0;
        transferFinished = false;

        document.getElementById('drop-zone').classList.remove('hidden');
        document.getElementById('sender-file-info').classList.add('hidden');
        document.getElementById('sender-code-section').classList.add('hidden');
        document.getElementById('sender-progress').classList.add('hidden');
        document.getElementById('sender-complete').classList.add('hidden');
        document.getElementById('sender-status').textContent = 'Waiting for receiver...';
        document.getElementById('sender-complete-message').textContent = 'Transfer complete';

        const fileInfo = document.getElementById('sender-file-info');
        fileInfo.querySelector('.file-name').textContent = '';
        fileInfo.querySelector('.file-size').textContent = '';
        fileInfo.querySelector('.file-subtext').textContent = '';

        document.querySelector('#sender-progress .progress-fill').style.width = '0%';
        document.querySelector('#sender-progress .progress-percent').textContent = '0%';
        document.querySelector('#sender-progress .progress-speed').textContent = '0 MB/s';
        document.querySelector('#sender-progress .progress-transferred').textContent = '0 / 0 MB';
    }

    function copyCode() {
        if (!code) return;

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

    return {
        init,
        reset,
        copyCode
    };
})();
