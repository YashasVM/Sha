// Receiver functionality
const Receiver = (function() {
    let peer = null;
    let connection = null;
    let fileMetadata = null;
    let receivedChunks = [];
    let bytesReceived = 0;
    let transferStartTime = null;

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }

    function connect(code) {
        code = code.toUpperCase().trim();

        if (code.length !== 6) {
            showError('Please enter a 6-character code');
            return;
        }

        // Show connecting state
        document.getElementById('receiver-input-section').classList.add('hidden');
        document.getElementById('receiver-connecting').classList.remove('hidden');

        // Create peer
        peer = new Peer({
            debug: 0
        });

        peer.on('open', () => {
            // Connect to sender
            const senderId = 'shata-' + code.toLowerCase();
            connection = peer.connect(senderId, {
                reliable: true
            });

            connection.on('open', () => {
                document.getElementById('receiver-connecting').classList.add('hidden');
            });

            connection.on('data', handleData);

            connection.on('error', (err) => {
                console.error('Connection error:', err);
                showError('Connection lost. Please try again.');
            });

            connection.on('close', () => {
                if (bytesReceived < fileMetadata?.size) {
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

        // Timeout for connection
        setTimeout(() => {
            if (!connection || !connection.open) {
                showError('Connection timeout. Check the code and try again.');
            }
        }, 15000);
    }

    function handleData(data) {
        switch (data.type) {
            case 'metadata':
                handleMetadata(data);
                break;
            case 'chunk':
                handleChunk(data);
                break;
            case 'complete':
                handleComplete();
                break;
        }
    }

    function handleMetadata(data) {
        fileMetadata = {
            name: data.name,
            size: data.size,
            mimeType: data.mimeType
        };
        receivedChunks = [];
        bytesReceived = 0;
        transferStartTime = Date.now();

        // Show file info
        const fileInfo = document.getElementById('receiver-file-info');
        fileInfo.querySelector('.file-name').textContent = data.name;
        fileInfo.querySelector('.file-size').textContent = formatSize(data.size);
        fileInfo.classList.remove('hidden');

        // Show progress
        document.getElementById('receiver-progress').classList.remove('hidden');
    }

    function handleChunk(data) {
        receivedChunks[data.index] = data.data;
        bytesReceived += data.data.byteLength;
        updateProgress();
    }

    function handleComplete() {
        // Combine chunks into file
        const blob = new Blob(receivedChunks, { type: fileMetadata.mimeType });

        // Trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileMetadata.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show complete
        showComplete();
    }

    function updateProgress() {
        if (!fileMetadata) return;

        const percent = (bytesReceived / fileMetadata.size) * 100;
        const elapsed = (Date.now() - transferStartTime) / 1000;
        const speed = bytesReceived / elapsed;

        const progressSection = document.getElementById('receiver-progress');
        progressSection.querySelector('.progress-fill').style.width = percent + '%';
        progressSection.querySelector('.progress-percent').textContent = percent.toFixed(1) + '%';
        progressSection.querySelector('.progress-speed').textContent = formatSize(speed) + '/s';
        progressSection.querySelector('.progress-transferred').textContent =
            formatSize(bytesReceived) + ' / ' + formatSize(fileMetadata.size);
    }

    function showComplete() {
        document.getElementById('receiver-file-info').classList.add('hidden');
        document.getElementById('receiver-progress').classList.add('hidden');
        document.getElementById('receiver-complete').classList.remove('hidden');
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
        fileMetadata = null;
        receivedChunks = [];
        bytesReceived = 0;
        transferStartTime = null;

        // Reset UI
        document.getElementById('receiver-input-section').classList.remove('hidden');
        document.getElementById('receiver-connecting').classList.add('hidden');
        document.getElementById('receiver-file-info').classList.add('hidden');
        document.getElementById('receiver-progress').classList.add('hidden');
        document.getElementById('receiver-complete').classList.add('hidden');
        document.getElementById('receiver-error').classList.add('hidden');
        document.getElementById('code-input').value = '';

        // Reset progress bar
        document.querySelector('#receiver-progress .progress-fill').style.width = '0%';
    }

    return {
        connect,
        reset
    };
})();
