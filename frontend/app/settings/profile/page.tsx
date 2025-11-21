'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { 
  getProvider, 
  getProviderReadonly, 
  fetchProfile,
  createProfile,
  updateProfile
} from '@/services'

export default function ProfileSettingsPage() {
  const router = useRouter()
  const { publicKey, signTransaction, sendTransaction } = useWallet()

  // State
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    displayName: '',
    avatarUri: ''
  })

  // Program instances
  const readonlyProgram = useMemo(() => getProviderReadonly(), [])
  const program = useMemo(() => {
    if (publicKey && signTransaction && sendTransaction) {
      return getProvider(publicKey, signTransaction, sendTransaction)
    }
    return null
  }, [publicKey, signTransaction, sendTransaction])

  // Fetch current profile
  useEffect(() => {
    const fetchCurrentProfile = async () => {
      if (!readonlyProgram || !publicKey) return

      try {
        const profileData = await fetchProfile(readonlyProgram, publicKey)
        if (profileData) {
          setProfile(profileData)
          setFormData({
            displayName: profileData.displayName || '',
            avatarUri: profileData.avatarUri || ''
          })
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentProfile()
  }, [readonlyProgram, publicKey])

  // Handle form submission
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!program || !publicKey) return

    setSaving(true)
    setError(null)

    try {
      if (profile) {
        // Update existing profile
        await updateProfile(program, publicKey, formData.displayName, formData.avatarUri)
      } else {
        // Create new profile
        await createProfile(program, publicKey, formData.displayName, formData.avatarUri)
      }

      // Redirect back to profile
      router.push(`/profile/${publicKey.toString()}`)
    } catch (err) {
      console.error('Error saving profile:', err)
      setError('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Connect Wallet Required</h1>
          <p className="text-gray-600 mb-4">Please connect your wallet to edit your profile.</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                Display Name *
              </label>
              <input
                type="text"
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your display name"
                required
              />
            </div>

            {/* Avatar URI */}
            <div>
              <label htmlFor="avatarUri" className="block text-sm font-medium text-gray-700 mb-1">
                Avatar URI
              </label>
              <input
                type="url"
                id="avatarUri"
                value={formData.avatarUri}
                onChange={(e) => setFormData(prev => ({ ...prev, avatarUri: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/avatar.jpg"
              />
              <p className="text-sm text-gray-500 mt-1">
                URL to your profile image (IPFS, Arweave, or other)
              </p>
            </div>

            {/* Preview */}
            {(formData.displayName || formData.avatarUri) && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    {formData.displayName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {formData.displayName || 'Display Name'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !formData.displayName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : (profile ? 'Update Profile' : 'Create Profile')}
              </button>
            </div>
          </form>
        </div>

        {/* Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Profile Information</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Your display name will be shown across the platform</li>
            <li>• Avatar images should be publicly accessible URLs</li>
            <li>• Changes may take a moment to appear throughout the app</li>
            <li>• Your wallet address will always be visible for verification</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
