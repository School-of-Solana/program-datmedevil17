'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useRouter } from 'next/navigation'
import { 
  getProvider, 
  getProviderReadonly, 
  fetchAllCommunities,
  createCommunity,
  joinCommunity,
  leaveCommunity,
  fetchUserMemberships,
  fetchProfile
} from '@/services'

interface Community {
  publicKey: PublicKey
  account: {
    name: string
    descriptionUri: string
    creator: PublicKey
    communityId: any // BN
    memberCount: any // BN
    postCounter: any // BN
    pollCounter: any // BN
    createdAt: any // BN
  }
}

interface CommunityWithMetadata extends Community {
  creatorProfile?: any
  isMember?: boolean
}

export default function Communities() {
  const { publicKey, signTransaction, sendTransaction } = useWallet()
  const router = useRouter()
  
  // State
  const [communities, setCommunities] = useState<CommunityWithMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'alphabetical'>('popular')
  const [userMemberships, setUserMemberships] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())

  // Create community modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCommunityName, setNewCommunityName] = useState('')
  const [newCommunityDescription, setNewCommunityDescription] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  // Get program instances
  const readonlyProgram = useMemo(() => getProviderReadonly(), [])
  const program = useMemo(() => {
    if (publicKey && signTransaction && sendTransaction) {
      return getProvider(publicKey, signTransaction, sendTransaction)
    }
    return null
  }, [publicKey, signTransaction, sendTransaction])

  // Fetch user's memberships
  const fetchUserData = async () => {
    if (!publicKey || !readonlyProgram) return

    try {
      const memberships = await fetchUserMemberships(readonlyProgram, publicKey)
      setUserMemberships(new Set(
        memberships.map(m => m.account.community.toString())
      ))
    } catch (err) {
      console.warn('Failed to fetch user memberships:', err)
    }
  }

  // Fetch all communities with metadata
  const fetchCommunities = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!readonlyProgram) return

      const allCommunities = await fetchAllCommunities(readonlyProgram)
      
      // Enhance communities with metadata
      const enhancedCommunities: CommunityWithMetadata[] = await Promise.all(
        allCommunities.map(async (community) => {
          const enhanced: CommunityWithMetadata = { ...community }

          // Fetch creator profile
          try {
            enhanced.creatorProfile = await fetchProfile(readonlyProgram, community.account.creator)
          } catch (err) {
            console.warn('Failed to fetch creator profile:', err)
          }

          // Check if current user is member
          if (publicKey) {
            enhanced.isMember = userMemberships.has(community.publicKey.toString())
          }

          return enhanced
        })
      )

      setCommunities(enhancedCommunities)
    } catch (err) {
      console.error('Error fetching communities:', err)
      setError('Failed to load communities')
    } finally {
      setLoading(false)
    }
  }

  // Handle create community
  const handleCreateCommunity = async () => {
    if (!program || !publicKey || !newCommunityName.trim() || !newCommunityDescription.trim()) {
      return
    }

    try {
      setCreateLoading(true)
      
      // Generate a random community ID (in production, you'd want a more sophisticated approach)
      const communityId = Math.floor(Math.random() * 1000000)
      
      await createCommunity(
        program,
        publicKey,
        newCommunityName.trim(),
        newCommunityDescription.trim(),
        communityId
      )

      // Reset form
      setNewCommunityName('')
      setNewCommunityDescription('')
      setShowCreateModal(false)

      // Refresh communities list
      await fetchCommunities()
      await fetchUserData()
    } catch (err) {
      console.error('Error creating community:', err)
      setError('Failed to create community')
    } finally {
      setCreateLoading(false)
    }
  }

  // Handle join/leave community
  const handleCommunityAction = async (community: CommunityWithMetadata) => {
    if (!program || !publicKey) return

    const communityKey = community.publicKey.toString()
    const isMember = userMemberships.has(communityKey)

    setActionLoading(prev => new Set(prev).add(communityKey))

    try {
      if (isMember) {
        await leaveCommunity(program, publicKey, community.publicKey)
        setUserMemberships(prev => {
          const newSet = new Set(prev)
          newSet.delete(communityKey)
          return newSet
        })
        
        // Update member count locally
        setCommunities(prev => prev.map(c => 
          c.publicKey.equals(community.publicKey)
            ? {
                ...c,
                isMember: false,
                account: {
                  ...c.account,
                  memberCount: {
                    toNumber: () => Math.max(0, c.account.memberCount.toNumber() - 1)
                  }
                }
              }
            : c
        ))
      } else {
        await joinCommunity(program, publicKey, community.publicKey)
        setUserMemberships(prev => new Set(prev).add(communityKey))
        
        // Update member count locally
        setCommunities(prev => prev.map(c => 
          c.publicKey.equals(community.publicKey)
            ? {
                ...c,
                isMember: true,
                account: {
                  ...c.account,
                  memberCount: {
                    toNumber: () => c.account.memberCount.toNumber() + 1
                  }
                }
              }
            : c
        ))
      }
    } catch (err) {
      console.error('Error with community action:', err)
      setError('Failed to join/leave community')
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(communityKey)
        return newSet
      })
    }
  }

  // Navigate to community detail
  const navigateToCommunity = (communityId: string) => {
    router.push(`/community/${communityId}`)
  }

  // Filter and sort communities
  const filteredAndSortedCommunities = useMemo(() => {
    let filtered = communities.filter(community =>
      community.account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      community.account.descriptionUri.toLowerCase().includes(searchTerm.toLowerCase())
    )

    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => b.account.createdAt.toNumber() - a.account.createdAt.toNumber())
        break
      case 'popular':
        filtered.sort((a, b) => b.account.memberCount.toNumber() - a.account.memberCount.toNumber())
        break
      case 'alphabetical':
        filtered.sort((a, b) => a.account.name.localeCompare(b.account.name))
        break
    }

    return filtered
  }, [communities, searchTerm, sortBy])

  // Load data on mount and when user changes
  useEffect(() => {
    if (readonlyProgram) {
      fetchUserData().then(() => fetchCommunities())
    }
  }, [readonlyProgram, publicKey])

  if (loading && communities.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="flex justify-between items-center mb-6">
              <div className="h-8 bg-gray-200 rounded w-48"></div>
              <div className="h-10 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="flex space-x-4 mb-6">
              <div className="h-10 bg-gray-200 rounded flex-1"></div>
              <div className="h-10 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Communities</h1>
          {publicKey && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Community
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button 
              onClick={() => setError(null)}
              className="float-right text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Community Stats */}
        {!loading && communities.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{communities.length}</div>
                <div className="text-sm text-gray-600">Total Communities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {communities.reduce((sum, c) => sum + c.account.memberCount.toNumber(), 0)}
                </div>
                <div className="text-sm text-gray-600">Total Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {communities.reduce((sum, c) => sum + c.account.postCounter.toNumber(), 0)}
                </div>
                <div className="text-sm text-gray-600">Total Posts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{userMemberships.size}</div>
                <div className="text-sm text-gray-600">Your Communities</div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Sort Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search communities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="popular">Most Popular</option>
            <option value="newest">Newest</option>
            <option value="alphabetical">A-Z</option>
          </select>
        </div>

        {/* Communities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedCommunities.map((community) => (
            <div key={community.publicKey.toString()} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                      {community.account.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                      {community.account.descriptionUri}
                    </p>
                  </div>
                </div>

                {/* Community Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex space-x-4">
                    <span>{community.account.memberCount.toNumber()} members</span>
                    <span>{community.account.postCounter.toNumber()} posts</span>
                  </div>
                  {community.isMember && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      Joined
                    </span>
                  )}
                </div>

                {/* Creator Info */}
                <div className="flex items-center mb-4 text-sm text-gray-600">
                  <span>Created by </span>
                  <span className="font-medium ml-1">
                    {community.creatorProfile?.displayName || 
                     `${community.account.creator.toString().slice(0, 8)}...`}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => navigateToCommunity(community.publicKey.toString())}
                    className="flex-1 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    View
                  </button>
                  {publicKey && (
                    <button
                      onClick={() => handleCommunityAction(community)}
                      disabled={actionLoading.has(community.publicKey.toString())}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                        community.isMember
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {actionLoading.has(community.publicKey.toString()) 
                        ? 'Loading...' 
                        : community.isMember 
                          ? 'Leave' 
                          : 'Join'
                      }
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredAndSortedCommunities.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🏘️</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {searchTerm ? 'No communities found' : 'No communities yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Be the first to create a community!'
              }
            </p>
            {!searchTerm && publicKey && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Community
              </button>
            )}
          </div>
        )}

        {/* Create Community Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Create Community</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Community Name
                    </label>
                    <input
                      type="text"
                      value={newCommunityName}
                      onChange={(e) => setNewCommunityName(e.target.value)}
                      placeholder="Enter community name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={50}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newCommunityDescription}
                      onChange={(e) => setNewCommunityDescription(e.target.value)}
                      placeholder="Describe your community"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      maxLength={200}
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateCommunity}
                      disabled={!newCommunityName.trim() || !newCommunityDescription.trim() || createLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {createLoading ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}