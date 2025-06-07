// QR Code module for the NFC Business Card application

class QRManager {
    constructor() {
        this.isScanning = false;
        this.scanner = null;
        this.stream = null;
        this.currentQRCode = null;
        this.initialize();
    }

    // Initialize QR manager
    initialize() {
        this.setupEventListeners();
        console.log('QR Manager initialized');
    }

    // Setup DOM event listeners
    setupEventListeners() {
        const generateQRBtn = document.getElementById('generateQR');
        const scanQRBtn = document.getElementById('scanQR');
        const downloadQRBtn = document.getElementById('downloadQR');
        const startScannerBtn = document.getElementById('startScanner');
        const stopScannerBtn = document.getElementById('stopScanner');
        const closeScannerModal = document.getElementById('closeScannerModal');

        if (generateQRBtn) {
            generateQRBtn.addEventListener('click', () => this.generateQRCode());
        }

        if (scanQRBtn) {
            scanQRBtn.addEventListener('click', () => this.openScannerModal());
        }

        if (downloadQRBtn) {
            downloadQRBtn.addEventListener('click', () => this.downloadQRCode());
        }

        if (startScannerBtn) {
            startScannerBtn.addEventListener('click', () => this.startScanning());
        }

        if (stopScannerBtn) {
            stopScannerBtn.addEventListener('click', () => this.stopScanning());
        }

        if (closeScannerModal) {
            closeScannerModal.addEventListener('click', () => this.closeScannerModal());
        }

        // Close modal when clicking outside
        const scannerModal = document.getElementById('scannerModal');
        if (scannerModal) {
            scannerModal.addEventListener('click', (e) => {
                if (e.target === scannerModal) {
                    this.closeScannerModal();
                }
            });
        }
    }

    // Generate QR code for user profile
    async generateQRCode() {
        try {
            if (!window.userProfile?.profile) {
                utils.showToast('Please create your profile first', 'warning');
                if (window.app?.navigateTo) {
                    window.app.navigateTo('profile');
                }
                return;
            }

            utils.showLoading();

            // Create profile data for sharing
            const profileData = utils.createProfileData(
                window.userProfile.profile,
                authManager.getUserId()
            );

            // Convert to JSON string
            const dataString = JSON.stringify(profileData);

            // Generate QR code using qr-server.com API (free service)
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(dataString)}`;

            // Create QR code image element
            const qrCodeContainer = document.getElementById('qrCode');
            if (qrCodeContainer) {
                qrCodeContainer.innerHTML = `
                    <img src="${qrCodeUrl}" alt="QR Code" style="max-width: 100%; height: auto; border-radius: 8px;">
                `;
                
                // Store current QR code for download
                this.currentQRCode = qrCodeUrl;
                
                // Show download button
                const downloadBtn = document.getElementById('downloadQR');
                if (downloadBtn) {
                    downloadBtn.style.display = 'inline-flex';
                }
            }

            utils.showToast('QR code generated successfully!', 'success');

        } catch (error) {
            console.error('QR generation error:', error);
            utils.showToast('Failed to generate QR code', 'error');
        } finally {
            utils.hideLoading();
        }
    }

    // Download QR code
    async downloadQRCode() {
        try {
            if (!this.currentQRCode) {
                utils.showToast('No QR code to download', 'warning');
                return;
            }

            // Fetch the image
            const response = await fetch(this.currentQRCode);
            const blob = await response.blob();

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `business-card-qr-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            utils.showToast('QR code downloaded!', 'success');

        } catch (error) {
            console.error('QR download error:', error);
            utils.showToast('Failed to download QR code', 'error');
        }
    }

    // Open scanner modal
    openScannerModal() {
        const modal = document.getElementById('scannerModal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    // Close scanner modal
    closeScannerModal() {
        this.stopScanning();
        const modal = document.getElementById('scannerModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Start QR code scanning
    async startScanning() {
        try {
            if (!utils.isCameraSupported()) {
                throw new Error('Camera not supported on this device');
            }

            // Request camera permission
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' } // Use back camera if available
            });

            const video = document.getElementById('scannerVideo');
            if (video) {
                video.srcObject = this.stream;
                video.play();
            }

            this.isScanning = true;
            this.updateScannerButtons('scanning');

            // Start QR detection
            this.startQRDetection();

            utils.showToast('Scanner started. Point camera at QR code', 'info');

        } catch (error) {
            console.error('Scanner start error:', error);
            
            if (error.name === 'NotAllowedError') {
                utils.showToast('Camera permission denied', 'error');
            } else if (error.name === 'NotFoundError') {
                utils.showToast('No camera found', 'error');
            } else {
                utils.showToast('Failed to start scanner', 'error');
            }
        }
    }

    // Stop QR code scanning
    stopScanning() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.scanner) {
            clearInterval(this.scanner);
            this.scanner = null;
        }

        const video = document.getElementById('scannerVideo');
        if (video) {
            video.srcObject = null;
        }

        this.isScanning = false;
        this.updateScannerButtons('idle');
    }

    // Start QR detection using canvas
    startQRDetection() {
        const video = document.getElementById('scannerVideo');
        if (!video) return;

        this.scanner = setInterval(() => {
            this.detectQRCode(video);
        }, 500); // Check every 500ms
    }

    // Detect QR code from video frame
    detectQRCode(video) {
        try {
            if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

            // Create canvas to capture video frame
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Get image data
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            
            // Use qr-scanner library (we'll implement a basic version)
            // For production, you might want to use a dedicated QR scanning library
            this.processImageData(imageData);

        } catch (error) {
            console.error('QR detection error:', error);
        }
    }

    // Process image data for QR codes (simplified implementation)
    // Note: This is a basic implementation. For production use, consider using
    // libraries like @zxing/library or qr-scanner
    processImageData(imageData) {
        // This is a placeholder for QR code detection
        // In a real implementation, you would use a QR code detection library
        
        // For now, we'll provide manual input option
        // You can replace this with actual QR detection logic
    }

    // Manual QR code input (fallback)
    showManualInput() {
        const qrData = prompt('Enter QR code data manually:');
        if (qrData) {
            this.processQRData(qrData);
        }
    }

    // Process scanned QR data
    async processQRData(data) {
        try {
            // Parse profile data
            const profileData = utils.parseProfileData(data);
            
            // Process the received profile (same as NFC)
            await this.processReceivedProfile(profileData, 'QR');
            
            utils.showToast('Profile received via QR code!', 'success');
            this.closeScannerModal();

        } catch (error) {
            console.error('QR data processing error:', error);
            utils.showToast('Invalid QR code data', 'error');
        }
    }

    // Process received profile data
    async processReceivedProfile(profileData, shareMethod) {
        try {
            // Get current location
            let location = {};
            try {
                const position = await utils.getCurrentLocation();
                location = position;
            } catch (error) {
                console.warn('Could not get location:', error);
            }

            // Get device info
            const deviceInfo = utils.getDeviceInfo();

            // Save the connection
            const connectionData = {
                senderUid: profileData.senderUid,
                sharedProfile: profileData.profile,
                shareMethod: shareMethod,
                location: location,
                deviceInfo: deviceInfo
            };

            const response = await utils.apiRequest('/connections/save', {
                method: 'POST',
                body: JSON.stringify(connectionData)
            });

            if (response.success) {
                console.log('Connection saved:', response.connection);
                
                // Show profile preview (reuse from NFC manager)
                if (window.nfcManager) {
                    window.nfcManager.showReceivedProfilePreview(profileData.profile);
                }
                
                // Refresh connections if on connections page
                if (window.connectionsManager) {
                    await window.connectionsManager.loadConnections();
                }
            }

        } catch (error) {
            console.error('Failed to save connection:', error);
            utils.showToast('Profile received but failed to save', 'warning');
        }
    }

    // Update scanner button states
    updateScannerButtons(state) {
        const startBtn = document.getElementById('startScanner');
        const stopBtn = document.getElementById('stopScanner');

        if (!startBtn || !stopBtn) return;

        switch (state) {
            case 'scanning':
                startBtn.style.display = 'none';
                stopBtn.style.display = 'inline-flex';
                break;
            case 'idle':
            default:
                startBtn.style.display = 'inline-flex';
                stopBtn.style.display = 'none';
                break;
        }
    }

    // Share profile via other methods (social media, messaging apps)
    shareQRCode() {
        if (!this.currentQRCode) {
            utils.showToast('Generate QR code first', 'warning');
            return;
        }

        if (navigator.share) {
            // Use Web Share API if available
            navigator.share({
                title: 'My Business Card',
                text: 'Scan this QR code to get my contact information',
                url: this.currentQRCode
            }).catch(error => {
                console.error('Share failed:', error);
                this.fallbackShare();
            });
        } else {
            this.fallbackShare();
        }
    }

    // Fallback share methods
    fallbackShare() {
        // Copy QR code URL to clipboard
        utils.copyToClipboard(this.currentQRCode);
        utils.showToast('QR code URL copied to clipboard', 'success');
    }

    // Generate QR code with custom styling (advanced feature)
    async generateStyledQRCode(options = {}) {
        try {
            const {
                size = 300,
                color = '000000',
                bgcolor = 'ffffff',
                format = 'png'
            } = options;

            if (!window.userProfile?.profile) {
                throw new Error('No profile data available');
            }

            const profileData = utils.createProfileData(
                window.userProfile.profile,
                authManager.getUserId()
            );

            const dataString = JSON.stringify(profileData);
            
            // Use advanced QR generation service with styling options
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(dataString)}&color=${color}&bgcolor=${bgcolor}&format=${format}`;

            return qrCodeUrl;

        } catch (error) {
            console.error('Styled QR generation error:', error);
            throw error;
        }
    }

    // Get QR scanner status
    getStatus() {
        return {
            isScanning: this.isScanning,
            hasQRCode: !!this.currentQRCode,
            cameraSupported: utils.isCameraSupported()
        };
    }
}

// Initialize QR manager
const qrManager = new QRManager();

// Add simple QR code detection using UserMedia API and Canvas
// This is a basic implementation - for production, use a dedicated QR library
document.addEventListener('DOMContentLoaded', () => {
    // Add a manual input button for QR data (fallback)
    const scannerActions = document.querySelector('.scanner-actions');
    if (scannerActions) {
        const manualBtn = document.createElement('button');
        manualBtn.className = 'btn-secondary';
        manualBtn.textContent = 'Manual Input';
        manualBtn.addEventListener('click', () => qrManager.showManualInput());
        scannerActions.appendChild(manualBtn);
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && qrManager.isScanning) {
        qrManager.stopScanning();
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (qrManager.isScanning) {
        qrManager.stopScanning();
    }
});

// Export QR manager for use in other modules
window.qrManager = qrManager; 