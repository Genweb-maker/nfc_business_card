'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from './Toast';

interface NavbarProps {
  currentPage: string;
  onPageChange: (page: 'dashboard' | 'profile' | 'share' | 'connections') => void;
}

export default function Navbar({ currentPage, onPageChange }: NavbarProps) {
  const { logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Logged out successfully', 'success');
    } catch (error) {
      showToast('Failed to logout', 'error');
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'profile', label: 'Profile' },
    { id: 'share', label: 'Share' },
    { id: 'connections', label: 'Connections' },
  ];

  return (
    <nav className="navbar fixed top-0 left-0 right-0 z-40 py-4">
      <div className="max-w-6xl mx-auto px-8 flex justify-between items-center">
        <div className="flex items-center gap-2 text-indigo-500 font-bold text-xl">
          <span className="text-2xl">📱</span>
          <span>NFC Card</span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id as any)}
              className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
            >
              {item.label}
            </button>
          ))}
          <button onClick={handleLogout} className="btn-secondary">
            Logout
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden flex flex-col gap-1 p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span className="w-6 h-0.5 bg-gray-600 transition-all"></span>
          <span className="w-6 h-0.5 bg-gray-600 transition-all"></span>
          <span className="w-6 h-0.5 bg-gray-600 transition-all"></span>
        </button>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 md:hidden">
            <div className="flex flex-col p-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onPageChange(item.id as any);
                    setIsMenuOpen(false);
                  }}
                  className={`nav-link text-left ${currentPage === item.id ? 'active' : ''}`}
                >
                  {item.label}
                </button>
              ))}
              <button onClick={handleLogout} className="btn-secondary mt-4">
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 