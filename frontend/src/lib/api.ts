// API base URL - In production, this should be your backend URL
const API_BASE = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_API_URL
  : 'https://nfc-business-card-be.onrender.com/api';

// Get stored auth token
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
}

// Set auth token
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('authToken', token);
}

// Remove auth token
export function removeAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('authToken');
}

// API request helper
export async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${API_BASE}${endpoint}`;
  const token = getAuthToken();
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };
  
  const mergedOptions: RequestInit = {
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
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
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
  } catch (error: any) {
    console.error('API request failed:', error);
    
    // Handle specific error types
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Connection failed. Please check if the backend server is running and if any browser extensions are blocking the request.');
    }
    
    throw error;
  }
}

// User profile functions
export async function getUserProfile() {
  return await apiRequest('/users/profile');
}

export async function updateUserProfile(profileData: any) {
  return await apiRequest('/users/profile', {
    method: 'POST',
    body: JSON.stringify(profileData)
  });
}

export async function createUserProfile(profileData: any) {
  return await apiRequest('/users/profile', {
    method: 'POST',
    body: JSON.stringify(profileData)
  });
}

// Connection functions
export async function getConnections() {
  return await apiRequest('/connections');
}

export async function getReceivedConnections(page: number = 1, limit: number = 20) {
  return await apiRequest(`/connections/received?page=${page}&limit=${limit}`);
}

export async function getSentConnections(page: number = 1, limit: number = 20) {
  return await apiRequest(`/connections/sent?page=${page}&limit=${limit}`);
}

export async function addConnection(connectionData: any) {
  return await apiRequest('/connections/save', {
    method: 'POST',
    body: JSON.stringify(connectionData)
  });
}

export async function getConnectionStats() {
  return await apiRequest('/connections/stats');
}

export async function deleteConnection(connectionId: string) {
  return await apiRequest(`/connections/${connectionId}`, {
    method: 'DELETE'
  });
} 