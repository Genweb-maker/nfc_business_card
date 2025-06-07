// Profile management module for the NFC Business Card application

class ProfileManager {
    constructor() {
        this.isLoading = false;
        this.isDirty = false;
        this.currentProfile = null;
        this.initialize();
    }

    // Initialize profile manager
    initialize() {
        this.setupEventListeners();
        this.setupFormValidation();
        console.log('Profile Manager initialized');
    }

    // Setup DOM event listeners
    setupEventListeners() {
        const profileForm = document.getElementById('profileForm');
        const previewBtn = document.getElementById('previewProfile');
        const closeModalBtn = document.getElementById('closeProfileModal');

        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
            
            // Track form changes
            profileForm.addEventListener('input', () => {
                this.isDirty = true;
                this.updateSaveButton();
            });
        }

        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previewProfile());
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closePreviewModal());
        }

        // Handle modal close on outside click
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closePreviewModal();
                }
            });
        }

        // Auto-save functionality (optional)
        this.setupAutoSave();
    }

    // Setup form validation
    setupFormValidation() {
        const form = document.getElementById('profileForm');
        if (!form) return;

        // Real-time validation for specific fields
        const emailInput = document.getElementById('email');
        const linkedInInput = document.getElementById('linkedIn');
        const websiteInput = document.getElementById('website');
        const phoneInput = document.getElementById('phoneNumber');

        if (emailInput) {
            emailInput.addEventListener('blur', () => this.validateEmail());
        }

        if (linkedInInput) {
            linkedInInput.addEventListener('blur', () => this.validateLinkedIn());
        }

        if (websiteInput) {
            websiteInput.addEventListener('blur', () => this.validateWebsite());
        }

        if (phoneInput) {
            phoneInput.addEventListener('blur', () => this.validatePhone());
        }
    }

    // Handle form submission
    async handleFormSubmit(e) {
        e.preventDefault();
        
        if (this.isLoading) return;

        try {
            const formData = this.getFormData();
            
            // Validate form data
            this.validateFormData(formData);
            
            await this.saveProfile(formData);
            
        } catch (error) {
            console.error('Form submission error:', error);
            utils.showToast(error.message, 'error');
        }
    }

    // Get form data
    getFormData() {
        const form = document.getElementById('profileForm');
        if (!form) throw new Error('Profile form not found');

        return {
            fullName: document.getElementById('fullName')?.value.trim() || '',
            email: document.getElementById('email')?.value.trim() || '',
            phoneNumber: document.getElementById('phoneNumber')?.value.trim() || '',
            jobTitle: document.getElementById('jobTitle')?.value.trim() || '',
            companyName: document.getElementById('companyName')?.value.trim() || '',
            linkedIn: document.getElementById('linkedIn')?.value.trim() || '',
            website: document.getElementById('website')?.value.trim() || '',
            bio: document.getElementById('bio')?.value.trim() || ''
        };
    }

    // Validate form data
    validateFormData(data) {
        const errors = [];

        // Required fields
        if (!data.fullName) {
            errors.push('Full name is required');
        }

        if (!data.email) {
            errors.push('Email is required');
        } else if (!utils.isValidEmail(data.email)) {
            errors.push('Please enter a valid email address');
        }

        // Optional field validation
        if (data.linkedIn && !this.isValidLinkedInUrl(data.linkedIn)) {
            errors.push('Please enter a valid LinkedIn URL');
        }

        if (data.website && !utils.isValidUrl(data.website)) {
            errors.push('Please enter a valid website URL');
        }

        if (data.phoneNumber && !utils.isValidPhoneNumber(data.phoneNumber)) {
            errors.push('Please enter a valid phone number');
        }

        if (data.bio && data.bio.length > 500) {
            errors.push('Bio must be 500 characters or less');
        }

        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }
    }

    // Save profile to server
    async saveProfile(profileData) {
        try {
            this.isLoading = true;
            utils.showLoading();

            const response = await utils.apiRequest('/users/profile', {
                method: 'POST',
                body: JSON.stringify({
                    profile: profileData
                })
            });

            if (response.success) {
                // Update global user profile
                window.userProfile = response.user;
                this.currentProfile = profileData;
                this.isDirty = false;
                
                // Update UI
                this.updateSaveButton();
                
                utils.showToast('Profile saved successfully!', 'success');
                
                // Update dashboard stats if available
                if (window.app?.updateStats) {
                    await window.app.updateStats();
                }
            }

        } catch (error) {
            console.error('Save profile error:', error);
            throw error;
        } finally {
            this.isLoading = false;
            utils.hideLoading();
        }
    }

    // Load profile from server
    async loadProfile() {
        try {
            utils.showLoading();

            const response = await utils.apiRequest('/users/profile');
            
            if (response.success && response.user?.profile) {
                // Update global user profile
                window.userProfile = response.user;
                this.currentProfile = response.user.profile;
                this.populateForm(this.currentProfile);
                this.isDirty = false;
                this.updateSaveButton();
            }

        } catch (error) {
            console.error('Load profile error:', error);
            // Don't show error toast as user might not have a profile yet
        } finally {
            utils.hideLoading();
        }
    }

    // Populate form with profile data
    populateForm(profile) {
        const fields = [
            'fullName', 'email', 'phoneNumber', 'jobTitle', 
            'companyName', 'linkedIn', 'website', 'bio'
        ];

        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element && profile[field]) {
                element.value = profile[field];
            }
        });
    }

    // Preview profile
    previewProfile() {
        try {
            const formData = this.getFormData();
            this.validateFormData(formData);
            
            this.showProfilePreview(formData);
            
        } catch (error) {
            utils.showToast(error.message, 'error');
        }
    }

    // Show profile preview modal
    showProfilePreview(profile) {
        const modal = document.getElementById('profileModal');
        const preview = document.getElementById('profilePreview');

        if (!modal || !preview) return;

        // Generate preview HTML
        const html = this.generateProfileHTML(profile);
        preview.innerHTML = html;

        // Show modal
        modal.classList.add('active');
    }

    // Generate profile HTML
    generateProfileHTML(profile) {
        const initials = utils.getUserInitials(profile.fullName);
        
        return `
            <div class="profile-avatar">${initials}</div>
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
        `;
    }

    // Close preview modal
    closePreviewModal() {
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Validate individual fields
    validateEmail() {
        const input = document.getElementById('email');
        const email = input?.value.trim();
        
        if (email && !utils.isValidEmail(email)) {
            this.showFieldError(input, 'Please enter a valid email address');
            return false;
        } else {
            this.clearFieldError(input);
            return true;
        }
    }

    validateLinkedIn() {
        const input = document.getElementById('linkedIn');
        const url = input?.value.trim();
        
        if (url && !this.isValidLinkedInUrl(url)) {
            this.showFieldError(input, 'Please enter a valid LinkedIn URL');
            return false;
        } else {
            this.clearFieldError(input);
            return true;
        }
    }

    validateWebsite() {
        const input = document.getElementById('website');
        const url = input?.value.trim();
        
        if (url && !utils.isValidUrl(url)) {
            this.showFieldError(input, 'Please enter a valid website URL');
            return false;
        } else {
            this.clearFieldError(input);
            return true;
        }
    }

    validatePhone() {
        const input = document.getElementById('phoneNumber');
        const phone = input?.value.trim();
        
        if (phone && !utils.isValidPhoneNumber(phone)) {
            this.showFieldError(input, 'Please enter a valid phone number');
            return false;
        } else {
            this.clearFieldError(input);
            return true;
        }
    }

    // Show field error
    showFieldError(input, message) {
        if (!input) return;
        
        input.classList.add('error');
        
        // Remove existing error message
        const existingError = input.parentElement.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error message
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        errorElement.style.cssText = 'color: #dc2626; font-size: 0.875rem; margin-top: 0.25rem;';
        input.parentElement.appendChild(errorElement);
    }

    // Clear field error
    clearFieldError(input) {
        if (!input) return;
        
        input.classList.remove('error');
        
        const errorElement = input.parentElement.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    // Update save button state
    updateSaveButton() {
        const saveBtn = document.querySelector('#profileForm button[type="submit"]');
        if (!saveBtn) return;

        if (this.isDirty) {
            saveBtn.textContent = 'Save Changes';
            saveBtn.classList.remove('btn-secondary');
            saveBtn.classList.add('btn-primary');
        } else {
            saveBtn.textContent = 'Profile Saved';
            saveBtn.classList.remove('btn-primary');
            saveBtn.classList.add('btn-secondary');
        }
    }

    // Setup auto-save functionality
    setupAutoSave() {
        const form = document.getElementById('profileForm');
        if (!form) return;

        // Auto-save every 30 seconds if there are changes
        setInterval(() => {
            if (this.isDirty && !this.isLoading) {
                this.autoSave();
            }
        }, 30000);
    }

    // Auto-save profile
    async autoSave() {
        try {
            const formData = this.getFormData();
            this.validateFormData(formData);
            
            await this.saveProfile(formData);
            console.log('Profile auto-saved');
            
        } catch (error) {
            console.error('Auto-save failed:', error);
            // Don't show error toast for auto-save failures
        }
    }

    // Validate LinkedIn URL
    isValidLinkedInUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname === 'linkedin.com' || 
                   urlObj.hostname === 'www.linkedin.com' ||
                   /^https?:\/\/(www\.)?linkedin\.com\/in\//.test(url);
        } catch {
            return false;
        }
    }

    // Export profile data
    exportProfile() {
        if (!this.currentProfile) {
            utils.showToast('No profile data to export', 'warning');
            return;
        }

        const dataStr = JSON.stringify(this.currentProfile, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `business-card-profile-${Date.now()}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        utils.showToast('Profile exported successfully', 'success');
    }

    // Import profile data
    importProfile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const profileData = JSON.parse(e.target.result);
                this.validateFormData(profileData);
                this.populateForm(profileData);
                this.isDirty = true;
                this.updateSaveButton();
                utils.showToast('Profile imported successfully', 'success');
            } catch (error) {
                utils.showToast('Invalid profile file', 'error');
            }
        };
        
        reader.readAsText(file);
    }

    // Get current profile status
    getStatus() {
        return {
            hasProfile: !!this.currentProfile,
            isDirty: this.isDirty,
            isLoading: this.isLoading,
            isValid: this.validateCurrentForm()
        };
    }

    // Validate current form without showing errors
    validateCurrentForm() {
        try {
            const formData = this.getFormData();
            this.validateFormData(formData);
            return true;
        } catch {
            return false;
        }
    }
}

// Initialize profile manager
const profileManager = new ProfileManager();

// Load profile when profile page is shown
document.addEventListener('DOMContentLoaded', () => {
    // Load profile if user is authenticated
    if (window.authManager?.isAuthenticated()) {
        profileManager.loadProfile();
    }
});

// Handle auth state changes
if (window.authManager) {
    window.authManager.onAuthStateChange?.((user) => {
        if (user) {
            setTimeout(() => profileManager.loadProfile(), 1000);
        }
    });
}

// Export profile manager for use in other modules
window.profileManager = profileManager; 