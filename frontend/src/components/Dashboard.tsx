'use client';

import { useState, useEffect } from 'react';
import { getConnectionStats } from '../lib/api';
import { showToast } from './Toast';

interface Stats {
  sentCount: number;
  receivedCount: number;
  nfcCount: number;
  qrCount: number;
}

interface DashboardProps {
  onPageChange: (page: 'dashboard' | 'profile' | 'share' | 'connections') => void;
}

export default function Dashboard({ onPageChange }: DashboardProps) {
  const [stats, setStats] = useState<Stats>({
    sentCount: 0,
    receivedCount: 0,
    nfcCount: 0,
    qrCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await getConnectionStats();
      if (response.success) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      showToast('Failed to load dashboard stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      icon: '📤',
      title: 'Profiles Shared',
      value: stats.sentCount,
      color: 'text-blue-600'
    },
    {
      icon: '📥',
      title: 'Profiles Received',
      value: stats.receivedCount,
      color: 'text-green-600'
    },
    {
      icon: '📱',
      title: 'NFC Shares',
      value: stats.nfcCount,
      color: 'text-purple-600'
    },
    {
      icon: '📊',
      title: 'QR Shares',
      value: stats.qrCount,
      color: 'text-orange-600'
    }
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-8 py-8">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-white/80">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Dashboard</h1>
        <p className="text-xl text-white/80">Welcome back! Here's your activity overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="text-3xl">{stat.icon}</div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
              <p className="text-white/80">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="action-card cursor-pointer hover:scale-105 transition-transform" onClick={() => onPageChange('profile')}>
            <div className="text-4xl mb-4">👤</div>
            <h3 className="text-xl font-semibold text-white mb-2">Edit Profile</h3>
            <p className="text-white/80">Update your business information</p>
          </div>
          
          <div className="action-card cursor-pointer hover:scale-105 transition-transform" onClick={() => onPageChange('share')}>
            <div className="text-4xl mb-4">🔗</div>
            <h3 className="text-xl font-semibold text-white mb-2">Share Profile</h3>
            <p className="text-white/80">Share via NFC or QR code</p>
          </div>
          
          <div className="action-card cursor-pointer hover:scale-105 transition-transform" onClick={() => onPageChange('connections')}>
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-white mb-2">View Connections</h3>
            <p className="text-white/80">See your networking history</p>
          </div>
        </div>
      </div>
    </div>
  );
} 