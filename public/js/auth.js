// Authentication module for the NFC Business Card application

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.initialized = false;
        this.initializeAuth();
    }

    // Initialize authentication
    async initializeAuth() {
        try {
            // Wait for Firebase to be ready
            if (typeof firebaseAuth === 'undefined') {
                setTimeout(() => this.initializeAuth(), 100);
                return;
            }

            // Listen for auth state changes
            firebaseAuth.onAuthStateChange((user) => {
                this.currentUser = user;
                this.handleAuthStateChange(user);
            });

            this.initialized = true;
            console.log('Auth manager initialized');
        } catch (error) {
            console.error('Auth initialization error:', error);
            utils.showToast('Authentication system failed to initialize', 'error');
        }
    }

    // Handle authentication state changes
    handleAuthStateChange(user) {
        console.log('Auth state changed:', user ? 'User signed in' : 'User signed out');
        
        if (user) {
            this.showAuthenticatedUI();
            this.loadUserData();
        } else {
            this.showUnauthenticatedUI();
            this.clearUserData();
        }
    }

    // Show authenticated user interface
    showAuthenticatedUI() {
        const authPage = document.getElementById('authPage');
        const navbar = document.getElementById('navbar');
        
        if (authPage) {
            authPage.classList.remove('active');
        }
        
        if (navbar) {
            navbar.classList.add('show');
        }

        // Navigate to dashboard
        if (window.app && window.app.navigateTo) {
            window.app.navigateTo('dashboard');
        }
    }

    // Show unauthenticated user interface
    showUnauthenticatedUI() {
        const authPage = document.getElementById('authPage');
        const navbar = document.getElementById('navbar');
        
        if (authPage) {
            authPage.classList.add('active');
        }
        
        if (navbar) {
            navbar.classList.remove('show');
        }

        // Hide all other pages
        document.querySelectorAll('.page:not(#authPage)').forEach(page => {
            page.classList.remove('active');
        });
    }

    // Load user data after authentication
    async loadUserData() {
        try {
            if (!this.currentUser) return;

            // Load user profile data
            const userData = await utils.apiRequest('/users/profile');
            
            if (userData.success) {
                window.userProfile = userData.user;
                this.updateUIWithUserData(userData.user);
            }
        } catch (error) {
            console.error('Failed to load user data:', error);
            // User might not have a profile yet, that's okay
        }
    }

    // Clear user data on logout
    clearUserData() {
        window.userProfile = null;
        
        // Clear any cached data
        utils.storage.remove('userProfile');
        utils.storage.remove('connections');
    }

    // Update UI with user data
    updateUIWithUserData(user) {
        // Update any UI elements that show user info
        const userElements = document.querySelectorAll('[data-user-field]');
        userElements.forEach(element => {
            const field = element.getAttribute('data-user-field');
            if (user.profile && user.profile[field]) {
                element.textContent = user.profile[field];
            }
        });
    }

    // Register new user
    async register(email, password, confirmPassword) {
        try {
            // Validate inputs
            if (!email || !password || !confirmPassword) {
                throw new Error('All fields are required');
            }

            if (!utils.isValidEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }

            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            utils.showLoading();

            // Create user with Firebase
            const user = await firebaseAuth.signUp(email, password);
            
            utils.showToast('Account created successfully!', 'success');
            
            return user;
        } catch (error) {
            console.error('Registration error:', error);
            utils.showToast(error.message, 'error');
            throw error;
        } finally {
            utils.hideLoading();
        }
    }

    // Sign in user
    async login(email, password) {
        try {
            // Validate inputs
            if (!email || !password) {
                throw new Error('Email and password are required');
            }

            if (!utils.isValidEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            utils.showLoading();

            // Sign in with Firebase
            const user = await firebaseAuth.signIn(email, password);
            
            utils.showToast('Welcome back!', 'success');
            
            return user;
        } catch (error) {
            console.error('Login error:', error);
            utils.showToast(error.message, 'error');
            throw error;
        } finally {
            utils.hideLoading();
        }
    }

    // Sign out user
    async logout() {
        try {
            utils.showLoading();
            
            await firebaseAuth.signOut();
            
            utils.showToast('Signed out successfully', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            utils.showToast('Failed to sign out', 'error');
            throw error;
        } finally {
            utils.hideLoading();
        }
    }

    // Reset password
    async resetPassword(email) {
        try {
            if (!email) {
                throw new Error('Email address is required');
            }

            if (!utils.isValidEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            utils.showLoading();

            await firebaseAuth.resetPassword(email);
            
            utils.showToast('Password reset email sent!', 'success');
        } catch (error) {
            console.error('Password reset error:', error);
            utils.showToast(error.message, 'error');
            throw error;
        } finally {
            utils.hideLoading();
        }
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser;
    }

    // Get user ID
    getUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    }

    // Get user email
    getUserEmail() {
        return this.currentUser ? this.currentUser.email : null;
    }

    // Refresh authentication token
    async refreshToken() {
        try {
            if (!this.currentUser) {
                throw new Error('No user signed in');
            }

            await firebaseAuth.refreshToken();
            console.log('Token refreshed');
        } catch (error) {
            console.error('Token refresh error:', error);
            // If refresh fails, user might need to sign in again
            await this.logout();
            throw error;
        }
    }
}

// Initialize authentication manager
const authManager = new AuthManager();

// DOM event handlers
document.addEventListener('DOMContentLoaded', () => {
    // Auth form elements
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const authTabs = document.querySelectorAll('.tab-btn');

    // Handle auth tab switching
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            switchAuthTab(tabName);
        });
    });

    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            try {
                await authManager.login(email, password);
                loginForm.reset();
            } catch (error) {
                // Error handling is done in the login method
            }
        });
    }

    // Handle register form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            
            try {
                await authManager.register(email, password, confirmPassword);
                registerForm.reset();
            } catch (error) {
                // Error handling is done in the register method
            }
        });
    }

    // Handle logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await authManager.logout();
            } catch (error) {
                // Error handling is done in the logout method
            }
        });
    }

    // Real-time form validation
    setupFormValidation();
});

// Switch between login and register tabs
function switchAuthTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        }
    });

    // Update forms
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    
    const targetForm = document.getElementById(`${tabName}Form`);
    if (targetForm) {
        targetForm.classList.add('active');
    }
}

// Setup real-time form validation
function setupFormValidation() {
    // Email validation
    const emailInputs = document.querySelectorAll('input[type="email"]');
    emailInputs.forEach(input => {
        input.addEventListener('blur', () => {
            validateEmailInput(input);
        });
    });

    // Password validation
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
        input.addEventListener('input', () => {
            validatePasswordInput(input);
        });
    });

    // Confirm password validation
    const confirmPasswordInput = document.getElementById('registerConfirmPassword');
    const passwordInput = document.getElementById('registerPassword');
    
    if (confirmPasswordInput && passwordInput) {
        confirmPasswordInput.addEventListener('input', () => {
            validatePasswordMatch(passwordInput, confirmPasswordInput);
        });
    }
}

// Validate email input
function validateEmailInput(input) {
    const email = input.value.trim();
    
    if (email && !utils.isValidEmail(email)) {
        input.setCustomValidity('Please enter a valid email address');
        input.classList.add('invalid');
    } else {
        input.setCustomValidity('');
        input.classList.remove('invalid');
    }
}

// Validate password input
function validatePasswordInput(input) {
    const password = input.value;
    
    if (password && password.length < 6) {
        input.setCustomValidity('Password must be at least 6 characters long');
        input.classList.add('invalid');
    } else {
        input.setCustomValidity('');
        input.classList.remove('invalid');
    }
}

// Validate password match
function validatePasswordMatch(passwordInput, confirmPasswordInput) {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (confirmPassword && password !== confirmPassword) {
        confirmPasswordInput.setCustomValidity('Passwords do not match');
        confirmPasswordInput.classList.add('invalid');
    } else {
        confirmPasswordInput.setCustomValidity('');
        confirmPasswordInput.classList.remove('invalid');
    }
}

// Add password visibility toggle
document.addEventListener('DOMContentLoaded', () => {
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    
    passwordInputs.forEach(input => {
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.innerHTML = '👁';
        toggleBtn.className = 'password-toggle';
        toggleBtn.style.cssText = `
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            font-size: 16px;
        `;
        
        // Make parent relative
        input.parentElement.style.position = 'relative';
        input.style.paddingRight = '40px';
        
        input.parentElement.appendChild(toggleBtn);
        
        toggleBtn.addEventListener('click', () => {
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            toggleBtn.innerHTML = type === 'password' ? '👁' : '🙈';
        });
    });
});

// Export auth manager for use in other modules
window.authManager = authManager; 