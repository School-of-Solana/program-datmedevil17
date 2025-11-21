'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { 
  getProvider, 
  getProviderReadonly, 
  fetchProfile,
  fetchAllPosts,
  fetchUserMemberships,
  fetchUserFollowers,
  fetchUserFollowing,
  followUser,
  unfollowUser,
  checkIfFollowing,
  fetchCommunity
} from '@/services'

interface Profile {
  owner: PublicKey
  displayName: string
  avatarUri: string
  followerCount: any
  followingCount: any
  createdAt: any
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

interface PostWithMetadata extends Post {
  communityInfo?: any
}

interface Membership {
  publicKey: PublicKey
  account: {
    user: PublicKey
    community: PublicKey
    joinedAt: any
  }
}

interface MembershipWithMetadata extends Membership {
  communityInfo?: any
}

interface Follow {
  publicKey: PublicKey
  account: {
    follower: PublicKey
    followed: PublicKey
    followedAt: any
  }
}

interface FollowWithMetadata extends Follow {
  profile?: Profile | null
}

type TabType = 'posts' | 'communities' | 'followers' | 'following'

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { publicKey, signTransaction, sendTransaction } = useWallet()
  
  const userAddress = params.userAddress as string
  
  // State
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<PostWithMetadata[]>([])
  const [memberships, setMemberships] = useState<MembershipWithMetadata[]>([])
  const [followers, setFollowers] = useState<FollowWithMetadata[]>([])
  const [following, setFollowing] = useState<FollowWithMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [tabLoading, setTabLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('posts')
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  // Check if this is the current user's profile
  const isOwnProfile = useMemo(() => {
    return publicKey && publicKey.toString() === userAddress
  }, [publicKey, userAddress])

  // Program instances
  const readonlyProgram = useMemo(() => getProviderReadonly(), [])
  const program = useMemo(() => {
    if (publicKey && signTransaction && sendTransaction) {
      return getProvider(publicKey, signTransaction, sendTransaction)
    }
    return null
  }, [publicKey, signTransaction, sendTransaction])

  // Fetch profile data
  const fetchProfileData = async () => {
    try {
      if (!readonlyProgram) return

      const userPubkey = new PublicKey(userAddress)
      const profileData = await fetchProfile(readonlyProgram, userPubkey)
      
      if (profileData) {
        setProfile(profileData)
      }

      // Check if current user is following this profile
      if (publicKey && !isOwnProfile) {
        try {
          const isFollowingResult = await checkIfFollowing(readonlyProgram, publicKey, userPubkey)
          setIsFollowing(isFollowingResult)
        } catch (err) {
          setIsFollowing(false)
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Failed to load profile')
    }
  }

  // Fetch posts
  const fetchUserPosts = async () => {
    try {
      setTabLoading(true)
      if (!readonlyProgram) return

      const userPubkey = new PublicKey(userAddress)
      const allPosts = await fetchAllPosts(readonlyProgram)
      
      // Filter posts by author
      const userPosts = allPosts.filter(post => 
        post.account.author && post.account.author.equals(userPubkey)
      )

      // Enhance with community info
      const enhancedPosts: PostWithMetadata[] = await Promise.all(
        userPosts.map(async (post) => {
          const enhanced: PostWithMetadata = { ...post }
          try {
            enhanced.communityInfo = await fetchCommunity(readonlyProgram, post.account.community)
          } catch (err) {
            console.warn('Failed to fetch community info:', err)
          }
          return enhanced
        })
      )

      // Sort by creation date (newest first)
      enhancedPosts.sort((a, b) => b.account.createdAt.toNumber() - a.account.createdAt.toNumber())
      setPosts(enhancedPosts)
    } catch (err) {
      console.error('Error fetching user posts:', err)
    } finally {
      setTabLoading(false)
    }
  }

  // Fetch memberships
  const fetchMemberships = async () => {
    try {
      setTabLoading(true)
      if (!readonlyProgram) return

      const userPubkey = new PublicKey(userAddress)
      const membershipsData = await fetchUserMemberships(readonlyProgram, userPubkey)
      
      // Enhance with community info
      const enhancedMemberships: MembershipWithMetadata[] = await Promise.all(
        membershipsData.map(async (membership) => {
          const enhanced: MembershipWithMetadata = { ...membership }
          try {
            enhanced.communityInfo = await fetchCommunity(readonlyProgram, membership.account.community)
          } catch (err) {
            console.warn('Failed to fetch community info:', err)
          }
          return enhanced
        })
      )

      // Sort by join date (newest first)
      enhancedMemberships.sort((a, b) => b.account.joinedAt.toNumber() - a.account.joinedAt.toNumber())
      setMemberships(enhancedMemberships)
    } catch (err) {
      console.error('Error fetching memberships:', err)
    } finally {
      setTabLoading(false)
    }
  }

  // Fetch followers
  const fetchFollowersData = async () => {
    try {
      setTabLoading(true)
      if (!readonlyProgram) return

      const userPubkey = new PublicKey(userAddress)
      const followersData = await fetchUserFollowers(readonlyProgram, userPubkey)
      
      // Enhance with follower profile info
      const enhancedFollowers: FollowWithMetadata[] = await Promise.all(
        followersData.map(async (follow) => {
          const enhanced: FollowWithMetadata = { ...follow }
          try {
            enhanced.profile = await fetchProfile(readonlyProgram, follow.account.follower)
          } catch (err) {
            console.warn('Failed to fetch follower profile:', err)
          }
          return enhanced
        })
      )

      // Sort by follow date (newest first)
      enhancedFollowers.sort((a, b) => b.account.followedAt.toNumber() - a.account.followedAt.toNumber())
      setFollowers(enhancedFollowers)
    } catch (err) {
      console.error('Error fetching followers:', err)
    } finally {
      setTabLoading(false)
    }
  }

  // Fetch following
  const fetchFollowingData = async () => {
    try {
      setTabLoading(true)
      if (!readonlyProgram) return

      const userPubkey = new PublicKey(userAddress)
      const followingData = await fetchUserFollowing(readonlyProgram, userPubkey)
      
      // Enhance with followed profile info
      const enhancedFollowing: FollowWithMetadata[] = await Promise.all(
        followingData.map(async (follow) => {
          const enhanced: FollowWithMetadata = { ...follow }
          try {
            enhanced.profile = await fetchProfile(readonlyProgram, follow.account.followed)
          } catch (err) {
            console.warn('Failed to fetch followed profile:', err)
          }
          return enhanced
        })
      )

      // Sort by follow date (newest first)
      enhancedFollowing.sort((a, b) => b.account.followedAt.toNumber() - a.account.followedAt.toNumber())
      setFollowing(enhancedFollowing)
    } catch (err) {
      console.error('Error fetching following:', err)
    } finally {
      setTabLoading(false)
    }
  }

  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    if (!program || !publicKey || isOwnProfile) return

    setFollowLoading(true)

    try {
      const userPubkey = new PublicKey(userAddress)
      
      if (isFollowing) {
        await unfollowUser(program, publicKey, userPubkey)
      } else {
        await followUser(program, publicKey, userPubkey)
      }

      // Update local state
      setIsFollowing(!isFollowing)
      
      // Update follower count in profile
      if (profile) {
        setProfile({
          ...profile,
          followerCount: {
            toNumber: () => isFollowing 
              ? profile.followerCount.toNumber() - 1 
              : profile.followerCount.toNumber() + 1
          }
        })
      }

      // Refresh followers if viewing followers tab
      if (activeTab === 'followers') {
        await fetchFollowersData()
      }
    } catch (err) {
      console.error('Error toggling follow:', err)
      alert('Failed to follow/unfollow user')
    } finally {
      setFollowLoading(false)
    }
  }

  // Load tab data based on active tab
  useEffect(() => {
    if (!readonlyProgram) return

    switch (activeTab) {
      case 'posts':
        fetchUserPosts()
        break
      case 'communities':
        fetchMemberships()
        break
      case 'followers':
        fetchFollowersData()
        break
      case 'following':
        fetchFollowingData()
        break
    }
  }, [activeTab, readonlyProgram, userAddress])

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        await fetchProfileData()
        await fetchUserPosts() // Load posts by default
      } catch (err) {
        console.error('Error loading profile data:', err)
      } finally {
        setLoading(false)
      }
    }

    if (readonlyProgram && userAddress) {
      loadData()
    }
  }, [readonlyProgram, userAddress, publicKey])

  // Navigation functions
  const navigateToPost = (postId: string) => {
    router.push(`/post/${postId}`)
  }

  const navigateToCommunity = (communityId: string) => {
    router.push(`/community/${communityId}`)
  }

  const navigateToProfile = (userAddress: string) => {
    router.push(`/profile/${userAddress}`)
  }

  const navigateToSettings = () => {
    router.push('/settings/profile')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            {/* Profile Header Skeleton */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center mb-4">
                <div className="w-20 h-20 bg-gray-200 rounded-full mr-4"></div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="flex space-x-4">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-10 bg-gray-200 rounded w-24"></div>
              </div>
            </div>

            {/* Tabs Skeleton */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex space-x-6 mb-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 bg-gray-200 rounded w-20"></div>
                ))}
              </div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile not found</h1>
          <p className="text-gray-600 mb-4">This user doesn't have a profile or the address is invalid.</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        {/* Back Navigation */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          ← Back
        </button>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
            <button 
              onClick={() => setError(null)}
              className="float-right text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Avatar */}
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mr-4">
                {profile.displayName?.charAt(0) || '?'}
              </div>
              
              {/* Profile Info */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {profile.displayName || 'Unknown User'}
                </h1>
                <p className="text-gray-600 text-sm mb-3">
                  {userAddress.slice(0, 8)}...{userAddress.slice(-8)}
                </p>
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div>
                    <span className="font-semibold text-gray-900">
                      {profile.followerCount.toNumber()}
                    </span> Followers
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">
                      {profile.followingCount.toNumber()}
                    </span> Following
                  </div>
                  <div>
                    Joined {new Date(profile.createdAt.toNumber() * 1000).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {isOwnProfile ? (
                <button
                  onClick={navigateToSettings}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Edit Profile
                </button>
              ) : publicKey ? (
                <button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    isFollowing
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {followLoading ? 'Loading...' : (isFollowing ? 'Unfollow' : 'Follow')}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Profile Tabs */}
        <div className="bg-white rounded-lg shadow-md">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'posts', label: 'Posts', count: posts.length },
                { key: 'communities', label: 'Communities', count: memberships.length },
                { key: 'followers', label: 'Followers', count: profile.followerCount.toNumber() },
                { key: 'following', label: 'Following', count: profile.followingCount.toNumber() }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as TabType)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {tabLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Posts Tab */}
                {activeTab === 'posts' && (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <div key={post.publicKey.toString()} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <button
                            onClick={() => navigateToCommunity(post.account.community.toString())}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                          >
                            {post.communityInfo?.name || 'Community'}
                          </button>
                          <span className="text-sm text-gray-500">
                            {new Date(post.account.createdAt.toNumber() * 1000).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => navigateToPost(post.publicKey.toString())}
                          className="block w-full text-left"
                        >
                          <p className="text-gray-800 mb-3 line-clamp-3 hover:text-blue-600 transition-colors">
                            {post.account.contentUri}
                          </p>
                        </button>

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>❤️ {post.account.likesCount.toNumber()}</span>
                          <span>💬 {post.account.commentsCount.toNumber()}</span>
                          <span>💰 {(post.account.totalTipLamports.toNumber() / 1000000000).toFixed(4)} SOL</span>
                        </div>
                      </div>
                    ))}

                    {posts.length === 0 && (
                      <div className="text-center py-12">
                        <div className="text-gray-400 text-4xl mb-3">📝</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
                        <p className="text-gray-600">
                          {isOwnProfile 
                            ? "You haven't created any posts yet."
                            : "This user hasn't posted anything yet."
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Communities Tab */}
                {activeTab === 'communities' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {memberships.map((membership) => (
                      <button
                        key={membership.publicKey.toString()}
                        onClick={() => navigateToCommunity(membership.account.community.toString())}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all text-left"
                      >
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {membership.communityInfo?.name || 'Community'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {membership.communityInfo?.descriptionUri || 'No description available'}
                        </p>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{membership.communityInfo?.memberCount?.toNumber() || 0} members</span>
                          <span>Joined {new Date(membership.account.joinedAt.toNumber() * 1000).toLocaleDateString()}</span>
                        </div>
                      </button>
                    ))}

                    {memberships.length === 0 && (
                      <div className="col-span-full text-center py-12">
                        <div className="text-gray-400 text-4xl mb-3">🏘️</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No communities joined</h3>
                        <p className="text-gray-600">
                          {isOwnProfile 
                            ? "You haven't joined any communities yet."
                            : "This user hasn't joined any communities yet."
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Followers Tab */}
                {activeTab === 'followers' && (
                  <div className="space-y-3">
                    {followers.map((follower) => (
                      <div key={follower.publicKey.toString()} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                        <button
                          onClick={() => navigateToProfile(follower.account.follower.toString())}
                          className="flex items-center flex-1"
                        >
                          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                            {follower.profile?.displayName?.charAt(0) || '?'}
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-gray-900">
                              {follower.profile?.displayName || 'Unknown User'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {follower.account.follower.toString().slice(0, 8)}...{follower.account.follower.toString().slice(-8)}
                            </div>
                          </div>
                        </button>
                        <span className="text-sm text-gray-500">
                          {new Date(follower.account.followedAt.toNumber() * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    ))}

                    {followers.length === 0 && (
                      <div className="text-center py-12">
                        <div className="text-gray-400 text-4xl mb-3">👥</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No followers yet</h3>
                        <p className="text-gray-600">
                          {isOwnProfile 
                            ? "You don't have any followers yet."
                            : "This user doesn't have any followers yet."
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Following Tab */}
                {activeTab === 'following' && (
                  <div className="space-y-3">
                    {following.map((follow) => (
                      <div key={follow.publicKey.toString()} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                        <button
                          onClick={() => navigateToProfile(follow.account.followed.toString())}
                          className="flex items-center flex-1"
                        >
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                            {follow.profile?.displayName?.charAt(0) || '?'}
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-gray-900">
                              {follow.profile?.displayName || 'Unknown User'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {follow.account.followed.toString().slice(0, 8)}...{follow.account.followed.toString().slice(-8)}
                            </div>
                          </div>
                        </button>
                        <span className="text-sm text-gray-500">
                          {new Date(follow.account.followedAt.toNumber() * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    ))}

                    {following.length === 0 && (
                      <div className="text-center py-12">
                        <div className="text-gray-400 text-4xl mb-3">👤</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Not following anyone</h3>
                        <p className="text-gray-600">
                          {isOwnProfile 
                            ? "You're not following anyone yet."
                            : "This user isn't following anyone yet."
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
