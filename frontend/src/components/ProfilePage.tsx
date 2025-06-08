'use client';

import { useState, useEffect } from 'react';
import { getUserProfile, updateUserProfile, createUserProfile } from '../lib/api';
import { showToast } from './Toast';

interface ProfileData {
  createdAt: string;
  email: string;
  firebaseUid?: string;
  profile: Profile;
}

interface Profile {
  bio: string;
  companyName: string;
  email: string;
  fullName: string;
  jobTitle: string;
  linkedIn: string;
  phoneNumber: string;
  website: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>({
    createdAt: '',
    email: '',
    firebaseUid: '',
    profile: {
      bio: '',
      companyName: '',
      email: '',
      fullName: '',
      jobTitle: '',
      linkedIn: '',
      phoneNumber: '',
      website: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await getUserProfile();
      if (response.success && response.user) {
        setProfile(response.user);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Don't show error toast as user might not have a profile yet
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await updateUserProfile(profile);
      if (response.success) {
        showToast('Profile saved successfully!', 'success');
      } else {
        // Try creating profile if update fails
        const createResponse = await createUserProfile(profile);
        if (createResponse.success) {
          showToast('Profile created successfully!', 'success');
        }
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfile(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        [e.target.name]: e.target.value
      }
    }));
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-8 py-8">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-white/80">Loading profile...</p>
        </div>
      </div>
    );
  }
  console.log("@profile", profile);
  return (
    <div className="container mx-auto px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">My Profile</h1>
        <p className="text-xl text-white/80">Manage your business card information</p>
      </div>

      {/* Profile Form */}
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-group">
              <label htmlFor="fullName" className="text-white">Full Name *</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={profile?.profile?.fullName}
                onChange={handleInputChange}
                required
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="text-white">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={profile?.profile?.email}
                onChange={handleInputChange}
                required
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber" className="text-white">Phone Number</label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={profile?.profile?.phoneNumber}
                onChange={handleInputChange}
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="jobTitle" className="text-white">Job Title</label>
              <input
                type="text"
                id="jobTitle"
                name="jobTitle"
                value={profile?.profile?.jobTitle}
                onChange={handleInputChange}
                disabled={saving}
              />
            </div>

            <div className="form-group md:col-span-2">
              <label htmlFor="companyName" className="text-white">Company Name</label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={profile?.profile?.companyName}
                onChange={handleInputChange}
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="linkedIn" className="text-white">LinkedIn Profile</label>
              <input
                type="url"
                id="linkedIn"
                name="linkedIn"
                value={profile?.profile?.linkedIn}
                onChange={handleInputChange}
                placeholder="https://linkedin.com/in/yourprofile"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="website" className="text-white">Website</label>
              <input
                type="url"
                id="website"
                name="website"
                value={profile?.profile?.website}
                onChange={handleInputChange}
                placeholder="https://yourwebsite.com"
                disabled={saving}
              />
            </div>

            <div className="form-group md:col-span-2">
              <label htmlFor="bio" className="text-white">Bio</label>
              <textarea
                id="bio"
                name="bio"
                value={profile?.profile?.bio}
                onChange={handleInputChange}
                rows={3}
                placeholder="Brief description about yourself..."
                disabled={saving}
              />
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : (
                'Save Profile'
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="btn-secondary"
              disabled={saving}
            >
              Preview
            </button>
          </div>
        </form>
      </div>

      {/* Profile Preview Modal */}
      {showPreview && (
        <div className="modal active">
          <div className="modal-content">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Profile Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="profile-preview">
              <div className="profile-avatar">
                {getUserInitials(profile?.profile?.fullName)}
              </div>

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-1">
                  {profile?.profile?.fullName || 'Your Name'}
                </h3>
                <p className="text-gray-600">
                  {profile?.profile?.jobTitle && profile?.profile?.companyName
                    ? `${profile?.profile?.jobTitle} at ${profile?.profile?.companyName}`
                    : profile?.profile?.jobTitle || profile?.profile?.companyName || 'Your Title'}
                </p>
              </div>

              <div className="space-y-3">
                {profile?.profile?.email && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">📧</span>
                    <span>{profile?.profile?.email}</span>
                  </div>
                )}

                {profile?.profile?.phoneNumber && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">📞</span>
                    <span>{profile?.profile?.phoneNumber}</span>
                  </div>
                )}

                {profile?.profile?.website && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">🌐</span>
                    <a href={profile?.profile?.website} className="text-indigo-600 hover:underline">
                      {profile?.profile?.website}
                    </a>
                  </div>
                )}

                {profile?.profile?.linkedIn && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">💼</span>
                    <a href={profile?.profile?.linkedIn} className="text-indigo-600 hover:underline">
                      LinkedIn Profile
                    </a>
                  </div>
                )}
              </div>

              {profile?.profile?.bio && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-semibold mb-2">About</h4>
                  <p className="text-gray-600">{profile?.profile?.bio}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 