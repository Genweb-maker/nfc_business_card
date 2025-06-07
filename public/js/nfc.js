// NFC module for the NFC Business Card application

class NFCManager {
    constructor() {
        this.isSupported = false;
        this.isReading = false;
        this.isWriting = false;
        this.reader = null;
        this.abortController = null;
        this.initialize();
    }

    // Initialize NFC manager
    initialize() {
        this.isSupported = utils.isNFCSupported();
        console.log('NFC supported:', this.isSupported);
        
        if (this.isSupported) {
            this.reader = new NDEFReader();
            this.updateNFCStatus('NFC is available', 'available');
        } else {
            this.updateNFCStatus('NFC not supported on this device', 'unavailable');
        }
        
        this.setupEventListeners();
    }

    // Setup DOM event listeners
    setupEventListeners() {
        const nfcShareBtn = document.getElementById('nfcShareBtn');
        const nfcReadBtn = document.getElementById('nfcReadBtn');

        if (nfcShareBtn) {
            nfcShareBtn.addEventListener('click', () => this.startSharing());
            nfcShareBtn.disabled = !this.isSupported;
        }

        if (nfcReadBtn) {
            nfcReadBtn.addEventListener('click', () => this.startReading());
            nfcReadBtn.disabled = !this.isSupported;
        }
    }

    // Update NFC status display
    updateNFCStatus(message, status) {
        const statusElement = document.getElementById('nfcStatus');
        const statusIcon = statusElement?.querySelector('.status-icon');
        const statusText = statusElement?.querySelector('span');

        if (statusElement) {
            statusElement.className = `nfc-status ${status}`;
        }

        if (statusIcon) {
            statusIcon.textContent = status === 'available' ? '✅' : 
                                   status === 'reading' ? '🔍' : 
                                   status === 'writing' ? '✍️' : '❌';
        }

        if (statusText) {
            statusText.textContent = message;
        }
    }

    // Start NFC sharing (writing)
    async startSharing() {
        try {
            if (!this.isSupported) {
                throw new Error('NFC is not supported on this device');
            }

            if (!window.userProfile?.profile) {
                utils.showToast('Please create your profile first', 'warning');
                if (window.app?.navigateTo) {
                    window.app.navigateTo('profile');
                }
                return;
            }

            // Request permission first
            await this.requestPermission();

            this.isWriting = true;
            this.updateNFCStatus('Tap a device or NFC tag to share', 'writing');
            this.updateShareButton('sharing');

            // Create profile data for sharing
            const profileData = utils.createProfileData(
                window.userProfile.profile,
                authManager.getUserId()
            );

            // Create NDEF message
            const record = {
                recordType: "text",
                data: JSON.stringify(profileData)
            };

            // Create abort controller for cancellation
            this.abortController = new AbortController();

            // Write to NFC tag/device
            await this.reader.write({ records: [record] }, {
                signal: this.abortController.signal
            });

            utils.showToast('Profile shared successfully!', 'success');
            this.updateNFCStatus('Profile shared via NFC', 'available');

            // Log the sharing event
            await this.logSharingEvent('NFC');

        } catch (error) {
            console.error('NFC sharing error:', error);
            
            if (error.name === 'AbortError') {
                utils.showToast('NFC sharing cancelled', 'info');
            } else if (error.name === 'NotAllowedError') {
                utils.showToast('NFC permission denied', 'error');
            } else if (error.name === 'NotSupportedError') {
                utils.showToast('NFC not supported', 'error');
            } else {
                utils.showToast(error.message || 'Failed to share via NFC', 'error');
            }
            
            this.updateNFCStatus('NFC sharing failed', 'unavailable');
        } finally {
            this.isWriting = false;
            this.updateShareButton('idle');
            this.abortController = null;
        }
    }

    // Start NFC reading
    async startReading() {
        try {
            if (!this.isSupported) {
                throw new Error('NFC is not supported on this device');
            }

            // Request permission first
            await this.requestPermission();

            this.isReading = true;
            this.updateNFCStatus('Tap an NFC tag or device to read', 'reading');
            this.updateReadButton('reading');

            // Create abort controller for cancellation
            this.abortController = new AbortController();

            // Setup read event listener
            this.reader.addEventListener('reading', this.handleNFCRead.bind(this), {
                signal: this.abortController.signal
            });

            // Start scanning
            await this.reader.scan({
                signal: this.abortController.signal
            });

        } catch (error) {
            console.error('NFC reading error:', error);
            
            if (error.name === 'AbortError') {
                utils.showToast('NFC reading cancelled', 'info');
            } else if (error.name === 'NotAllowedError') {
                utils.showToast('NFC permission denied', 'error');
            } else if (error.name === 'NotSupportedError') {
                utils.showToast('NFC not supported', 'error');
            } else {
                utils.showToast(error.message || 'Failed to start NFC reading', 'error');
            }
            
            this.stopReading();
        }
    }

    // Handle NFC read event
    async handleNFCRead(event) {
        try {
            console.log('NFC tag detected:', event);

            const record = event.message.records[0];
            if (!record) {
                throw new Error('No data found on NFC tag');
            }

            // Decode the data
            let data;
            if (record.recordType === 'text') {
                const textDecoder = new TextDecoder(record.encoding);
                data = textDecoder.decode(record.data);
            } else {
                // Try to decode as text anyway
                const textDecoder = new TextDecoder();
                data = textDecoder.decode(record.data);
            }

            // Parse profile data
            const profileData = utils.parseProfileData(data);
            
            // Process the received profile
            await this.processReceivedProfile(profileData, 'NFC');
            
            utils.showToast('Profile received via NFC!', 'success');
            this.stopReading();

        } catch (error) {
            console.error('NFC data processing error:', error);
            utils.showToast('Failed to process NFC data', 'error');
        }
    }

    // Stop NFC reading
    stopReading() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        
        this.isReading = false;
        this.updateNFCStatus('NFC is available', 'available');
        this.updateReadButton('idle');
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
                
                // Show profile preview
                this.showReceivedProfilePreview(profileData.profile);
                
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

    // Show received profile preview
    showReceivedProfilePreview(profile) {
        const modal = document.getElementById('profileModal');
        const preview = document.getElementById('profilePreview');

        if (!modal || !preview) return;

        // Generate profile preview HTML
        const html = this.generateProfilePreviewHTML(profile);
        preview.innerHTML = html;

        // Show modal
        modal.classList.add('active');
        
        // Auto-close after 10 seconds
        setTimeout(() => {
            modal.classList.remove('active');
        }, 10000);
    }

    // Generate profile preview HTML
    generateProfilePreviewHTML(profile) {
        const initials = utils.getUserInitials(profile.fullName);
        
        return `
            <div class="profile-avatar">${initials}</div>
            <div class="profile-name">${utils.sanitizeHtml(profile.fullName)}</div>
            ${profile.jobTitle ? `<div class="profile-title">${utils.sanitizeHtml(profile.jobTitle)}</div>` : ''}
            ${profile.companyName ? `<div class="profile-title">${utils.sanitizeHtml(profile.companyName)}</div>` : ''}
            
            <div class="profile-contacts">
                ${profile.email ? `<div class="profile-contact">📧 ${utils.sanitizeHtml(profile.email)}</div>` : ''}
                ${profile.phoneNumber ? `<div class="profile-contact">📞 ${utils.sanitizeHtml(profile.phoneNumber)}</div>` : ''}
            </div>
            
            ${profile.bio ? `<div class="profile-bio">${utils.sanitizeHtml(profile.bio)}</div>` : ''}
            
            <div class="profile-links">
                ${profile.linkedIn ? `<a href="${profile.linkedIn}" target="_blank" class="profile-link">LinkedIn</a>` : ''}
                ${profile.website ? `<a href="${profile.website}" target="_blank" class="profile-link">Website</a>` : ''}
            </div>
        `;
    }

    // Request NFC permission
    async requestPermission() {
        try {
            // The permission is requested automatically when we try to use NFC
            // This is just a placeholder for any future permission handling
            return true;
        } catch (error) {
            console.error('NFC permission error:', error);
            throw error;
        }
    }

    // Log sharing event
    async logSharingEvent(method) {
        try {
            // This could be expanded to log sharing events to analytics
            console.log(`Profile shared via ${method}`);
        } catch (error) {
            console.error('Failed to log sharing event:', error);
        }
    }

    // Update share button state
    updateShareButton(state) {
        const button = document.getElementById('nfcShareBtn');
        if (!button) return;

        switch (state) {
            case 'sharing':
                button.textContent = 'Tap Device to Share...';
                button.disabled = false;
                button.onclick = () => this.stopSharing();
                break;
            case 'idle':
            default:
                button.textContent = 'Start NFC Share';
                button.disabled = !this.isSupported;
                button.onclick = () => this.startSharing();
                break;
        }
    }

    // Update read button state
    updateReadButton(state) {
        const button = document.getElementById('nfcReadBtn');
        if (!button) return;

        switch (state) {
            case 'reading':
                button.textContent = 'Stop Reading';
                button.disabled = false;
                button.onclick = () => this.stopReading();
                break;
            case 'idle':
            default:
                button.textContent = 'Read NFC Tag';
                button.disabled = !this.isSupported;
                button.onclick = () => this.startReading();
                break;
        }
    }

    // Stop sharing
    stopSharing() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        
        this.isWriting = false;
        this.updateNFCStatus('NFC is available', 'available');
        this.updateShareButton('idle');
    }

    // Check if NFC is currently active
    isActive() {
        return this.isReading || this.isWriting;
    }

    // Get NFC status
    getStatus() {
        if (!this.isSupported) return 'unsupported';
        if (this.isReading) return 'reading';
        if (this.isWriting) return 'writing';
        return 'available';
    }
}

// Initialize NFC manager
const nfcManager = new NFCManager();

// Handle page visibility changes to stop NFC operations when page is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden && nfcManager.isActive()) {
        nfcManager.stopReading();
        nfcManager.stopSharing();
    }
});

// Handle beforeunload to clean up NFC operations
window.addEventListener('beforeunload', () => {
    if (nfcManager.isActive()) {
        nfcManager.stopReading();
        nfcManager.stopSharing();
    }
});

// Export NFC manager for use in other modules
window.nfcManager = nfcManager; 