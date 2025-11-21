'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useRouter } from 'next/navigation'
import { 
  getProvider, 
  getProviderReadonly, 
  fetchAllCommunities,
  fetchAllPosts,
  fetchProfile,
  followUser,
  unfollowUser,
  joinCommunity,
  checkIfFollowing,
  checkIfMember,
  fetchUserFollowing,
  fetchUserMemberships
} from '@/services'
import { BN } from '@coral-xyz/anchor'

interface Community {
  publicKey: PublicKey
  account: {
    name: string
    descriptionUri: string
    creator: PublicKey
    communityId: BN
    memberCount: BN
    postCounter:  BN
    pollCounter:  BN
    createdAt: BN
  }
}

interface Post {
  publicKey: PublicKey
  account: {
    postId: any
    author: PublicKey | null
    community: PublicKey
    contentUri: string
    contentHash: number[]
    likesCount: any
    commentsCount: any
    totalTipLamports: any
    createdAt: any
    pseudonym: string | null
  }
}

interface Profile {
  publicKey: PublicKey
  account: {
    owner: PublicKey
    displayName: string
    avatarUri: string
    followerCount: any // BN
    followingCount: any // BN
    createdAt: any // BN
  }
}

export default function Explore() {
  const { publicKey, signTransaction, sendTransaction } = useWallet()
  const router = useRouter()
  
  // State
  const [communities, setCommunities] = useState<Community[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'communities' | 'posts' | 'users' | 'polls'>('communities')
  
  // User interaction states
  const [userMemberships, setUserMemberships] = useState<Set<string>>(new Set())
  const [userFollowing, setUserFollowing] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())

  // Get program instances
  const readonlyProgram = useMemo(() => getProviderReadonly(), [])
  const program = useMemo(() => {
    if (publicKey && signTransaction && sendTransaction) {
      return getProvider(publicKey, signTransaction, sendTransaction)
    }
    return null
  }, [publicKey, signTransaction, sendTransaction])

  // Fetch user's current memberships and following
  const fetchUserData = async () => {
    if (!publicKey || !readonlyProgram) return

    try {
      const [memberships, following] = await Promise.all([
        fetchUserMemberships(readonlyProgram, publicKey),
        fetchUserFollowing(readonlyProgram, publicKey)
      ])

      setUserMemberships(new Set(
        memberships.map(m => m.account.community.toString())
      ))
      setUserFollowing(new Set(
        following.map(f => f.account.followed.toString())
      ))
    } catch (err) {
      console.warn('Failed to fetch user data:', err)
    }
  }

  // Fetch trending communities
  const fetchCommunities = async () => {
    try {
      if (!readonlyProgram) return

      const allCommunities = await fetchAllCommunities(readonlyProgram)
      
      // Sort by member count (trending)
      const sortedCommunities = allCommunities.sort(
        (a, b) => b.account.memberCount.toNumber() - a.account.memberCount.toNumber()
      )

      setCommunities(sortedCommunities.slice(0, 10)) // Top 10
    } catch (err) {
      console.error('Error fetching communities:', err)
    }
  }

  // Fetch popular posts
  const fetchPopularPosts = async () => {
    try {
      if (!readonlyProgram) return

      const allPosts = await fetchAllPosts(readonlyProgram)
      
      // Sort by engagement (likes + comments + tips)
      const sortedPosts = allPosts.sort((a, b) => {
        const aEngagement = a.account.likesCount.toNumber() + 
                           a.account.commentsCount.toNumber() + 
                           a.account.totalTipLamports.toNumber()
        const bEngagement = b.account.likesCount.toNumber() + 
                           b.account.commentsCount.toNumber() + 
                           b.account.totalTipLamports.toNumber()
        return bEngagement - aEngagement
      })

      setPosts(sortedPosts.slice(0, 10)) // Top 10
    } catch (err) {
      console.error('Error fetching posts:', err)
    }
  }

  // Fetch suggested users (simplified - in production would use more sophisticated algorithm)
  const fetchSuggestedUsers = async () => {
    try {
      if (!readonlyProgram) return

      // Get all posts to find active authors
      const allPosts = await fetchAllPosts(readonlyProgram)
      const activeAuthors = new Map()

      // Count posts per author
      allPosts.forEach(post => {
        if (post.account.author) {
          const authorKey = post.account.author.toString()
          activeAuthors.set(authorKey, (activeAuthors.get(authorKey) || 0) + 1)
        }
      })

      // Get top authors
      const topAuthors = Array.from(activeAuthors.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([author]) => new PublicKey(author))

      // Fetch profiles for top authors
      const profilePromises = topAuthors.map(async (authorPubkey) => {
        try {
          const profile = await fetchProfile(readonlyProgram, authorPubkey)
          if (profile) {
            return {
              publicKey: authorPubkey,
              account: profile
            }
          }
        } catch (err) {
          return null
        }
      })

      const profileResults = await Promise.all(profilePromises)
      const validProfiles = profileResults.filter(p => p !== null) as Profile[]
      
      setProfiles(validProfiles)
    } catch (err) {
      console.error('Error fetching suggested users:', err)
    }
  }

  // Handle join/leave community
  const handleCommunityAction = async (community: Community) => {
    if (!program || !publicKey) return

    const communityKey = community.publicKey.toString()
    const isMember = userMemberships.has(communityKey)

    setActionLoading(prev => new Set(prev).add(communityKey))

    try {
      if (isMember) {
        // Leave community functionality would go here
        // Note: leaveCommunity function exists but wasn't used in this context
        console.log('Leave community not implemented in this demo')
      } else {
        await joinCommunity(program, publicKey, community.publicKey)
        setUserMemberships(prev => new Set(prev).add(communityKey))
        
        // Update member count locally
        setCommunities(prev => prev.map(c => 
          c.publicKey.equals(community.publicKey)
            ? {
                ...c,
                account: {
                  ...c.account,
                  memberCount: c.account.memberCount.add(new BN(1))
                }
              }
            : c
        ))
      }
    } catch (err) {
      console.error('Error with community action:', err)
      setError('Failed to join community')
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(communityKey)
        return newSet
      })
    }
  }

  // Handle follow/unfollow user
  const handleFollowAction = async (profile: Profile) => {
    if (!program || !publicKey) return

    const profileKey = profile.publicKey.toString()
    const isFollowing = userFollowing.has(profileKey)

    setActionLoading(prev => new Set(prev).add(profileKey))

    try {
      if (isFollowing) {
        await unfollowUser(program, publicKey, profile.publicKey)
        setUserFollowing(prev => {
          const newSet = new Set(prev)
          newSet.delete(profileKey)
          return newSet
        })
      } else {
        await followUser(program, publicKey, profile.publicKey)
        setUserFollowing(prev => new Set(prev).add(profileKey))
      }
    } catch (err) {
      console.error('Error with follow action:', err)
      setError('Failed to follow/unfollow user')
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(profileKey)
        return newSet
      })
    }
  }

  // Navigation functions
  const navigateToCommunity = (communityId: string) => {
    router.push(`/community/${communityId}`)
  }

  const navigateToPost = (postId: string) => {
    router.push(`/post/${postId}`)
  }

  const navigateToProfile = (userAddress: string) => {
    router.push(`/profile/${userAddress}`)
  }

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        await Promise.all([
          fetchCommunities(),
          fetchPopularPosts(),
          fetchSuggestedUsers(),
          fetchUserData()
        ])
      } catch (err) {
        console.error('Error loading explore data:', err)
        setError('Failed to load content')
      } finally {
        setLoading(false)
      }
    }

    if (readonlyProgram) {
      loadData()
    }
  }, [readonlyProgram, publicKey])

  // Add refresh functionality
  const refreshData = async () => {
    await Promise.all([
      fetchCommunities(),
      fetchPopularPosts(),
      fetchSuggestedUsers(),
      fetchUserData()
    ])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
            <div className="flex space-x-4 mb-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded w-24"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Explore</h1>
          <button
            onClick={refreshData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-4 mb-6 border-b">
          {[
            { key: 'communities', label: 'Communities' },
            { key: 'posts', label: 'Popular Posts' },
            { key: 'users', label: 'Suggested Users' },
            { key: 'polls', label: 'Active Polls' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`py-2 px-4 border-b-2 font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Communities Tab */}
        {activeTab === 'communities' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {communities.map((community) => (
              <div key={community.publicKey.toString()} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {community.account.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {community.account.descriptionUri}
                    </p>
                    <div className="flex space-x-4 text-sm text-gray-500">
                      <span>{community.account.memberCount.toNumber()} members</span>
                      <span>{community.account.postCounter.toNumber()} posts</span>
                    </div>
                  </div>
                </div>

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
                        userMemberships.has(community.publicKey.toString())
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {actionLoading.has(community.publicKey.toString()) 
                        ? 'Loading...' 
                        : userMemberships.has(community.publicKey.toString()) 
                          ? 'Joined' 
                          : 'Join'
                      }
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <div key={post.publicKey.toString()} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                    {post.account.author === null
                      ? (post.account.pseudonym?.charAt(0) || 'A')
                      : '?'
                    }
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      {post.account.author === null
                        ? (post.account.pseudonym || 'Anonymous')
                        : 'User'
                      }
                    </span>
                    <p className="text-sm text-gray-500">
                      {new Date(post.account.createdAt.toNumber() * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <p className="text-gray-800 mb-4 line-clamp-3">
                  {post.account.contentUri}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex space-x-4">
                    <span>❤️ {post.account.likesCount.toNumber()}</span>
                    <span>💬 {post.account.commentsCount.toNumber()}</span>
                    <span>💰 {(post.account.totalTipLamports.toNumber() / 1000000000).toFixed(2)} SOL</span>
                  </div>
                </div>

                <button
                  onClick={() => navigateToPost(post.publicKey.toString())}
                  className="w-full px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  View Post
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile) => (
              <div key={profile.publicKey.toString()} className="bg-white rounded-lg shadow-md p-6">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                    {profile.account.displayName?.charAt(0) || '?'}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {profile.account.displayName || 'Unknown User'}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {profile.publicKey.toString().slice(0, 8)}...{profile.publicKey.toString().slice(-8)}
                  </p>
                  <div className="flex justify-center space-x-4 text-sm text-gray-600">
                    <span>{profile.account.followerCount.toNumber()} followers</span>
                    <span>{profile.account.followingCount.toNumber()} following</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => navigateToProfile(profile.publicKey.toString())}
                    className="flex-1 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    View Profile
                  </button>
                  {publicKey && !profile.publicKey.equals(publicKey) && (
                    <button
                      onClick={() => handleFollowAction(profile)}
                      disabled={actionLoading.has(profile.publicKey.toString())}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                        userFollowing.has(profile.publicKey.toString())
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {actionLoading.has(profile.publicKey.toString()) 
                        ? 'Loading...' 
                        : userFollowing.has(profile.publicKey.toString()) 
                          ? 'Following' 
                          : 'Follow'
                      }
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty States */}
        {activeTab === 'communities' && communities.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No communities found</p>
          </div>
        )}

        {activeTab === 'posts' && posts.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No popular posts found</p>
          </div>
        )}

        {activeTab === 'users' && profiles.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No suggested users found</p>
          </div>
        )}

        {/* Polls Tab */}
        {activeTab === 'polls' && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🗳️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Discover Active Polls</h3>
            <p className="text-gray-600 mb-6">
              Participate in community polls and make your voice heard
            </p>
            <button
              onClick={() => router.push('/polls')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              View All Polls
            </button>
          </div>
        )}
      </div>
    </div>
  )
}