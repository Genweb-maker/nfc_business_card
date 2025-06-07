// Main application module for the NFC Business Card application

class App {
    constructor() {
        this.currentPage = 'auth';
        this.isInitialized = false;
        this.stats = {
            sent: 0,
            received: 0,
            nfc: 0,
            qr: 0
        };
        this.initialize();
    }

    // Initialize the application
    async initialize() {
        try {
            console.log('Initializing NFC Business Card App...');
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initialize());
                return;
            }

            // Setup navigation
            this.setupNavigation();
            
            // Setup error handlers
            this.setupErrorHandlers();
            
            // Wait for all modules to be ready
            await this.waitForModules();
            
            // Initial auth check
            this.handleInitialAuth();
            
            // Load initial data if authenticated
            if (authManager.isAuthenticated()) {
                await this.loadInitialData();
            }

            this.isInitialized = true;
            utils.hideLoading();
            
            console.log('App initialized successfully');

        } catch (error) {
            console.error('App initialization error:', error);
            utils.showToast('Failed to initialize application', 'error');
            utils.hideLoading();
        }
    }

    // Wait for all required modules to be available
    async waitForModules() {
        const modules = [
            'authManager',
            'profileManager',
            'nfcManager',
            'qrManager',
            'connectionsManager'
        ];

        const maxWait = 5000; // 5 seconds
        const startTime = Date.now();

        while (Date.now() - startTime < maxWait) {
            const allReady = modules.every(module => window[module]);
            if (allReady) {
                console.log('All modules ready');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.warn('Some modules may not be ready');
    }

    // Setup navigation handlers
    setupNavigation() {
        // Navigation link handlers
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.navigateTo(page);
            });
        });

        // Action card handlers
        document.querySelectorAll('.action-card').forEach(card => {
            card.addEventListener('click', () => {
                const page = card.getAttribute('data-page');
                this.navigateTo(page);
            });
        });

        // Mobile navigation toggle
        const navToggle = document.getElementById('navToggle');
        if (navToggle) {
            navToggle.addEventListener('click', () => {
                this.toggleMobileNav();
            });
        }

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            const page = e.state?.page || 'dashboard';
            this.navigateTo(page, false);
        });
    }

    // Navigate to a specific page
    navigateTo(page, pushState = true) {
        if (!authManager.isAuthenticated() && page !== 'auth') {
            console.log('User not authenticated, redirecting to auth');
            return;
        }

        console.log(`Navigating to: ${page}`);

        // Update URL
        if (pushState) {
            const url = page === 'dashboard' ? '/' : `/${page}`;
            history.pushState({ page }, '', url);
        }

        // Update active page
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        const targetPage = document.getElementById(`${page}Page`);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = page;
        }

        // Update active navigation link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === page) {
                link.classList.add('active');
            }
        });

        // Handle page-specific logic
        this.handlePageLoad(page);
    }

    // Handle page-specific loading logic
    async handlePageLoad(page) {
        try {
            switch (page) {
                case 'dashboard':
                    await this.updateStats();
                    break;
                    
                case 'profile':
                    if (profileManager) {
                        await profileManager.loadProfile();
                    }
                    break;
                    
                case 'connections':
                    if (connectionsManager) {
                        await connectionsManager.loadConnections();
                    }
                    break;
                    
                case 'share':
                    // Initialize sharing components
                    await this.initializeSharePage();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${page} page:`, error);
        }
    }

    // Initialize share page components
    async initializeSharePage() {
        // Check if user has a profile
        if (!window.userProfile?.profile) {
            console.log('No profile found for share page, attempting to reload profile data...');
            
            // Try to reload profile data before showing error
            await utils.refreshUserProfile();
            
            // Check again after reload
            if (!window.userProfile?.profile) {
                utils.showToast('Please create your profile first', 'warning');
                setTimeout(() => this.navigateTo('profile'), 2000);
                return;
            }
        }

        // Update NFC status
        if (nfcManager) {
            const status = nfcManager.getStatus();
            console.log('NFC Status:', status);
        }

        // Check camera support for QR
        if (qrManager) {
            const qrStatus = qrManager.getStatus();
            console.log('QR Status:', qrStatus);
        }
    }

    // Load initial application data
    async loadInitialData() {
        try {
            // Load user profile
            if (profileManager) {
                await profileManager.loadProfile();
            }

            // Load dashboard stats
            await this.updateStats();

        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    // Update dashboard statistics
    async updateStats() {
        try {
            const response = await utils.apiRequest('/connections/stats');
            
            if (response.success) {
                this.stats = response.stats;
                this.updateStatsUI();
            }

        } catch (error) {
            console.error('Failed to update stats:', error);
            // Don't show error toast for stats failure
        }
    }

    // Update statistics in the UI
    updateStatsUI() {
        const elements = {
            sentCount: document.getElementById('sentCount'),
            receivedCount: document.getElementById('receivedCount'),
            nfcCount: document.getElementById('nfcCount'),
            qrCount: document.getElementById('qrCount')
        };

        Object.entries(elements).forEach(([key, element]) => {
            if (element) {
                const statKey = key.replace('Count', '');
                element.textContent = this.stats[statKey] || 0;
                
                // Add animation
                element.classList.add('fade-in');
            }
        });
    }

    // Handle initial authentication state
    handleInitialAuth() {
        // This will be handled by authManager's auth state listener
        // but we can add any additional logic here
        console.log('Handling initial auth state');
    }

    // Toggle mobile navigation
    toggleMobileNav() {
        const navbar = document.getElementById('navbar');
        const navToggle = document.getElementById('navToggle');
        
        if (navbar && navToggle) {
            navbar.classList.toggle('mobile-open');
            navToggle.classList.toggle('active');
        }
    }

    // Setup global error handlers
    setupErrorHandlers() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            utils.showToast('An unexpected error occurred', 'error');
        });

        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            console.error('JavaScript error:', event.error);
            
            // Don't show toast for every JS error, just log them
            if (event.error?.message?.includes('Firebase')) {
                utils.showToast('Authentication error occurred', 'error');
            }
        });

        // Handle network errors
        window.addEventListener('online', () => {
            utils.showToast('Connection restored', 'success');
        });

        window.addEventListener('offline', () => {
            utils.showToast('Connection lost', 'warning');
        });
    }

    // Check application health
    async checkHealth() {
        try {
            const response = await utils.apiRequest('/health');
            return response.status === 'OK';
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }

    // Refresh application data
    async refresh() {
        try {
            utils.showLoading();
            
            await this.loadInitialData();
            
            // Refresh current page data
            if (this.currentPage === 'connections' && connectionsManager) {
                await connectionsManager.refresh();
            }
            
            utils.showToast('Application refreshed', 'success');
            
        } catch (error) {
            console.error('Refresh failed:', error);
            utils.showToast('Failed to refresh data', 'error');
        } finally {
            utils.hideLoading();
        }
    }

    // Get application status
    getStatus() {
        return {
            initialized: this.isInitialized,
            currentPage: this.currentPage,
            authenticated: authManager?.isAuthenticated() || false,
            hasProfile: !!window.userProfile?.profile,
            nfcSupported: utils.isNFCSupported(),
            cameraSupported: utils.isCameraSupported(),
            stats: this.stats
        };
    }

    // Show app info modal
    showAppInfo() {
        const modal = document.getElementById('profileModal');
        const preview = document.getElementById('profilePreview');

        if (!modal || !preview) return;

        const status = this.getStatus();
        
        const html = `
            <div class="app-info">
                <h2>📱 NFC Business Card</h2>
                <p>Share your professional information seamlessly</p>
                
                <div class="app-features">
                    <h3>Features</h3>
                    <ul>
                        <li>✅ NFC Profile Sharing</li>
                        <li>✅ QR Code Generation</li>
                        <li>✅ Contact Management</li>
                        <li>✅ Geolocation Tracking</li>
                        <li>✅ Export to vCard</li>
                    </ul>
                </div>
                
                <div class="device-support">
                    <h3>Device Support</h3>
                    <ul>
                        <li>NFC: ${status.nfcSupported ? '✅ Supported' : '❌ Not Supported'}</li>
                        <li>Camera: ${status.cameraSupported ? '✅ Supported' : '❌ Not Supported'}</li>
                    </ul>
                </div>
                
                <div class="app-stats">
                    <h3>Your Stats</h3>
                    <ul>
                        <li>Profiles Shared: ${status.stats.sent}</li>
                        <li>Profiles Received: ${status.stats.received}</li>
                        <li>NFC Connections: ${status.stats.nfc}</li>
                        <li>QR Connections: ${status.stats.qr}</li>
                    </ul>
                </div>
            </div>
        `;

        preview.innerHTML = html;
        modal.classList.add('active');
    }

    // Export application data
    async exportAppData() {
        try {
            const appData = {
                profile: window.userProfile?.profile || null,
                stats: this.stats,
                exportDate: new Date().toISOString(),
                version: '1.0.0'
            };

            const dataStr = JSON.stringify(appData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `nfc-business-card-data-${Date.now()}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            utils.showToast('App data exported successfully', 'success');

        } catch (error) {
            console.error('Export app data error:', error);
            utils.showToast('Failed to export app data', 'error');
        }
    }

    // Handle PWA installation
    setupPWA() {
        let deferredPrompt;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install button or banner
            const installBtn = document.getElementById('installApp');
            if (installBtn) {
                installBtn.style.display = 'block';
                installBtn.addEventListener('click', async () => {
                    if (deferredPrompt) {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        console.log(`User ${outcome} the install prompt`);
                        deferredPrompt = null;
                        installBtn.style.display = 'none';
                    }
                });
            }
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            utils.showToast('App installed successfully!', 'success');
        });
    }
}

// Initialize the application
const app = new App();

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + R to refresh
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        app.refresh();
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// Add additional app-specific styles
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        .mobile-open .nav-menu {
            display: flex;
            flex-direction: column;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            padding: 1rem;
            z-index: 1000;
        }
        
        .nav-toggle.active span:nth-child(1) {
            transform: rotate(45deg) translate(5px, 5px);
        }
        
        .nav-toggle.active span:nth-child(2) {
            opacity: 0;
        }
        
        .nav-toggle.active span:nth-child(3) {
            transform: rotate(-45deg) translate(7px, -6px);
        }
        
        .app-info h2 {
            text-align: center;
            margin-bottom: 1rem;
            color: #374151;
        }
        
        .app-info h3 {
            color: #374151;
            margin: 1rem 0 0.5rem 0;
        }
        
        .app-info ul {
            list-style: none;
            padding: 0;
        }
        
        .app-info li {
            margin: 0.25rem 0;
            color: #6b7280;
        }
        
        .fade-in {
            animation: fadeIn 0.5s ease-in;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
});

// Export app instance for global access
window.app = app; 