// Connections module for the NFC Business Card application

class ConnectionsManager {
    constructor() {
        this.connections = {
            received: [],
            sent: []
        };
        this.isLoading = false;
        this.currentTab = 'received';
        this.initialize();
    }

    // Initialize connections manager
    initialize() {
        this.setupEventListeners();
        console.log('Connections Manager initialized');
    }

    // Setup DOM event listeners
    setupEventListeners() {
        // Tab switching
        const tabButtons = document.querySelectorAll('.connections-tabs .tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        // Setup intersection observer for lazy loading
        this.setupIntersectionObserver();
    }

    // Switch between received and sent tabs
    switchTab(tab) {
        if (this.currentTab === tab) return;

        this.currentTab = tab;

        // Update tab buttons
        document.querySelectorAll('.connections-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-tab') === tab) {
                btn.classList.add('active');
            }
        });

        // Update content
        document.querySelectorAll('.connections-list').forEach(list => {
            list.classList.remove('active');
        });

        const targetList = document.getElementById(`${tab}Connections`);
        if (targetList) {
            targetList.classList.add('active');
        }

        // Load connections for the active tab
        this.loadConnections();
    }

    // Load connections from server
    async loadConnections() {
        try {
            this.isLoading = true;
            this.showLoadingState();

            const endpoint = this.currentTab === 'received' ? '/connections/received' : '/connections/sent';
            const response = await utils.apiRequest(endpoint);

            if (response.success) {
                this.connections[this.currentTab] = response.connections;
                this.renderConnections();
            }

        } catch (error) {
            console.error('Load connections error:', error);
            this.showErrorState('Failed to load connections');
        } finally {
            this.isLoading = false;
        }
    }

    // Render connections list
    renderConnections() {
        const container = document.getElementById(`${this.currentTab}ConnectionsGrid`);
        if (!container) return;

        const connections = this.connections[this.currentTab];

        if (connections.length === 0) {
            this.showEmptyState(container);
            return;
        }

        // Clear loading state
        container.innerHTML = '';

        // Render connection cards
        connections.forEach(connection => {
            const card = this.createConnectionCard(connection);
            container.appendChild(card);
        });

        // Add animations
        this.animateCards(container);
    }

    // Create connection card element
    createConnectionCard(connection) {
        const card = document.createElement('div');
        card.className = 'connection-card slide-up';
        
        const profile = connection.sharedProfile;
        const date = utils.formatTimeAgo(connection.createdAt);
        const method = connection.shareMethod.toLowerCase();

        card.innerHTML = `
            <div class="connection-header">
                <div class="connection-info">
                    <h3>${utils.sanitizeHtml(profile.fullName)}</h3>
                    <p>${profile.companyName ? utils.sanitizeHtml(profile.companyName) : profile.email}</p>
                </div>
                <span class="connection-method ${method}">${connection.shareMethod}</span>
            </div>
            
            <div class="connection-details">
                ${profile.jobTitle ? `
                    <div class="connection-detail">
                        💼 ${utils.sanitizeHtml(profile.jobTitle)}
                    </div>
                ` : ''}
                
                <div class="connection-detail">
                    📧 ${utils.sanitizeHtml(profile.email)}
                </div>
                
                ${profile.phoneNumber ? `
                    <div class="connection-detail">
                        📞 ${utils.sanitizeHtml(profile.phoneNumber)}
                    </div>
                ` : ''}
                
                ${connection.location?.latitude ? `
                    <div class="connection-detail">
                        📍 ${this.formatLocation(connection.location)}
                    </div>
                ` : ''}
            </div>
            
            <div class="connection-meta">
                <div>Connected ${date}</div>
                <div class="connection-actions">
                    <button class="btn-secondary btn-small" onclick="connectionsManager.viewConnection('${connection._id}')">
                        View Details
                    </button>
                    ${this.currentTab === 'received' ? `
                        <button class="btn-secondary btn-small" onclick="connectionsManager.exportContact('${connection._id}')">
                            Export
                        </button>
                        <button class="btn-secondary btn-small text-red" onclick="connectionsManager.deleteConnection('${connection._id}')">
                            Delete
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        return card;
    }

    // Format location for display
    formatLocation(location) {
        if (location.address) {
            return location.address;
        } else if (location.latitude && location.longitude) {
            return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
        }
        return 'Unknown location';
    }

    // Show empty state
    showEmptyState(container) {
        const emptyMessage = this.currentTab === 'received' 
            ? 'No connections received yet' 
            : 'No profiles shared yet';
            
        const actionMessage = this.currentTab === 'received'
            ? 'Start by scanning QR codes or using NFC to receive business cards'
            : 'Share your profile to see sent connections here';

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">${this.currentTab === 'received' ? '📥' : '📤'}</div>
                <h3>${emptyMessage}</h3>
                <p>${actionMessage}</p>
                ${this.currentTab === 'received' ? `
                    <button class="btn-primary" onclick="window.app?.navigateTo('share')">
                        Start Sharing
                    </button>
                ` : ''}
            </div>
        `;
    }

    // Show loading state
    showLoadingState() {
        const container = document.getElementById(`${this.currentTab}ConnectionsGrid`);
        if (!container) return;

        container.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading connections...</p>
            </div>
        `;
    }

    // Show error state
    showErrorState(message) {
        const container = document.getElementById(`${this.currentTab}ConnectionsGrid`);
        if (!container) return;

        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">❌</div>
                <h3>Failed to load connections</h3>
                <p>${message}</p>
                <button class="btn-primary" onclick="connectionsManager.loadConnections()">
                    Try Again
                </button>
            </div>
        `;
    }

    // Animate cards on render
    animateCards(container) {
        const cards = container.querySelectorAll('.connection-card');
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
        });
    }

    // View connection details
    async viewConnection(connectionId) {
        try {
            utils.showLoading();

            const response = await utils.apiRequest(`/connections/${connectionId}`);
            
            if (response.success) {
                this.showConnectionModal(response.connection);
            }

        } catch (error) {
            console.error('View connection error:', error);
            utils.showToast('Failed to load connection details', 'error');
        } finally {
            utils.hideLoading();
        }
    }

    // Show connection details modal
    showConnectionModal(connection) {
        const modal = document.getElementById('profileModal');
        const preview = document.getElementById('profilePreview');

        if (!modal || !preview) return;

        const profile = connection.sharedProfile;
        const html = `
            <div class="connection-details-modal">
                <div class="profile-avatar">${utils.getUserInitials(profile.fullName)}</div>
                <div class="profile-name">${utils.sanitizeHtml(profile.fullName)}</div>
                ${profile.jobTitle ? `<div class="profile-title">${utils.sanitizeHtml(profile.jobTitle)}</div>` : ''}
                ${profile.companyName ? `<div class="profile-title">${utils.sanitizeHtml(profile.companyName)}</div>` : ''}
                
                <div class="profile-contacts">
                    <div class="profile-contact">📧 ${utils.sanitizeHtml(profile.email)}</div>
                    ${profile.phoneNumber ? `<div class="profile-contact">📞 ${utils.sanitizeHtml(profile.phoneNumber)}</div>` : ''}
                </div>
                
                ${profile.bio ? `<div class="profile-bio">${utils.sanitizeHtml(profile.bio)}</div>` : ''}
                
                <div class="profile-links">
                    ${profile.linkedIn ? `<a href="${profile.linkedIn}" target="_blank" class="profile-link">LinkedIn</a>` : ''}
                    ${profile.website ? `<a href="${profile.website}" target="_blank" class="profile-link">Website</a>` : ''}
                </div>
                
                <div class="connection-metadata">
                    <h4>Connection Details</h4>
                    <div class="meta-item">
                        <strong>Method:</strong> ${connection.shareMethod}
                    </div>
                    <div class="meta-item">
                        <strong>Date:</strong> ${utils.formatDate(connection.createdAt)}
                    </div>
                    ${connection.location?.latitude ? `
                        <div class="meta-item">
                            <strong>Location:</strong> ${this.formatLocation(connection.location)}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        preview.innerHTML = html;
        modal.classList.add('active');
    }

    // Export contact to vCard format
    async exportContact(connectionId) {
        try {
            const connection = this.connections[this.currentTab].find(c => c._id === connectionId);
            if (!connection) {
                utils.showToast('Connection not found', 'error');
                return;
            }

            const vCard = this.generateVCard(connection.sharedProfile);
            
            // Download vCard
            const blob = new Blob([vCard], { type: 'text/vcard' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${connection.sharedProfile.fullName.replace(/\s+/g, '_')}.vcf`;
            link.click();
            
            URL.revokeObjectURL(url);
            utils.showToast('Contact exported successfully', 'success');

        } catch (error) {
            console.error('Export contact error:', error);
            utils.showToast('Failed to export contact', 'error');
        }
    }

    // Generate vCard format
    generateVCard(profile) {
        const vCard = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            `FN:${profile.fullName}`,
            `EMAIL:${profile.email}`,
            profile.phoneNumber ? `TEL:${profile.phoneNumber}` : '',
            profile.jobTitle ? `TITLE:${profile.jobTitle}` : '',
            profile.companyName ? `ORG:${profile.companyName}` : '',
            profile.website ? `URL:${profile.website}` : '',
            profile.linkedIn ? `URL:${profile.linkedIn}` : '',
            profile.bio ? `NOTE:${profile.bio}` : '',
            'END:VCARD'
        ].filter(line => line !== '').join('\r\n');

        return vCard;
    }

    // Delete connection
    async deleteConnection(connectionId) {
        if (!confirm('Are you sure you want to delete this connection?')) {
            return;
        }

        try {
            utils.showLoading();

            const response = await utils.apiRequest(`/connections/${connectionId}`, {
                method: 'DELETE'
            });

            if (response.success) {
                // Remove from local array
                this.connections[this.currentTab] = this.connections[this.currentTab]
                    .filter(c => c._id !== connectionId);
                
                // Re-render
                this.renderConnections();
                
                utils.showToast('Connection deleted successfully', 'success');
                
                // Update stats
                if (window.app?.updateStats) {
                    await window.app.updateStats();
                }
            }

        } catch (error) {
            console.error('Delete connection error:', error);
            utils.showToast('Failed to delete connection', 'error');
        } finally {
            utils.hideLoading();
        }
    }

    // Setup intersection observer for lazy loading
    setupIntersectionObserver() {
        if (!('IntersectionObserver' in window)) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        });

        // Observe new cards when they're added
        this.cardObserver = observer;
    }

    // Search connections
    searchConnections(query) {
        if (!query.trim()) {
            this.renderConnections();
            return;
        }

        const filteredConnections = this.connections[this.currentTab].filter(connection => {
            const profile = connection.sharedProfile;
            const searchText = `${profile.fullName} ${profile.email} ${profile.companyName} ${profile.jobTitle}`.toLowerCase();
            return searchText.includes(query.toLowerCase());
        });

        this.renderFilteredConnections(filteredConnections);
    }

    // Render filtered connections
    renderFilteredConnections(connections) {
        const container = document.getElementById(`${this.currentTab}ConnectionsGrid`);
        if (!container) return;

        if (connections.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>No connections found</h3>
                    <p>Try a different search term</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        connections.forEach(connection => {
            const card = this.createConnectionCard(connection);
            container.appendChild(card);
        });
    }

    // Get connections statistics
    getStats() {
        return {
            received: this.connections.received.length,
            sent: this.connections.sent.length,
            total: this.connections.received.length + this.connections.sent.length
        };
    }

    // Refresh connections
    async refresh() {
        await this.loadConnections();
        utils.showToast('Connections refreshed', 'success');
    }

    // Export all connections
    async exportAllConnections() {
        try {
            const connections = this.connections[this.currentTab];
            if (connections.length === 0) {
                utils.showToast('No connections to export', 'warning');
                return;
            }

            const csvData = this.generateCSV(connections);
            
            const blob = new Blob([csvData], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `connections-${this.currentTab}-${Date.now()}.csv`;
            link.click();
            
            URL.revokeObjectURL(url);
            utils.showToast('Connections exported successfully', 'success');

        } catch (error) {
            console.error('Export all connections error:', error);
            utils.showToast('Failed to export connections', 'error');
        }
    }

    // Generate CSV data
    generateCSV(connections) {
        const headers = [
            'Name', 'Email', 'Phone', 'Company', 'Job Title', 
            'LinkedIn', 'Website', 'Bio', 'Date', 'Method', 'Location'
        ];

        const rows = connections.map(connection => {
            const profile = connection.sharedProfile;
            return [
                profile.fullName || '',
                profile.email || '',
                profile.phoneNumber || '',
                profile.companyName || '',
                profile.jobTitle || '',
                profile.linkedIn || '',
                profile.website || '',
                profile.bio || '',
                utils.formatDate(connection.createdAt),
                connection.shareMethod,
                this.formatLocation(connection.location || {})
            ].map(field => `"${String(field).replace(/"/g, '""')}"`);
        });

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
}

// Initialize connections manager
const connectionsManager = new ConnectionsManager();

// Load connections when page becomes active
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the connections page
    const connectionsPage = document.getElementById('connectionsPage');
    if (connectionsPage?.classList.contains('active')) {
        connectionsManager.loadConnections();
    }
});

// Add CSS for additional styles
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        .btn-small {
            padding: 0.375rem 0.75rem;
            font-size: 0.75rem;
        }
        
        .text-red {
            color: #dc2626;
        }
        
        .empty-state, .loading-state, .error-state {
            text-align: center;
            padding: 3rem 1rem;
            color: #6b7280;
        }
        
        .empty-icon, .error-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        
        .loading-state .spinner {
            margin: 0 auto 1rem;
        }
        
        .connection-actions {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            margin-top: 0.5rem;
        }
        
        .connection-metadata {
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid #e5e7eb;
        }
        
        .connection-metadata h4 {
            margin-bottom: 0.5rem;
            color: #374151;
        }
        
        .meta-item {
            margin-bottom: 0.25rem;
            font-size: 0.875rem;
            color: #6b7280;
        }
    `;
    document.head.appendChild(style);
});

// Export connections manager for use in other modules
window.connectionsManager = connectionsManager; 