// Receiver functionality
const Receiver = (function() {
    const PROGRESS_UPDATE_INTERVAL = 80;

    let peer = null;
    let connection = null;
    let manifest = null;
    let currentFile = null;
    let currentFileChunks = [];
    let totalBytesReceived = 0;
    let transferStartTime = null;
    let lastProgressUpdate = 0;
    let transferComplete = false;
    let dataQueue = Promise.resolve();

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }

    function setFileInfo(title, size, subtitle) {
        const fileInfo = document.getElementById('receiver-file-info');
        fileInfo.querySelector('.file-name').textContent = title;
        fileInfo.querySelector('.file-size').textContent = size;
        fileInfo.querySelector('.file-subtext').textContent = subtitle || '';
        fileInfo.classList.remove('hidden');
    }

    function setManifestSummary() {
        if (!manifest) return;

        if (manifest.totalFiles === 1) {
            const onlyFile = manifest.files[0];
            setFileInfo(onlyFile.name, formatSize(onlyFile.size), 'Preparing transfer');
            return;
        }

        const previewNames = manifest.files.slice(0, 3).map((item) => item.name).join(', ');
        const remaining = manifest.totalFiles - 3;
        const suffix = remaining > 0 ? ` + ${remaining} more` : '';

        setFileInfo(
            `${manifest.totalFiles} files incoming`,
            formatSize(manifest.totalSize),
            previewNames + suffix
        );
    }

    function showCurrentFile(index) {
        const file = manifest.files[index];
        setFileInfo(
            file.name,
            formatSize(file.size),
            `File ${index + 1} of ${manifest.totalFiles}`
        );
    }

    function connect(code) {
        code = code.toUpperCase().trim();

        if (code.length !== 6) {
            showError('Please enter a 6-character code');
            return;
        }

        document.getElementById('receiver-input-section').classList.add('hidden');
        document.getElementById('receiver-connecting').classList.remove('hidden');

        dataQueue = Promise.resolve();
        transferComplete = false;

        peer = new Peer({
            debug: 0
        });

        peer.on('open', () => {
            const senderId = 'shata-' + code.toLowerCase();
            connection = peer.connect(senderId, {
                reliable: true,
                serialization: 'binary'
            });

            connection.on('open', () => {
                document.getElementById('receiver-connecting').classList.add('hidden');
            });

            connection.on('data', (data) => {
                dataQueue = dataQueue
                    .then(() => handleData(data))
                    .catch((err) => {
                        console.error('Data handling error:', err);
                        showError('Transfer failed while receiving data.');
                    });
            });

            connection.on('error', (err) => {
                console.error('Connection error:', err);
                showError('Connection lost. Please try again.');
            });

            connection.on('close', () => {
                if (!transferComplete && totalBytesReceived < (manifest?.totalSize ?? Infinity)) {
                    showError('Connection closed unexpectedly.');
                }
            });
        });

        peer.on('error', (err) => {
            console.error('Peer error:', err);
            if (err.type === 'peer-unavailable') {
                showError('Invalid code or sender not available.');
            } else {
                showError('Connection error. Please try again.');
            }
        });

        setTimeout(() => {
            if (!connection || !connection.open) {
                showError('Connection timeout. Check the code and try again.');
            }
        }, 15000);
    }

    async function handleData(data) {
        if (data instanceof ArrayBuffer || ArrayBuffer.isView(data) || data instanceof Blob) {
            await handleChunk(data);
            return;
        }

        switch (data.type) {
            case 'manifest':
                handleManifest(data);
                break;
            case 'file-start':
                handleFileStart(data);
                break;
            case 'file-complete':
                handleFileComplete();
                break;
            case 'transfer-complete':
                handleTransferComplete();
                break;
        }
    }

    function handleManifest(data) {
        manifest = {
            totalFiles: data.totalFiles,
            totalSize: data.totalSize,
            files: data.files
        };
        totalBytesReceived = 0;
        transferStartTime = Date.now();
        lastProgressUpdate = 0;

        setManifestSummary();
        document.getElementById('receiver-progress').classList.remove('hidden');
        updateProgress(true);
    }

    function handleFileStart(data) {
        if (!manifest) return;

        currentFile = manifest.files[data.index];
        currentFileChunks = [];
        showCurrentFile(data.index);
    }

    async function handleChunk(data) {
        if (!currentFile) return;

        const chunk = data instanceof Blob ? await data.arrayBuffer() : data;
        const chunkSize = chunk.byteLength;

        currentFileChunks.push(chunk);
        totalBytesReceived += chunkSize;
        updateProgress();
    }

    function handleFileComplete() {
        if (!currentFile) return;

        const blob = new Blob(currentFileChunks, { type: currentFile.mimeType });
        downloadBlob(blob, currentFile.name);
        updateProgress(true);

        currentFile = null;
        currentFileChunks = [];
    }

    function handleTransferComplete() {
        transferComplete = true;
        showComplete();
    }

    function downloadBlob(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);
    }

    function updateProgress(force) {
        if (!manifest || !transferStartTime) return;

        const now = performance.now();
        if (!force && now - lastProgressUpdate < PROGRESS_UPDATE_INTERVAL) {
            return;
        }

        lastProgressUpdate = now;

        const percent = manifest.totalSize === 0 ? 100 : (totalBytesReceived / manifest.totalSize) * 100;
        const elapsed = Math.max((Date.now() - transferStartTime) / 1000, 0.001);
        const speed = totalBytesReceived / elapsed;

        const progressSection = document.getElementById('receiver-progress');
        progressSection.querySelector('.progress-fill').style.width = percent + '%';
        progressSection.querySelector('.progress-percent').textContent = percent.toFixed(1) + '%';
        progressSection.querySelector('.progress-speed').textContent = formatSize(speed) + '/s';
        progressSection.querySelector('.progress-transferred').textContent =
            formatSize(totalBytesReceived) + ' / ' + formatSize(manifest.totalSize);
    }

    function showComplete() {
        document.getElementById('receiver-file-info').classList.add('hidden');
        document.getElementById('receiver-progress').classList.add('hidden');
        document.getElementById('receiver-complete').classList.remove('hidden');
        document.getElementById('receiver-complete-message').textContent =
            manifest && manifest.totalFiles > 1
                ? `${manifest.totalFiles} files downloaded`
                : 'Download complete';
    }

    function showError(message) {
        document.getElementById('receiver-connecting').classList.add('hidden');
        document.getElementById('receiver-input-section').classList.add('hidden');
        document.getElementById('receiver-file-info').classList.add('hidden');
        document.getElementById('receiver-progress').classList.add('hidden');

        const errorSection = document.getElementById('receiver-error');
        errorSection.querySelector('.error-message').textContent = message;
        errorSection.classList.remove('hidden');
    }

    function reset() {
        if (peer) {
            peer.destroy();
            peer = null;
        }

        connection = null;
        manifest = null;
        currentFile = null;
        currentFileChunks = [];
        totalBytesReceived = 0;
        transferStartTime = null;
        lastProgressUpdate = 0;
        transferComplete = false;
        dataQueue = Promise.resolve();

        document.getElementById('receiver-input-section').classList.remove('hidden');
        document.getElementById('receiver-connecting').classList.add('hidden');
        document.getElementById('receiver-file-info').classList.add('hidden');
        document.getElementById('receiver-progress').classList.add('hidden');
        document.getElementById('receiver-complete').classList.add('hidden');
        document.getElementById('receiver-error').classList.add('hidden');
        document.getElementById('receiver-complete-message').textContent = 'Download complete';
        document.getElementById('code-input').value = '';

        const fileInfo = document.getElementById('receiver-file-info');
        fileInfo.querySelector('.file-name').textContent = '';
        fileInfo.querySelector('.file-size').textContent = '';
        fileInfo.querySelector('.file-subtext').textContent = '';

        document.querySelector('#receiver-progress .progress-fill').style.width = '0%';
        document.querySelector('#receiver-progress .progress-percent').textContent = '0%';
        document.querySelector('#receiver-progress .progress-speed').textContent = '0 MB/s';
        document.querySelector('#receiver-progress .progress-transferred').textContent = '0 / 0 MB';
    }

    return {
        connect,
        reset
    };
})();
