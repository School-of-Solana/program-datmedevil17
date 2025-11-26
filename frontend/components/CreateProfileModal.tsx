'use client'
import React, { useState, useRef } from 'react'
import { useProfile } from './ProfileProvider'
import { uploadImage } from '@/services/pinata'

export default function CreateProfileModal() {
  const { showCreateProfile, setShowCreateProfile, createUserProfile, isLoading } = useProfile()
  
  const [formData, setFormData] = useState({
    displayName: '',
    avatarUri: ''
  })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      
      // Create preview URL
      const reader = new FileReader()
      reader.onload = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
      
      // Clear any existing avatar URI
      setFormData(prev => ({ ...prev, avatarUri: '' }))
    }
  }

  const handleUploadImage = async () => {
    if (!selectedFile) return

    setUploadingImage(true)
    setError(null)

    try {
      const ipfsUrl = await uploadImage(selectedFile, `${formData.displayName || 'user'}-avatar`)
      setFormData(prev => ({ ...prev, avatarUri: ipfsUrl }))
      setSelectedFile(null)
      setPreviewUrl(null)
    } catch (err) {
      console.error('Image upload error:', err)
      setError('Failed to upload image. Please try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  const clearImage = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setFormData(prev => ({ ...prev, avatarUri: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.displayName.trim()) {
      setError('Display name is required')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const success = await createUserProfile(
        formData.displayName.trim(),
        formData.avatarUri.trim() || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.displayName}`
      )

      if (success) {
        setFormData({ displayName: '', avatarUri: '' })
        clearImage()
        setError(null)
      } else {
        setError('Failed to create profile. Please try again.')
      }
    } catch (err) {
      console.error('Profile creation error:', err)
      setError('An error occurred while creating your profile.')
    } finally {
      setCreating(false)
    }
  }

  const handleSkip = () => {
    setShowCreateProfile(false)
    clearImage()
    setFormData({ displayName: '', avatarUri: '' })
    setError(null)
    // Note: User will be prompted again next time they connect
  }

  if (!showCreateProfile) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-cyber-500/30 rounded-lg max-w-md w-full shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-cyber-500 to-electric-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white text-2xl">👤</span>
            </div>
            <h2 className="text-2xl font-headline font-bold bg-gradient-to-r from-cyber-400 to-electric-400 bg-clip-text text-transparent mb-2">
              CREATE YOUR PROFILE
            </h2>
            <p className="text-gray-300">
              Set up your profile to start participating in the community
            </p>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1">
                Display Name *
              </label>
              <input
                type="text"
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="Enter your display name"
                className="w-full px-3 py-2 bg-gray-700/50 border border-cyber-500/30 text-gray-200 placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-cyber-500 focus:border-cyber-400 transition-all"
                maxLength={50}
                required
              />
              <div className="text-xs text-gray-400 mt-1">
                This is how others will see you in the community
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Avatar Image
              </label>
              
              {/* Image Preview or Upload Area */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  {previewUrl || formData.avatarUri ? (
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                      <img
                        src={previewUrl || formData.avatarUri}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-r from-cyber-500 to-electric-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {formData.displayName ? formData.displayName.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                  
                  {(previewUrl || formData.avatarUri) && (
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <div className="flex flex-col space-y-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="px-3 py-2 bg-gray-700/50 border border-cyber-500/30 text-gray-200 hover:bg-gray-600/50 hover:border-cyber-400/50 disabled:opacity-50 text-sm rounded-lg transition-all"
                    >
                      Choose Image
                    </button>
                    
                    {selectedFile && !formData.avatarUri && (
                      <button
                        type="button"
                        onClick={handleUploadImage}
                        disabled={uploadingImage}
                        className="px-3 py-2 bg-gradient-to-r from-cyber-600 to-electric-600 hover:from-cyber-700 hover:to-electric-700 text-white rounded-lg disabled:opacity-50 text-sm transition-all"
                      >
                        {uploadingImage ? 'Uploading...' : 'Upload to IPFS'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-gray-400 mt-1">
                Upload an image or leave empty for a generated avatar
              </div>
            </div>

            <div>
              <label htmlFor="avatarUri" className="block text-sm font-medium text-gray-300 mb-1">
                Avatar URL (Alternative)
              </label>
              <input
                type="url"
                id="avatarUri"
                value={formData.avatarUri}
                onChange={(e) => setFormData(prev => ({ ...prev, avatarUri: e.target.value }))}
                placeholder="https://example.com/avatar.png"
                className="w-full px-3 py-2 bg-gray-700/50 border border-cyber-500/30 text-gray-200 placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-cyber-500 focus:border-cyber-400 transition-all"
                disabled={!!selectedFile}
              />
              <div className="text-xs text-gray-400 mt-1">
                Or paste a direct image URL instead of uploading
              </div>
            </div>

            {/* Preview */}
            {formData.displayName && (
              <div className="bg-gray-800/50 border border-cyber-500/20 rounded-lg p-4">
                <div className="text-sm text-gray-300 mb-2">Preview:</div>
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                    {formData.avatarUri || previewUrl ? (
                      <img
                        src={previewUrl || formData.avatarUri}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-cyber-500 to-electric-500 flex items-center justify-center text-white font-bold">
                        {formData.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-200">{formData.displayName}</div>
                    <div className="text-sm text-gray-400">Community Member</div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3 pt-4 border-t border-cyber-500/20">
              <button
                type="button"
                onClick={handleSkip}
                className="flex-1 px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
                disabled={creating || isLoading}
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={!formData.displayName.trim() || creating || isLoading || uploadingImage}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyber-600 to-electric-600 hover:from-cyber-700 hover:to-electric-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {creating || isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </span>
                ) : (
                  'Create Profile'
                )}
              </button>
            </div>
          </form>

          {/* Note */}
          <div className="mt-4 p-3 bg-cyber-900/20 border border-cyber-500/30 rounded-lg">
            <div className="text-sm text-cyber-300">
              <strong>Note:</strong> Your profile is stored on the Solana blockchain. 
              You can update it later in your settings.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
