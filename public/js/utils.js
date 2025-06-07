// Utility functions for the NFC Business Card application

// API base URL
const API_BASE = window.location.origin + '/api';

// Get stored auth token
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Set auth token
function setAuthToken(token) {
    localStorage.setItem('authToken', token);
}

// Remove auth token
function removeAuthToken() {
    localStorage.removeItem('authToken');
}

// Refresh user profile data
async function refreshUserProfile() {
    try {
        console.log('Refreshing user profile data...');
        const response = await apiRequest('/users/profile');
        
        if (response.success && response.user) {
            window.userProfile = response.user;
            console.log('User profile refreshed:', window.userProfile);
            return response.user;
        } else {
            console.log('No profile found during refresh');
            window.userProfile = null;
            return null;
        }
    } catch (error) {
        console.error('Failed to refresh user profile:', error);
        // Don't throw error as this might be called during initialization
        return null;
    }
}

// API request helper
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = getAuthToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, mergedOptions);
        
        if (!response.ok) {
            // Try to parse as JSON for error messages
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // If JSON parsing fails, use status text
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        // Check if response is binary (image, etc.)
        const contentType = response.headers.get('content-type');
        if (contentType && (contentType.includes('image/') || contentType.includes('application/octet-stream'))) {
            return await response.arrayBuffer();
        }
        
        // Default to JSON
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Show toast notification
function showToast(message, type = 'info', duration = 5000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    // Show toast
    toast.classList.add('show');
    
    // Hide toast after duration
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// Show loading spinner
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'flex';
    }
}

// Hide loading spinner
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

// Get current user location with enhanced features
async function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const locationData = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };
                
                // Try to get address using reverse geocoding
                try {
                    const address = await reverseGeocode(
                        position.coords.latitude, 
                        position.coords.longitude
                    );
                    locationData.address = address;
                } catch (error) {
                    console.warn('Reverse geocoding failed:', error);
                    // Continue without address
                }
                
                resolve(locationData);
            },
            (error) => {
                console.error('Geolocation error:', error);
                let errorMessage = 'Unable to get location';
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied by user';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out';
                        break;
                }
                
                reject(new Error(errorMessage));
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 300000 // 5 minutes
            }
        );
    });
}

// Reverse geocoding to get address from coordinates
async function reverseGeocode(latitude, longitude) {
    try {
        // Using OpenStreetMap Nominatim API (free, no API key required)
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'NFC-Business-Card-App'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.display_name) {
            // Extract meaningful address components
            const address = data.address || {};
            const addressParts = [];
            
            // Add building/house number and road
            if (address.house_number && address.road) {
                addressParts.push(`${address.house_number} ${address.road}`);
            } else if (address.road) {
                addressParts.push(address.road);
            }
            
            // Add city/town/village
            const city = address.city || address.town || address.village || address.municipality;
            if (city) {
                addressParts.push(city);
            }
            
            // Add state/province
            if (address.state) {
                addressParts.push(address.state);
            }
            
            // Add country
            if (address.country) {
                addressParts.push(address.country);
            }
            
            return addressParts.length > 0 ? addressParts.join(', ') : data.display_name;
        }
        
        throw new Error('No address found');
        
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        throw error;
    }
}

// Get location with user permission prompt
async function requestLocationPermission() {
    try {
        // Check if already granted
        if (navigator.permissions) {
            const permission = await navigator.permissions.query({name: 'geolocation'});
            if (permission.state === 'granted') {
                return await getCurrentLocation();
            }
        }
        
        // Request location - this will trigger permission prompt
        const location = await getCurrentLocation();
        showToast('Location access granted', 'success');
        return location;
        
    } catch (error) {
        console.error('Location permission error:', error);
        showToast('Location access required for enhanced features', 'warning');
        throw error;
    }
}

// Check if location services are available
function isLocationSupported() {
    return navigator.geolocation !== undefined;
}

// Get cached location if available and not too old
function getCachedLocation(maxAge = 300000) { // 5 minutes default
    const cached = localStorage.getItem('cachedLocation');
    if (cached) {
        try {
            const locationData = JSON.parse(cached);
            const age = Date.now() - locationData.timestamp;
            if (age < maxAge) {
                return locationData;
            }
        } catch (error) {
            console.error('Error parsing cached location:', error);
        }
    }
    return null;
}

// Cache location data
function cacheLocation(locationData) {
    try {
        const cacheData = {
            ...locationData,
            timestamp: Date.now()
        };
        localStorage.setItem('cachedLocation', JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error caching location:', error);
    }
}

// Enhanced location getter with caching and fallback
async function getLocationEnhanced(options = {}) {
    const {
        useCache = true,
        maxCacheAge = 300000, // 5 minutes
        fallbackToIP = false
    } = options;
    
    try {
        // Try cached location first
        if (useCache) {
            const cached = getCachedLocation(maxCacheAge);
            if (cached) {
                console.log('Using cached location');
                return cached;
            }
        }
        
        // Get fresh location
        const location = await getCurrentLocation();
        
        // Cache the location
        if (useCache) {
            cacheLocation(location);
        }
        
        return location;
        
    } catch (error) {
        console.error('Enhanced location error:', error);
        
        // Fallback to IP-based location if enabled
        if (fallbackToIP) {
            try {
                return await getLocationFromIP();
            } catch (ipError) {
                console.error('IP location fallback failed:', ipError);
            }
        }
        
        throw error;
    }
}

// Get approximate location from IP address
async function getLocationFromIP() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        if (data.latitude && data.longitude) {
            return {
                latitude: data.latitude,
                longitude: data.longitude,
                accuracy: 10000, // IP location is less accurate
                address: `${data.city}, ${data.region}, ${data.country_name}`,
                source: 'ip',
                timestamp: Date.now()
            };
        }
        
        throw new Error('No location data from IP service');
        
    } catch (error) {
        console.error('IP location error:', error);
        throw error;
    }
}

// Get device information
function getDeviceInfo() {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`
    };
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format time ago
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
        return formatDate(dateString);
    }
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate URL format
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Validate phone number (basic validation)
function isValidPhoneNumber(phone) {
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
}

// Sanitize HTML to prevent XSS
function sanitizeHtml(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// Copy text to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
        return true;
    } catch (error) {
        console.error('Copy failed:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('Copied to clipboard!', 'success');
            return true;
        } catch (fallbackError) {
            console.error('Fallback copy failed:', fallbackError);
            showToast('Failed to copy to clipboard', 'error');
            return false;
        } finally {
            document.body.removeChild(textArea);
        }
    }
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Download file helper
function downloadFile(data, filename, type = 'application/octet-stream') {
    const blob = new Blob([data], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Generate random ID
function generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Check if device supports NFC
function isNFCSupported() {
    return 'NDEFReader' in window;
}

// Check if device supports camera
function isCameraSupported() {
    return navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
}

// Get user initials for avatar
function getUserInitials(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Create profile data object for sharing
function createProfileData(profile, senderUid) {
    return {
        type: 'nfc-business-card',
        version: '1.0',
        senderUid: senderUid,
        profile: {
            fullName: profile.fullName,
            email: profile.email,
            phoneNumber: profile.phoneNumber || '',
            companyName: profile.companyName || '',
            jobTitle: profile.jobTitle || '',
            linkedIn: profile.linkedIn || '',
            website: profile.website || '',
            bio: profile.bio || ''
        },
        timestamp: new Date().toISOString()
    };
}

// Parse profile data from shared content
function parseProfileData(data) {
    try {
        let parsed;
        if (typeof data === 'string') {
            parsed = JSON.parse(data);
        } else {
            parsed = data;
        }
        
        // Validate the data structure
        if (parsed.type !== 'nfc-business-card' || !parsed.profile) {
            throw new Error('Invalid profile data format');
        }
        
        return parsed;
    } catch (error) {
        console.error('Failed to parse profile data:', error);
        throw new Error('Invalid profile data');
    }
}

// Storage helpers
const storage = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Storage set error:', error);
        }
    },
    
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Storage get error:', error);
            return defaultValue;
        }
    },
    
    remove: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Storage remove error:', error);
        }
    },
    
    clear: () => {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Storage clear error:', error);
        }
    }
};

// Export functions for use in other modules
window.utils = {
    getAuthToken,
    setAuthToken,
    removeAuthToken,
    refreshUserProfile,
    apiRequest,
    showToast,
    showLoading,
    hideLoading,
    getCurrentLocation,
    reverseGeocode,
    requestLocationPermission,
    isLocationSupported,
    getCachedLocation,
    cacheLocation,
    getLocationEnhanced,
    getLocationFromIP,
    getDeviceInfo,
    formatDate,
    formatTimeAgo,
    isValidEmail,
    isValidUrl,
    isValidPhoneNumber,
    sanitizeHtml,
    copyToClipboard,
    debounce,
    throttle,
    downloadFile,
    generateId,
    isNFCSupported,
    isCameraSupported,
    getUserInitials,
    formatFileSize,
    createProfileData,
    parseProfileData,
    storage
}; 