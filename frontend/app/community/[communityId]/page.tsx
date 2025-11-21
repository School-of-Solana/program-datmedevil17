'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { 
  getProvider, 
  getProviderReadonly, 
  fetchCommunity,
  fetchProfile,
  joinCommunity,
  leaveCommunity,
  fetchCommunityPosts,
  fetchCommunityPolls,
  fetchCommunityMembers,
  createPost,
  likePost,
  unlikePost,
  tipPost,
  commentOnPost,
  createPoll,
  votePoll,
  checkIfMember,
  checkIfLiked,
  followUser,
  unfollowUser,
  checkIfFollowing
} from '@/services'

interface Community {
  account: {
    name: string
    descriptionUri: string
    creator: PublicKey
    communityId: any
    memberCount: any
    postCounter: any
    pollCounter: any
    createdAt: any
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

interface Poll {
  publicKey: PublicKey
  account: {
    community: PublicKey
    pollId: any // BN
    questionUri: string
    optionProfiles: PublicKey[]
    votesPerOption: number[]
    createdBy: PublicKey
    endTime: any // BN
    createdAt: any // BN
  }
}

interface Member {
  publicKey: PublicKey
  account: {
    community: PublicKey
    user: PublicKey
    joinedAt: any // BN
  }
}

interface PostWithMetadata extends Post {
  authorProfile?: any
  isLiked?: boolean
}

interface MemberWithProfile extends Member {
  profile?: any
  isFollowing?: boolean
}

type TabType = 'overview' | 'posts' | 'polls' | 'members'

export default function CommunityDetail() {
  const params = useParams()
  const router = useRouter()
  const { publicKey, signTransaction, sendTransaction } = useWallet()
  
  const communityId = params.communityId as string
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  
  // Community data
  const [community, setCommunity] = useState<Community | null>(null)
  const [creatorProfile, setCreatorProfile] = useState<any>(null)
  const [isMember, setIsMember] = useState(false)
  
  // Posts data
  const [posts, setPosts] = useState<PostWithMetadata[]>([])
  const [newPostContent, setNewPostContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [pseudonym, setPseudonym] = useState('')
  
  // Polls data
  const [polls, setPolls] = useState<Poll[]>([])
  const [showCreatePoll, setShowCreatePoll] = useState(false)
  const [newPollQuestion, setNewPollQuestion] = useState('')
  const [newPollOptions, setNewPollOptions] = useState(['', ''])
  
  // Members data
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  
  // Loading states
  const [loading, setLoading] = useState(true)
  const [postLoading, setPostLoading] = useState(false)
  const [pollLoading, setPollLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // Program instances
  const readonlyProgram = useMemo(() => getProviderReadonly(), [])
  const program = useMemo(() => {
    if (publicKey && signTransaction && sendTransaction) {
      return getProvider(publicKey, signTransaction, sendTransaction)
    }
    return null
  }, [publicKey, signTransaction, sendTransaction])

  // Fetch community data
  const fetchCommunityData = async () => {
    try {
      if (!readonlyProgram) return

      const communityPubkey = new PublicKey(communityId)
      const communityData = await fetchCommunity(readonlyProgram, communityPubkey)
      
      if (communityData) {
        setCommunity({ account: communityData })
        
        // Fetch creator profile
        try {
          const profile = await fetchProfile(readonlyProgram, communityData.creator)
          setCreatorProfile(profile)
        } catch (err) {
          console.warn('Failed to fetch creator profile:', err)
        }

        // Check if user is member
        if (publicKey) {
          const memberStatus = await checkIfMember(readonlyProgram, publicKey, communityPubkey)
          setIsMember(memberStatus)
        }
      }
    } catch (err) {
      console.error('Error fetching community:', err)
      setError('Failed to load community')
    }
  }

  // Fetch community posts
  const fetchPosts = async () => {
    try {
      if (!readonlyProgram) return

      const communityPubkey = new PublicKey(communityId)
      const postsData = await fetchCommunityPosts(readonlyProgram, communityPubkey)
      
      // Enhance posts with metadata
      const enhancedPosts: PostWithMetadata[] = await Promise.all(
        postsData.map(async (post) => {
          const enhanced: PostWithMetadata = { ...post }

          // Fetch author profile if not anonymous
          if (post.account.author) {
            try {
              enhanced.authorProfile = await fetchProfile(readonlyProgram, post.account.author)
            } catch (err) {
              console.warn('Failed to fetch author profile:', err)
            }
          }

          // Check if current user liked this post
          if (publicKey) {
            try {
              enhanced.isLiked = await checkIfLiked(readonlyProgram, publicKey, post.publicKey)
            } catch (err) {
              enhanced.isLiked = false
            }
          }

          return enhanced
        })
      )

      // Sort by creation date (newest first)
      enhancedPosts.sort((a, b) => b.account.createdAt.toNumber() - a.account.createdAt.toNumber())
      setPosts(enhancedPosts)
    } catch (err) {
      console.error('Error fetching posts:', err)
    }
  }

  // Fetch community polls
  const fetchPolls = async () => {
    try {
      if (!readonlyProgram) return

      const communityPubkey = new PublicKey(communityId)
      const pollsData = await fetchCommunityPolls(readonlyProgram, communityPubkey)
      
      // Sort by creation date (newest first)
      pollsData.sort((a, b) => b.account.createdAt.toNumber() - a.account.createdAt.toNumber())
      setPolls(pollsData)
    } catch (err) {
      console.error('Error fetching polls:', err)
    }
  }

  // Fetch community members
  const fetchMembers = async () => {
    try {
      if (!readonlyProgram) return

      const communityPubkey = new PublicKey(communityId)
      const membersData = await fetchCommunityMembers(readonlyProgram, communityPubkey)
      
      // Enhance members with profiles
      const enhancedMembers: MemberWithProfile[] = await Promise.all(
        membersData.map(async (member) => {
          const enhanced: MemberWithProfile = { ...member }

          try {
            enhanced.profile = await fetchProfile(readonlyProgram, member.account.user)
          } catch (err) {
            console.warn('Failed to fetch member profile:', err)
          }

          // Check if current user is following this member
          if (publicKey && !member.account.user.equals(publicKey)) {
            try {
              enhanced.isFollowing = await checkIfFollowing(readonlyProgram, publicKey, member.account.user)
            } catch (err) {
              enhanced.isFollowing = false
            }
          }

          return enhanced
        })
      )

      setMembers(enhancedMembers)
    } catch (err) {
      console.error('Error fetching members:', err)
    }
  }

  // Handle join/leave community
  const handleCommunityAction = async () => {
    if (!program || !publicKey) return

    setActionLoading(prev => new Set(prev).add('community'))

    try {
      const communityPubkey = new PublicKey(communityId)
      
      if (isMember) {
        await leaveCommunity(program, publicKey, communityPubkey)
        setIsMember(false)
        
        // Update member count
        if (community) {
          setCommunity({
            ...community,
            account: {
              ...community.account,
              memberCount: {
                toNumber: () => Math.max(0, community.account.memberCount.toNumber() - 1)
              }
            }
          })
        }
      } else {
        await joinCommunity(program, publicKey, communityPubkey)
        setIsMember(true)
        
        // Update member count
        if (community) {
          setCommunity({
            ...community,
            account: {
              ...community.account,
              memberCount: {
                toNumber: () => community.account.memberCount.toNumber() + 1
              }
            }
          })
        }
      }
    } catch (err) {
      console.error('Error with community action:', err)
      setError('Failed to join/leave community')
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete('community')
        return newSet
      })
    }
  }

  // Handle create post
  const handleCreatePost = async () => {
    if (!program || !publicKey || !newPostContent.trim()) return

    setPostLoading(true)

    try {
      const communityPubkey = new PublicKey(communityId)
      const contentHash = Array.from(new TextEncoder().encode(newPostContent))
      
      await createPost(
        program,
        publicKey,
        communityPubkey,
        newPostContent.trim(),
        contentHash,
        isAnonymous,
        isAnonymous ? pseudonym : undefined
      )

      // Reset form
      setNewPostContent('')
      setIsAnonymous(false)
      setPseudonym('')

      // Refresh posts
      await fetchPosts()
    } catch (err) {
      console.error('Error creating post:', err)
      setError('Failed to create post')
    } finally {
      setPostLoading(false)
    }
  }

  // Handle create poll
  const handleCreatePoll = async () => {
    if (!program || !publicKey || !newPollQuestion.trim()) return

    try {
      setPollLoading(true)
      const communityPubkey = new PublicKey(communityId)
      const validOptions = newPollOptions.filter(o => o.trim())
      
      // For now, using placeholder PublicKey for options (in production, these would be real option profiles)
      const optionProfiles = validOptions.map(() => PublicKey.default)
      const endTime = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days from now
      
      await createPoll(
        program,
        publicKey,
        communityPubkey,
        newPollQuestion.trim(),
        optionProfiles,
        endTime
      )
      
      setNewPollQuestion('')
      setNewPollOptions(['', ''])
      setShowCreatePoll(false)
      await fetchPolls()
    } catch (err) {
      console.error('Error creating poll:', err)
      setError('Failed to create poll')
    } finally {
      setPollLoading(false)
    }
  }

  // Handle like/unlike post
  const handleLikeToggle = async (post: PostWithMetadata) => {
    if (!program || !publicKey) return

    const postId = post.publicKey.toString()
    setActionLoading(prev => new Set(prev).add(postId))

    try {
      if (post.isLiked) {
        await unlikePost(program, publicKey, post.publicKey)
      } else {
        await likePost(program, publicKey, post.publicKey)
      }

      // Update local state
      setPosts(prev => prev.map(p => 
        p.publicKey.equals(post.publicKey) 
          ? { 
              ...p, 
              isLiked: !p.isLiked,
              account: {
                ...p.account,
                likesCount: {
                  toNumber: () => p.isLiked 
                    ? p.account.likesCount.toNumber() - 1 
                    : p.account.likesCount.toNumber() + 1
                }
              }
            }
          : p
      ))
    } catch (err) {
      console.error('Error toggling like:', err)
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(postId)
        return newSet
      })
    }
  }

  // Handle tip post
  const handleTipPost = async (post: PostWithMetadata, amount: number) => {
    if (!program || !publicKey || !post.account.author) return

    try {
      await tipPost(program, publicKey, post.publicKey, post.account.author, amount)
      alert(`Tipped ${amount / 1000000000} SOL successfully!`)
    } catch (err) {
      console.error('Error tipping post:', err)
      alert('Failed to tip post')
    }
  }

  // Handle follow/unfollow user
  const handleFollowToggle = async (member: MemberWithProfile) => {
    if (!program || !publicKey || member.account.user.equals(publicKey)) return

    const memberId = member.account.user.toString()
    setActionLoading(prev => new Set(prev).add(memberId))

    try {
      if (member.isFollowing) {
        await unfollowUser(program, publicKey, member.account.user)
      } else {
        await followUser(program, publicKey, member.account.user)
      }

      // Update local state
      setMembers(prev => prev.map(m => 
        m.account.user.equals(member.account.user) 
          ? { ...m, isFollowing: !m.isFollowing }
          : m
      ))
    } catch (err) {
      console.error('Error toggling follow:', err)
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(memberId)
        return newSet
      })
    }
  }

  // Navigation helpers for potential nested routes
  const navigateToPost = (postId: string) => {
    router.push(`/post/${postId}`)
  }

  const navigateToPoll = (pollId: string) => {
    router.push(`/community/${communityId}/poll/${pollId}`)
  }

  const navigateToMembers = () => {
    router.push(`/community/${communityId}/members`)
  }

  const navigateToProfile = (userAddress: string) => {
    router.push(`/profile/${userAddress}`)
  }

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        await fetchCommunityData()
        if (activeTab === 'posts') await fetchPosts()
        if (activeTab === 'polls') await fetchPolls()
        if (activeTab === 'members') await fetchMembers()
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    if (readonlyProgram && communityId) {
      loadData()
    }
  }, [readonlyProgram, communityId, publicKey])

  // Load tab-specific data when tab changes
  useEffect(() => {
    const loadTabData = async () => {
      if (!readonlyProgram || loading) return

      try {
        if (activeTab === 'posts') await fetchPosts()
        if (activeTab === 'polls') await fetchPolls()
        if (activeTab === 'members') await fetchMembers()
      } catch (err) {
        console.error('Error loading tab data:', err)
      }
    }

    loadTabData()
  }, [activeTab, readonlyProgram])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
            <div className="flex space-x-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded w-20"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Community not found</h1>
          <p className="text-gray-600 mb-4">The community you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/communities')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Communities
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
          onClick={() => router.push('/communities')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          ← Back to Communities
        </button>

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

        {/* Community Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {community.account.name}
                </h1>
                <button
                  onClick={() => {
                    fetchCommunityData()
                    if (activeTab === 'posts') fetchPosts()
                    if (activeTab === 'polls') fetchPolls()
                    if (activeTab === 'members') fetchMembers()
                  }}
                  className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Refresh"
                >
                  🔄
                </button>
              </div>
              <p className="text-gray-600 mb-4">
                {community.account.descriptionUri}
              </p>
              
              <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                <span>{community.account.memberCount.toNumber()} members</span>
                <span>{community.account.postCounter.toNumber()} posts</span>
                <span>{community.account.pollCounter.toNumber()} polls</span>
                <span>Created {new Date(community.account.createdAt.toNumber() * 1000).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <span>Created by </span>
                <span className="font-medium ml-1">
                  {creatorProfile?.displayName || 
                   `${community.account.creator.toString().slice(0, 8)}...`}
                </span>
              </div>
            </div>

            {publicKey && (
              <button
                onClick={handleCommunityAction}
                disabled={actionLoading.has('community')}
                className={`px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  isMember
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {actionLoading.has('community') 
                  ? 'Loading...' 
                  : isMember 
                    ? 'Leave Community' 
                    : 'Join Community'
                }
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'posts', label: 'Posts' },
            { key: 'polls', label: 'Polls' },
            { key: 'members', label: 'Members' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Community Stats */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Community Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {community.account.memberCount.toNumber()}
                    </div>
                    <div className="text-sm text-gray-600">Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {community.account.postCounter.toNumber()}
                    </div>
                    <div className="text-sm text-gray-600">Posts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {community.account.pollCounter.toNumber()}
                    </div>
                    <div className="text-sm text-gray-600">Polls</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {Math.floor((Date.now() - community.account.createdAt.toNumber() * 1000) / (1000 * 60 * 60 * 24))}
                    </div>
                    <div className="text-sm text-gray-600">Days Old</div>
                  </div>
                </div>
              </div>

              {/* Recent Activity Preview */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveTab('posts')}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="text-lg font-semibold text-blue-600 mb-2">📝 Posts</div>
                    <div className="text-sm text-gray-600">View and create posts</div>
                  </button>
                  <button
                    onClick={() => setActiveTab('polls')}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="text-lg font-semibold text-purple-600 mb-2">📊 Polls</div>
                    <div className="text-sm text-gray-600">Participate in polls</div>
                  </button>
                  <button
                    onClick={() => setActiveTab('members')}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="text-lg font-semibold text-green-600 mb-2">👥 Members</div>
                    <div className="text-sm text-gray-600">Connect with members</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Posts Tab */}
          {activeTab === 'posts' && (
            <div className="space-y-6">
              {/* Create Post */}
              {publicKey && isMember && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-4">Create Post</h3>
                  <div className="space-y-4">
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Share something with the community..."
                      className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            className="mr-2"
                          />
                          Post anonymously
                        </label>
                        {isAnonymous && (
                          <input
                            type="text"
                            value={pseudonym}
                            onChange={(e) => setPseudonym(e.target.value)}
                            placeholder="Pseudonym (optional)"
                            className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                      </div>
                      
                      <button
                        onClick={handleCreatePost}
                        disabled={!newPostContent.trim() || postLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {postLoading ? 'Posting...' : 'Post'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Posts List */}
              {posts.map((post) => (
                <div key={post.publicKey.toString()} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center mb-4">
                    <button
                      onClick={() => post.account.author && navigateToProfile(post.account.author.toString())}
                      className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3 hover:shadow-md transition-shadow"
                    >
                      {post.account.author === null
                        ? (post.account.pseudonym?.charAt(0) || 'A')
                        : (post.authorProfile?.displayName?.charAt(0) || '?')
                      }
                    </button>
                    <div>
                      <button
                        onClick={() => post.account.author && navigateToProfile(post.account.author.toString())}
                        className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {post.account.author === null
                          ? (post.account.pseudonym || 'Anonymous')
                          : (post.authorProfile?.displayName || 'Unknown User')
                        }
                      </button>
                      <div className="text-sm text-gray-500">
                        {new Date(post.account.createdAt.toNumber() * 1000).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-800 mb-4 whitespace-pre-wrap">
                    {post.account.contentUri}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex space-x-4">
                      {publicKey && (
                        <button
                          onClick={() => handleLikeToggle(post)}
                          disabled={actionLoading.has(post.publicKey.toString())}
                          className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition-colors ${
                            post.isLiked 
                              ? 'bg-red-100 text-red-600' 
                              : 'hover:bg-gray-100 text-gray-600'
                          }`}
                        >
                          <span>{post.isLiked ? '❤️' : '🤍'}</span>
                          <span>{post.account.likesCount.toNumber()}</span>
                        </button>
                      )}
                      
                      <div className="flex items-center space-x-1 text-gray-600">
                        <span>💬</span>
                        <span>{post.account.commentsCount.toNumber()}</span>
                      </div>

                      {publicKey && post.account.author && (
                        <button
                          onClick={() => {
                            const amount = prompt('Enter tip amount in SOL:')
                            if (amount && !isNaN(Number(amount))) {
                              handleTipPost(post, Number(amount) * 1000000000)
                            }
                          }}
                          className="flex items-center space-x-1 px-3 py-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                        >
                          <span>💰</span>
                          <span>Tip</span>
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => navigateToPost(post.publicKey.toString())}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View Post
                    </button>
                  </div>
                </div>
              ))}

              {posts.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📝</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No posts yet</h3>
                  <p className="text-gray-600">Be the first to share something!</p>
                </div>
              )}
            </div>
          )}

          {/* Polls Tab */}
          {activeTab === 'polls' && (
            <div className="space-y-6">
              {/* Create Poll */}
              {publicKey && isMember && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Create Poll</h3>
                    <button
                      onClick={() => setShowCreatePoll(!showCreatePoll)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {showCreatePoll ? 'Cancel' : 'New Poll'}
                    </button>
                  </div>

                  {showCreatePoll && (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={newPollQuestion}
                        onChange={(e) => setNewPollQuestion(e.target.value)}
                        placeholder="Enter poll question..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      
                      {newPollOptions.map((option, index) => (
                        <div key={index} className="flex space-x-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...newPollOptions]
                              newOptions[index] = e.target.value
                              setNewPollOptions(newOptions)
                            }}
                            placeholder={`Option ${index + 1}...`}
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                          {newPollOptions.length > 2 && (
                            <button
                              onClick={() => {
                                const newOptions = newPollOptions.filter((_, i) => i !== index)
                                setNewPollOptions(newOptions)
                              }}
                              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      
                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => setNewPollOptions([...newPollOptions, ''])}
                          disabled={newPollOptions.length >= 6}
                          className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          + Add Option
                        </button>
                        
                        <button
                          onClick={handleCreatePoll}
                          disabled={!newPollQuestion.trim() || newPollOptions.filter(o => o.trim()).length < 2 || pollLoading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {pollLoading ? 'Creating...' : 'Create Poll'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Polls List */}
              {polls.map((poll) => (
                <div key={poll.publicKey.toString()} className="bg-white rounded-lg shadow-md p-6">
                  <button
                    onClick={() => router.push(`/poll/${poll.publicKey.toString()}`)}
                    className="w-full text-left"
                  >
                    <h3 className="text-lg font-semibold mb-4 hover:text-blue-600 transition-colors">
                      {poll.account.questionUri}
                    </h3>
                  </button>
                  <div className="text-sm text-gray-500 mb-4">
                    Created {new Date(poll.account.createdAt.toNumber() * 1000).toLocaleDateString()}
                    {Date.now() < poll.account.endTime.toNumber() * 1000 ? ' • Active' : ' • Closed'}
                    <button
                      onClick={() => router.push(`/poll/${poll.publicKey.toString()}`)}
                      className="ml-2 text-blue-600 hover:underline"
                    >
                      View Details
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {poll.account.optionProfiles.map((option, index) => {
                      const voteCount = poll.account.votesPerOption[index] || 0
                      const totalVotes = poll.account.votesPerOption.reduce((sum, count) => sum + count, 0)
                      const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0
                      const isActive = Date.now() < poll.account.endTime.toNumber() * 1000
                      
                      return (
                        <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between p-3">
                            <div className="flex-1">
                              <div className="flex justify-between items-center">
                                <span>Option {index + 1}</span>
                                <span className="text-sm text-gray-500">
                                  {voteCount} votes ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                              
                              {/* Vote percentage bar */}
                              <div className="mt-2 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>

                            {publicKey && isMember && isActive && (
                              <button
                                onClick={async () => {
                                  if (!program) return
                                  
                                  try {
                                    await votePoll(program, publicKey, poll.publicKey, index)
                                    await fetchPolls() // Refresh to show updated vote counts
                                  } catch (err) {
                                    console.error('Error voting:', err)
                                    setError('Failed to vote')
                                  }
                                }}
                                className="ml-4 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                              >
                                Vote
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {polls.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No polls yet</h3>
                  <p className="text-gray-600">Check back later for community polls!</p>
                </div>
              )}
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {members.map((member) => (
                  <div key={member.account.user.toString()} className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => navigateToProfile(member.account.user.toString())}
                        className="flex items-center hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                      >
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                          {member.profile?.displayName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {member.profile?.displayName || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-500">
                            Joined {new Date(member.account.joinedAt.toNumber() * 1000).toLocaleDateString()}
                          </div>
                        </div>
                      </button>

                      {publicKey && !member.account.user.equals(publicKey) && (
                        <button
                          onClick={() => handleFollowToggle(member)}
                          disabled={actionLoading.has(member.account.user.toString())}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                            member.isFollowing
                              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {actionLoading.has(member.account.user.toString()) 
                            ? 'Loading...' 
                            : member.isFollowing 
                              ? 'Following' 
                              : 'Follow'
                          }
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {members.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">👥</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No members yet</h3>
                  <p className="text-gray-600">Be the first to join this community!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
