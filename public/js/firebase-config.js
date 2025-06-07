// Firebase configuration and initialization
// Note: Firebase SDK is loaded via script tags in HTML

// Firebase configuration (these should be replaced with your actual config)
const firebaseConfig = window.firebaseConfig || {
    apiKey: "AIzaSyDgaHhBiiSSfHQFmjfvpsQbvNQ0tv8-oes",
            authDomain: "nfcbusinesscard-81a48.firebaseapp.com",
            projectId: "nfcbusinesscard-81a48",
            storageBucket: "nfcbusinesscard-81a48.firebasestorage.app",
            messagingSenderId: "53447193809",
            appId: "1:53447193809:web:348a650f399c456b6101f0",
            measurementId: "G-EBG3SN6XRP"
};

// Initialize Firebase
let firebaseApp;
let auth;

try {
    // Initialize Firebase app
    firebaseApp = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Auth state observer
let currentUser = null;
let authStateCallbacks = [];

// Add auth state change listener
if (auth) {
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        console.log('Auth state changed:', user ? user.uid : 'No user');
        
        // Call all registered callbacks
        authStateCallbacks.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('Auth state callback error:', error);
            }
        });
    });
}

// Firebase authentication functions
const firebaseAuth = {
    // Register auth state change callback
    onAuthStateChange: (callback) => {
        authStateCallbacks.push(callback);
        // Call immediately with current state
        if (currentUser !== null) {
            callback(currentUser);
        }
    },
    
    // Get current user
    getCurrentUser: () => {
        return currentUser;
    },
    
    // Sign up with email and password
    signUp: async (email, password) => {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const token = await userCredential.user.getIdToken();
            utils.setAuthToken(token);
            return userCredential.user;
        } catch (error) {
            console.error('Sign up error:', error);
            throw new Error(getAuthErrorMessage(error.code));
        }
    },
    
    // Sign in with email and password
    signIn: async (email, password) => {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const token = await userCredential.user.getIdToken();
            utils.setAuthToken(token);
            return userCredential.user;
        } catch (error) {
            console.error('Sign in error:', error);
            throw new Error(getAuthErrorMessage(error.code));
        }
    },
    
    // Sign out
    signOut: async () => {
        try {
            await auth.signOut();
            utils.removeAuthToken();
            currentUser = null;
        } catch (error) {
            console.error('Sign out error:', error);
            throw new Error('Failed to sign out');
        }
    },
    
    // Get ID token
    getIdToken: async () => {
        try {
            if (!currentUser) {
                throw new Error('No user signed in');
            }
            return await currentUser.getIdToken();
        } catch (error) {
            console.error('Get token error:', error);
            throw new Error('Failed to get authentication token');
        }
    },
    
    // Refresh token
    refreshToken: async () => {
        try {
            if (!currentUser) {
                throw new Error('No user signed in');
            }
            const token = await currentUser.getIdToken(true); // Force refresh
            utils.setAuthToken(token);
            return token;
        } catch (error) {
            console.error('Refresh token error:', error);
            throw new Error('Failed to refresh token');
        }
    },
    
    // Send password reset email
    resetPassword: async (email) => {
        try {
            await auth.sendPasswordResetEmail(email);
        } catch (error) {
            console.error('Password reset error:', error);
            throw new Error(getAuthErrorMessage(error.code));
        }
    },
    
    // Update user profile
    updateProfile: async (displayName, photoURL) => {
        try {
            if (!currentUser) {
                throw new Error('No user signed in');
            }
            await currentUser.updateProfile({
                displayName: displayName,
                photoURL: photoURL
            });
        } catch (error) {
            console.error('Update profile error:', error);
            throw new Error('Failed to update profile');
        }
    },
    
    // Update email
    updateEmail: async (newEmail) => {
        try {
            if (!currentUser) {
                throw new Error('No user signed in');
            }
            await currentUser.updateEmail(newEmail);
        } catch (error) {
            console.error('Update email error:', error);
            throw new Error(getAuthErrorMessage(error.code));
        }
    },
    
    // Update password
    updatePassword: async (newPassword) => {
        try {
            if (!currentUser) {
                throw new Error('No user signed in');
            }
            await currentUser.updatePassword(newPassword);
        } catch (error) {
            console.error('Update password error:', error);
            throw new Error(getAuthErrorMessage(error.code));
        }
    },
    
    // Re-authenticate user
    reauthenticate: async (password) => {
        try {
            if (!currentUser) {
                throw new Error('No user signed in');
            }
            const credential = firebase.auth.EmailAuthProvider.credential(
                currentUser.email,
                password
            );
            await currentUser.reauthenticateWithCredential(credential);
        } catch (error) {
            console.error('Reauthentication error:', error);
            throw new Error(getAuthErrorMessage(error.code));
        }
    },
    
    // Delete user account
    deleteAccount: async () => {
        try {
            if (!currentUser) {
                throw new Error('No user signed in');
            }
            await currentUser.delete();
            utils.removeAuthToken();
            currentUser = null;
        } catch (error) {
            console.error('Delete account error:', error);
            throw new Error(getAuthErrorMessage(error.code));
        }
    }
};

// Helper function to get user-friendly error messages
function getAuthErrorMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'This email address is already registered.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
        'auth/weak-password': 'Password should be at least 6 characters long.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email address.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Please check your connection.',
        'auth/requires-recent-login': 'Please sign in again to complete this action.',
        'auth/expired-action-code': 'The action code has expired.',
        'auth/invalid-action-code': 'The action code is invalid.',
        'auth/missing-android-pkg-name': 'An Android package name is required.',
        'auth/missing-continue-uri': 'A continue URL is required.',
        'auth/missing-ios-bundle-id': 'An iOS bundle ID is required.',
        'auth/invalid-continue-uri': 'The continue URL is invalid.',
        'auth/unauthorized-continue-uri': 'The continue URL is not authorized.',
        'auth/invalid-api-key': 'The API key is invalid.',
        'auth/app-deleted': 'The Firebase app was deleted.',
        'auth/app-not-authorized': 'This app is not authorized to use Firebase Authentication.',
        'auth/argument-error': 'An invalid argument was provided.',
        'auth/invalid-api-key': 'The API key is invalid.',
        'auth/invalid-user-token': 'The user token is invalid.',
        'auth/network-request-failed': 'A network error occurred.',
        'auth/operation-not-supported-in-this-environment': 'This operation is not supported in this environment.',
        'auth/timeout': 'The operation timed out.',
        'auth/missing-app-credential': 'Missing app credential.',
        'auth/invalid-app-credential': 'Invalid app credential.',
        'auth/invalid-app-id': 'Invalid app identifier.',
        'auth/invalid-tenant-id': 'Invalid tenant identifier.'
    };
    
    return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
}

// Token refresh interval (45 minutes)
const TOKEN_REFRESH_INTERVAL = 45 * 60 * 1000;
let tokenRefreshTimer = null;

// Start automatic token refresh
function startTokenRefresh() {
    if (tokenRefreshTimer) {
        clearInterval(tokenRefreshTimer);
    }
    
    tokenRefreshTimer = setInterval(async () => {
        try {
            if (currentUser) {
                await firebaseAuth.refreshToken();
                console.log('Token refreshed automatically');
            }
        } catch (error) {
            console.error('Auto token refresh failed:', error);
        }
    }, TOKEN_REFRESH_INTERVAL);
}

// Stop automatic token refresh
function stopTokenRefresh() {
    if (tokenRefreshTimer) {
        clearInterval(tokenRefreshTimer);
        tokenRefreshTimer = null;
    }
}

// Start token refresh when user signs in
firebaseAuth.onAuthStateChange((user) => {
    if (user) {
        startTokenRefresh();
    } else {
        stopTokenRefresh();
    }
});

// Handle page visibility change to refresh token when page becomes visible
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && currentUser) {
        try {
            await firebaseAuth.refreshToken();
            console.log('Token refreshed on page focus');
        } catch (error) {
            console.error('Token refresh on focus failed:', error);
        }
    }
});

// Export Firebase auth functions
window.firebaseAuth = firebaseAuth;

// Also export individual functions for convenience
window.firebase = firebase;
window.auth = auth; 