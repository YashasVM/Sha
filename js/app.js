// Main application logic
(function() {
    // DOM Elements
    const sendModeBtn = document.getElementById('send-mode-btn');
    const receiveModeBtn = document.getElementById('receive-mode-btn');
    const senderView = document.getElementById('sender-view');
    const receiverView = document.getElementById('receiver-view');

    // Sender elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const selectFileBtn = document.getElementById('select-file-btn');
    const copyCodeBtn = document.getElementById('copy-code-btn');
    const sendAnotherBtn = document.getElementById('send-another-btn');

    // Receiver elements
    const codeInput = document.getElementById('code-input');
    const connectBtn = document.getElementById('connect-btn');
    const receiveAnotherBtn = document.getElementById('receive-another-btn');
    const retryBtn = document.getElementById('retry-btn');

    // Mode switching
    function switchToSendMode() {
        sendModeBtn.classList.add('active');
        receiveModeBtn.classList.remove('active');
        senderView.classList.add('active');
        receiverView.classList.remove('active');
        Receiver.reset();
    }

    function switchToReceiveMode() {
        receiveModeBtn.classList.add('active');
        sendModeBtn.classList.remove('active');
        receiverView.classList.add('active');
        senderView.classList.remove('active');
        Sender.reset();
    }

    sendModeBtn.addEventListener('click', switchToSendMode);
    receiveModeBtn.addEventListener('click', switchToReceiveMode);

    // Sender: File selection
    selectFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            Sender.init(e.target.files[0]);
        }
    });

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');

        if (e.dataTransfer.files.length > 0) {
            Sender.init(e.dataTransfer.files[0]);
        }
    });

    // Copy code
    copyCodeBtn.addEventListener('click', () => {
        Sender.copyCode();
    });

    // Send another
    sendAnotherBtn.addEventListener('click', () => {
        Sender.reset();
        fileInput.value = '';
    });

    // Receiver: Connect
    connectBtn.addEventListener('click', () => {
        const code = codeInput.value;
        if (code) {
            Receiver.connect(code);
        }
    });

    codeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const code = codeInput.value;
            if (code) {
                Receiver.connect(code);
            }
        }
    });

    // Auto-uppercase input
    codeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });

    // Handle paste
    codeInput.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text');
        const cleaned = pasted.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        e.target.value = cleaned;
    });

    // Receive another
    receiveAnotherBtn.addEventListener('click', () => {
        Receiver.reset();
    });

    // Retry on error
    retryBtn.addEventListener('click', () => {
        Receiver.reset();
    });

    // Prevent default drag behavior on window
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());
})();
