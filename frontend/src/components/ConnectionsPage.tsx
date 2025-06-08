'use client';

import { useState, useEffect } from 'react';
import { getReceivedConnections, getSentConnections, deleteConnection } from '../lib/api';
import { showToast } from './Toast';

interface Connection {
  _id: string;
  senderUid: string;
  receiverUid: string;
  sharedProfile: {
    fullName: string;
    email: string;
    phoneNumber?: string;
    jobTitle?: string;
    companyName?: string;
    linkedIn?: string;
    website?: string;
    bio?: string;
  };
  shareMethod: 'NFC' | 'QR';
  createdAt: string;
  isActive: boolean;
}

interface ConnectionResponse {
  success: boolean;
  connections: Connection[];
  pagination: {
    current: number;
    total: number;
    count: number;
    totalRecords: number;
  };
}

export default function ConnectionsPage() {
  const [receivedConnections, setReceivedConnections] = useState<Connection[]>([]);
  const [sentConnections, setSentConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);

  useEffect(() => {
    loadConnections();
  }, [activeTab]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'received') {
        const response: ConnectionResponse = await getReceivedConnections();
        if (response.success) {
          setReceivedConnections(response.connections || []);
        }
      } else {
        const response: ConnectionResponse = await getSentConnections();
        if (response.success) {
          setSentConnections(response.connections || []);
        }
      }
    } catch (error) {
      console.error('Failed to load connections:', error);
      showToast('Failed to load connections', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) {
      return;
    }

    try {
      const response = await deleteConnection(connectionId);
      if (response.success) {
        showToast('Connection deleted successfully', 'success');
        
        // Remove from local state
        if (activeTab === 'received') {
          setReceivedConnections(prev => prev.filter(c => c._id !== connectionId));
        } else {
          setSentConnections(prev => prev.filter(c => c._id !== connectionId));
        }
        
        // Close modal
        setSelectedConnection(null);
      }
    } catch (error) {
      console.error('Failed to delete connection:', error);
      showToast('Failed to delete connection', 'error');
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const currentConnections = activeTab === 'received' ? receivedConnections : sentConnections;

  if (loading) {
    return (
      <div className="container mx-auto px-8 py-8">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-white/80">Loading connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Connections</h1>
        <p className="text-xl text-white/80">Your networking history and received profiles</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1 flex">
          <button
            onClick={() => setActiveTab('received')}
            className={`px-6 py-2 rounded-md font-medium transition-all ${
              activeTab === 'received'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-white hover:text-white/80'
            }`}
          >
            Received ({receivedConnections.length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-6 py-2 rounded-md font-medium transition-all ${
              activeTab === 'sent'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-white hover:text-white/80'
            }`}
          >
            Sent ({sentConnections.length})
          </button>
        </div>
      </div>

      {/* Connections Grid */}
      <div className="max-w-6xl mx-auto">
        {currentConnections.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No {activeTab} connections yet
            </h3>
            <p className="text-white/80">
              {activeTab === 'received' 
                ? 'Start sharing your profile to receive connections!'
                : 'Share your profile via NFC or QR code to build connections!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentConnections.map((connection) => (
              <div
                key={connection._id}
                className="connection-card cursor-pointer"
                onClick={() => setSelectedConnection(connection)}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="profile-avatar w-12 h-12 text-lg">
                    {getUserInitials(connection.sharedProfile.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">
                      {connection.sharedProfile.fullName}
                    </h3>
                    <p className="text-white/80 text-sm truncate">
                      {connection.sharedProfile.jobTitle && connection.sharedProfile.companyName
                        ? `${connection.sharedProfile.jobTitle} at ${connection.sharedProfile.companyName}`
                        : connection.sharedProfile.jobTitle || connection.sharedProfile.companyName || connection.sharedProfile.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      connection.shareMethod === 'NFC' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {connection.shareMethod.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-white/60">
                    {formatDate(connection.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connection Detail Modal */}
      {selectedConnection && (
        <div className="modal active">
          <div className="modal-content">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Connection Details</h2>
              <button
                onClick={() => setSelectedConnection(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="profile-preview">
              <div className="profile-avatar">
                {getUserInitials(selectedConnection.sharedProfile.fullName)}
              </div>
              
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-1">
                  {selectedConnection.sharedProfile.fullName}
                </h3>
                <p className="text-gray-600">
                  {selectedConnection.sharedProfile.jobTitle && selectedConnection.sharedProfile.companyName 
                    ? `${selectedConnection.sharedProfile.jobTitle} at ${selectedConnection.sharedProfile.companyName}`
                    : selectedConnection.sharedProfile.jobTitle || selectedConnection.sharedProfile.companyName || ''}
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">📧</span>
                  <span>{selectedConnection.sharedProfile.email}</span>
                </div>
                
                {selectedConnection.sharedProfile.phoneNumber && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">📞</span>
                    <span>{selectedConnection.sharedProfile.phoneNumber}</span>
                  </div>
                )}
                
                {selectedConnection.sharedProfile.website && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">🌐</span>
                    <a 
                      href={selectedConnection.sharedProfile.website} 
                      className="text-indigo-600 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {selectedConnection.sharedProfile.website}
                    </a>
                  </div>
                )}
                
                {selectedConnection.sharedProfile.linkedIn && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">💼</span>
                    <a 
                      href={selectedConnection.sharedProfile.linkedIn} 
                      className="text-indigo-600 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      LinkedIn Profile
                    </a>
                  </div>
                )}
              </div>

              {selectedConnection.sharedProfile.bio && (
                <div className="mb-6 pt-6 border-t">
                  <h4 className="font-semibold mb-2">About</h4>
                  <p className="text-gray-600">{selectedConnection.sharedProfile.bio}</p>
                </div>
              )}

              <div className="pt-6 border-t">
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedConnection.shareMethod === 'NFC' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedConnection.shareMethod.toUpperCase()}
                    </span>
                    <span>{activeTab === 'received' ? 'Received' : 'Sent'}</span>
                  </div>
                  <span>{formatDate(selectedConnection.createdAt)}</span>
                </div>
                
                {activeTab === 'received' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteConnection(selectedConnection._id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      Delete Connection
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 