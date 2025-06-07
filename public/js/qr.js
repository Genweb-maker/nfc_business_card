// QR Code module for the NFC Business Card application

class QRManager {
    constructor() {
        this.isScanning = false;
        this.scanner = null;
        this.qrScanner = null;
        this.stream = null;
        this.currentQRCode = null;
        this.initialize();
    }

    // Initialize QR manager
    initialize() {
        this.setupEventListeners();
        
        // Set QR Scanner worker path
        if (typeof QrScanner !== 'undefined') {
            QrScanner.WORKER_PATH = 'js/qr-scanner-worker.min.js';
        }
        
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

            console.log('Requesting camera access...');

            const video = document.getElementById('scannerVideo');
            if (!video) {
                throw new Error('Scanner video element not found');
            }

            // Check if QrScanner library is available
            if (typeof QrScanner === 'undefined') {
                console.error('QrScanner library not loaded, falling back to manual method');
                // Fallback to the manual canvas method
                return this.startScanningFallback();
            }

            // Use QrScanner library directly on video element
            try {
                this.qrScanner = new QrScanner(video, 
                    result => {
                        console.log('QR Code detected:', result);
                        this.showQRDetectionFeedback();
                        // Extract the data string from the result object
                        const qrData = typeof result === 'string' ? result : result.data;
                        this.processQRData(qrData);
                        this.stopScanning();
                    },
                    {
                        returnDetailedScanResult: false,
                        highlightScanRegion: true,
                        highlightCodeOutline: true,
                    }
                );

                await this.qrScanner.start();
                
                this.isScanning = true;
                this.updateScannerButtons('scanning');
                utils.showToast('Scanner started. Point camera at QR code', 'info');

            } catch (qrError) {
                console.log('QrScanner failed, using fallback method:', qrError);
                // Fallback to manual method if QrScanner fails
                this.startScanningFallback();
            }

        } catch (error) {
            console.error('Scanner start error:', error);
            
            if (error.name === 'NotAllowedError') {
                utils.showToast('Camera permission denied. Please allow camera access and try again.', 'error');
            } else if (error.name === 'NotFoundError') {
                utils.showToast('No camera found on this device', 'error');
            } else if (error.name === 'NotReadableError') {
                utils.showToast('Camera is being used by another application', 'error');
            } else {
                utils.showToast('Failed to start scanner: ' + error.message, 'error');
            }
        }
    }

    // Fallback scanning method using manual camera access
    async startScanningFallback() {
        try {
            // Request camera permission with fallback options
            let constraints = { video: { facingMode: 'environment' } };
            
            try {
                this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (backCameraError) {
                console.log('Back camera failed, trying front camera:', backCameraError);
                // Fallback to front camera
                constraints = { video: { facingMode: 'user' } };
                this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            }

            const video = document.getElementById('scannerVideo');
            if (video) {
                video.srcObject = this.stream;
                
                // Wait for video to load
                video.onloadedmetadata = () => {
                    console.log('Video loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
                    video.play();
                    
                    // Start QR detection after video is ready
                    setTimeout(() => {
                        this.startQRDetection();
                    }, 1000);
                };
            }

            this.isScanning = true;
            this.updateScannerButtons('scanning');
            utils.showToast('Scanner started (fallback mode). Point camera at QR code', 'info');

        } catch (error) {
            throw error; // Re-throw to be handled by parent method
        }
    }

    // Stop QR code scanning
    stopScanning() {
        // Stop QrScanner instance if it exists
        if (this.qrScanner) {
            this.qrScanner.stop();
            this.qrScanner.destroy();
            this.qrScanner = null;
        }

        // Stop manual camera stream if it exists
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // Stop manual scanner interval if it exists
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
        if (!video) {
            console.error('Scanner video element not found');
            return;
        }

        console.log('Starting QR detection interval');
        this.scanner = setInterval(async () => {
            if (this.isScanning && await this.detectQRCode(video)) {
                // Stop scanning once QR code is detected and processed
                console.log('QR code detected, stopping scanner');
                this.stopScanning();
            }
        }, 500); // Check every 500ms
    }

    // Detect QR code from video frame
    async detectQRCode(video) {
        try {
            if (video.readyState !== video.HAVE_ENOUGH_DATA) {
                // Video not ready yet
                return false;
            }

            // Check video dimensions
            if (video.videoWidth === 0 || video.videoHeight === 0) {
                console.log('Video dimensions not available yet');
                return false;
            }

            // Create canvas to capture video frame
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Get image data
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            
            // Process image data for QR codes
            return await this.processImageData(imageData);

        } catch (error) {
            console.error('QR detection error:', error);
            return false;
        }
    }

    // Process image data for QR codes using qr-scanner library or fallback
    async processImageData(imageData) {
        try {
            // Check if QrScanner library is available
            if (typeof QrScanner !== 'undefined') {
                // Create canvas from image data
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = imageData.width;
                canvas.height = imageData.height;
                ctx.putImageData(imageData, 0, 0);
                
                // Use QrScanner library for QR code detection
                try {
                    const result = await QrScanner.scanImage(canvas);
                    console.log('QR Code detected:', result);
                    
                    // Provide visual feedback
                    this.showQRDetectionFeedback();
                    
                    // Extract the data string from the result
                    const qrData = typeof result === 'string' ? result : result.data;
                    
                    // Process the QR data
                    this.processQRData(qrData);
                    return true;
                } catch (error) {
                    // No QR code found, this is normal
                    return false;
                }
            } else {
                // Fallback: Use basic pattern detection for QR codes
                console.log('Using fallback QR detection method');
                return await this.fallbackQRDetection(imageData);
            }
            
        } catch (error) {
            console.error('QR processing error:', error);
            return false;
        }
    }

    // Fallback QR detection using BarcodeDetector API or basic pattern recognition
    async fallbackQRDetection(imageData) {
        try {
            // Try BarcodeDetector API first (if available in browser)
            if ('BarcodeDetector' in window) {
                console.log('Using BarcodeDetector API');
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = imageData.width;
                canvas.height = imageData.height;
                ctx.putImageData(imageData, 0, 0);
                
                const barcodeDetector = new BarcodeDetector({
                    formats: ['qr_code']
                });
                
                try {
                    const barcodes = await barcodeDetector.detect(canvas);
                    if (barcodes.length > 0) {
                        console.log('QR Code detected via BarcodeDetector:', barcodes[0].rawValue);
                        
                        // Provide visual feedback
                        this.showQRDetectionFeedback();
                        
                        // Process the QR data
                        this.processQRData(barcodes[0].rawValue);
                        return true;
                    }
                } catch (error) {
                    console.log('BarcodeDetector failed:', error);
                }
            }
            
            // Basic pattern recognition fallback
            const { width, height, data } = imageData;
            const threshold = 128;
            let darkPixels = 0;
            let lightPixels = 0;
            
            // Sample every 4th pixel to improve performance
            for (let i = 0; i < data.length; i += 16) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const brightness = (r + g + b) / 3;
                
                if (brightness < threshold) {
                    darkPixels++;
                } else {
                    lightPixels++;
                }
            }
            
            // QR codes typically have a good balance of dark and light areas
            const total = darkPixels + lightPixels;
            const darkRatio = darkPixels / total;
            
            // If we detect a potential QR pattern (30-70% dark pixels)
            if (darkRatio > 0.3 && darkRatio < 0.7) {
                console.log('Potential QR pattern detected, but cannot decode without proper library');
                // Show manual input as fallback
                setTimeout(() => {
                    utils.showToast('QR pattern detected! Use manual input to enter QR data.', 'info');
                }, 1000);
            }
            
            return false;
        } catch (error) {
            console.error('Fallback QR detection error:', error);
            return false;
        }
    }

    // Show visual feedback when QR code is detected
    showQRDetectionFeedback() {
        const scannerFrame = document.querySelector('.scanner-frame');
        if (scannerFrame) {
            scannerFrame.style.borderColor = '#10B981';
            scannerFrame.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.5)';
            
            setTimeout(() => {
                scannerFrame.style.borderColor = '#6366f1';
                scannerFrame.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.5)';
            }, 1000);
        }
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
            console.log('Processing QR data:', data);
            
            // Try to parse as JSON first
            let profileData;
            try {
                profileData = JSON.parse(data);
            } catch (jsonError) {
                // If it's not JSON, try to parse as profile data
                profileData = utils.parseProfileData(data);
            }
            
            // Validate the profile data structure
            if (!profileData || !profileData.profile) {
                throw new Error('Invalid profile data structure');
            }
            
            // Process the received profile (same as NFC)
            await this.processReceivedProfile(profileData, 'QR');
            
            utils.showToast('Profile received via QR code!', 'success');
            this.closeScannerModal();

        } catch (error) {
            console.error('QR data processing error:', error);
            utils.showToast('Invalid QR code data: ' + error.message, 'error');
        }
    }

    // Process received profile data
    async processReceivedProfile(profileData, shareMethod) {
        try {
            // Get current location with enhanced features
            let location = {};
            try {
                const position = await utils.getLocationEnhanced({
                    useCache: true,
                    maxCacheAge: 300000, // 5 minutes
                    fallbackToIP: true
                });
                location = position;
                console.log('Location obtained:', location);
            } catch (error) {
                console.warn('Could not get location:', error);
                utils.showToast('Location not available', 'warning');
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
    // Add a manual input button and test button for QR data (fallback)
    const scannerActions = document.querySelector('.scanner-actions');
    if (scannerActions) {
        const manualBtn = document.createElement('button');
        manualBtn.className = 'btn-secondary';
        manualBtn.textContent = 'Manual Input';
        manualBtn.addEventListener('click', () => qrManager.showManualInput());
        scannerActions.appendChild(manualBtn);
        
        // Add test button for debugging
        const testBtn = document.createElement('button');
        testBtn.className = 'btn-secondary';
        testBtn.textContent = 'Test QR';
        testBtn.addEventListener('click', () => {
            // Create test QR data
            const testData = JSON.stringify({
                profile: {
                    firstName: 'Test',
                    lastName: 'User',
                    email: 'test@example.com',
                    phoneNumber: '+1234567890',
                    jobTitle: 'Developer',
                    companyName: 'Test Company'
                },
                senderUid: 'test-uid-123'
            });
            qrManager.processQRData(testData);
        });
        scannerActions.appendChild(testBtn);
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