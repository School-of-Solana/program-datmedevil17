
'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/components/ProfileProvider'
import { 
  getProvider, 
  getProviderReadonly, 
  fetchAllPosts, 
  fetchUserFollowing, 
  fetchUserMemberships, 
  fetchCommunityPosts,
  createPost,
  likePost,
  unlikePost,
  tipPost,
  commentOnPost,
  checkIfLiked,
  fetchProfile,
  uploadImage
} from '@/services'

interface Post {
  publicKey: PublicKey
  account: {
    postId: any // BN type
    author: PublicKey | null
    community: PublicKey
    contentUri: string
    contentHash: number[]
    likesCount: any // BN type
    commentsCount: any // BN type
    totalTipLamports: any // BN type
    createdAt: any // BN type
    pseudonym: string | null
  }
}

interface PostWithMetadata extends Post {
  authorProfile?: any
  isLiked?: boolean
  communityInfo?: any
}

export default function Home() {
  const { publicKey, signTransaction, sendTransaction } = useWallet()
  const { hasProfile, profile, setShowCreateProfile } = useProfile()
  const router = useRouter()
  const [posts, setPosts] = useState<PostWithMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Post composer state
  const [isComposing, setIsComposing] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [selectedCommunity, setSelectedCommunity] = useState<string>('')
  const [userCommunities, setUserCommunities] = useState<any[]>([])
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [pseudonym, setPseudonym] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Get program instances
  const readonlyProgram = useMemo(() => getProviderReadonly(), [])
  const program = useMemo(() => {
    if (publicKey && signTransaction && sendTransaction) {
      return getProvider(publicKey, signTransaction, sendTransaction)
    }
    return null
  }, [publicKey, signTransaction, sendTransaction])

  // Fetch user's feed
  const fetchFeed = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!readonlyProgram) {
        throw new Error('Program not initialized')
      }

      let feedPosts: Post[] = []

      if (publicKey && program) {
        // Get user's following and memberships for personalized feed
        const [following, memberships] = await Promise.all([
          fetchUserFollowing(readonlyProgram, publicKey),
          fetchUserMemberships(readonlyProgram, publicKey)
        ])

        setUserCommunities(memberships.map(m => m.account))

        // Get posts from communities user is member of
        const communityPosts = await Promise.all(
          memberships.map(membership => 
            fetchCommunityPosts(readonlyProgram, membership.account.community)
          )
        )

        feedPosts = communityPosts.flat()
      } else {
        // If no wallet connected, show all public posts
        const allPosts = await fetchAllPosts(readonlyProgram)
        feedPosts = allPosts
      }          // Sort posts by creation date (newest first)
      feedPosts.sort((a, b) => b.account.createdAt.toNumber() - a.account.createdAt.toNumber())

      // Enhance posts with metadata
      const enhancedPosts: PostWithMetadata[] = await Promise.all(
        feedPosts.map(async (post) => {
          const enhanced: PostWithMetadata = { ...post }
          const isAnonymous = post.account.author === null

          // Fetch author profile if not anonymous
          if (!isAnonymous && post.account.author) {
            try {
              enhanced.authorProfile = await fetchProfile(readonlyProgram, post.account.author)
            } catch (err) {
              console.warn('Failed to fetch author profile:', err)
            }
          }

          // Check if current user liked this post
          if (publicKey && program) {
            try {
              enhanced.isLiked = await checkIfLiked(readonlyProgram, publicKey, post.publicKey)
            } catch (err) {
              enhanced.isLiked = false
            }
          }

          return enhanced
        })
      )

      setPosts(enhancedPosts)
    } catch (err) {
      console.error('Error fetching feed:', err)
      setError('Failed to load feed')
    } finally {
      setLoading(false)
    }
  }

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Clear selected image
  const clearImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
  }

  // Handle creating a new post
  const handleCreatePost = async () => {
    if (!program || !publicKey || !postContent.trim() || !selectedCommunity) {
      return
    }

    try {
      setLoading(true)
      
      let finalContent = postContent

      // Upload image if selected
      if (selectedImage) {
        setUploadingImage(true)
        try {
          const imageUrl = await uploadImage(selectedImage, `post-image-${Date.now()}`)
          finalContent = `${postContent}\n\n[Image: ${imageUrl}]`
        } catch (err) {
          console.error('Error uploading image:', err)
          setError('Failed to upload image')
          return
        } finally {
          setUploadingImage(false)
        }
      }
      
      // Create content hash (simplified - in production use proper hashing)
      const contentHash = Array.from(new TextEncoder().encode(finalContent))
      
      await createPost(
        program,
        publicKey,
        new PublicKey(selectedCommunity),
        finalContent,
        contentHash,
        isAnonymous,
        isAnonymous ? pseudonym : undefined
      )

      // Reset composer
      setPostContent('')
      setIsAnonymous(false)
      setPseudonym('')
      setIsComposing(false)
      clearImage()

      // Refresh feed
      await fetchFeed()
    } catch (err) {
      console.error('Error creating post:', err)
      setError('Failed to create post')
    } finally {
      setLoading(false)
      setUploadingImage(false)
    }
  }

  // Handle like/unlike post
  const handleLikeToggle = async (post: PostWithMetadata) => {
    if (!program || !publicKey) return

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

  // Navigate to post detail
  const navigateToPost = (postId: string) => {
    router.push(`/post/${postId}`)
  }

  // Navigate to community
  const navigateToCommunity = (communityId: string) => {
    router.push(`/community/${communityId}`)
  }

  // Navigate to profile
  const navigateToProfile = (userAddress: string) => {
    router.push(`/profile/${userAddress}`)
  }

  // Render post content with embedded images
  const renderPostContent = (content: string) => {
    // Extract image URLs from content
    const imageRegex = /\[Image: (https?:\/\/[^\]]+)\]/g
    const parts = content.split(imageRegex)
    
    return (
      <div className="space-y-3">
        {parts.map((part, index) => {
          // If this part is a URL (every second part after split)
          if (index % 2 === 1) {
            return (
              <div key={index} className="rounded-lg overflow-hidden">
                <img 
                  src={part} 
                  alt="Post image" 
                  className="w-full max-h-96 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )
          } else if (part.trim()) {
            return (
              <p key={index} className="text-gray-800 whitespace-pre-wrap">
                {part.trim()}
              </p>
            )
          }
          return null
        })}
      </div>
    )
  }

  useEffect(() => {
    fetchFeed()
  }, [publicKey, program, readonlyProgram])

  if (loading && posts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="bg-white rounded-lg shadow p-6 mb-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 mb-4">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Home Feed</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Post Composer */}
        {publicKey && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            {!isComposing ? (
              <button
                onClick={() => setIsComposing(true)}
                className="w-full text-left p-3 bg-gray-100 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
              >
                What's on your mind?
              </button>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />

                {/* Image Preview */}
                {imagePreview && (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Image preview"
                      className="max-h-64 rounded-lg border border-gray-200"
                    />
                    <button
                      onClick={clearImage}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-4 items-center">
                  <select
                    value={selectedCommunity}
                    onChange={(e) => setSelectedCommunity(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Community</option>
                    {userCommunities.map((community) => (
                      <option key={community.community.toString()} value={community.community.toString()}>
                        Community {community.community.toString().slice(0, 8)}...
                      </option>
                    ))}
                  </select>

                  {/* Image Upload Button */}
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors flex items-center space-x-2"
                    >
                      <span>📷</span>
                      <span>Add Image</span>
                    </label>
                  </div>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="mr-2"
                    />
                    Post Anonymously
                  </label>
                </div>

                {isAnonymous && (
                  <input
                    type="text"
                    value={pseudonym}
                    onChange={(e) => setPseudonym(e.target.value)}
                    placeholder="Pseudonym (optional)"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                )}

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setIsComposing(false)
                      clearImage()
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePost}
                    disabled={!postContent.trim() || !selectedCommunity || loading || uploadingImage}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploadingImage ? 'Uploading...' : loading ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Posts Feed */}
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.publicKey.toString()} className="bg-white rounded-lg shadow-md p-6">
              {/* Post Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    {post.account.author === null
                      ? (post.account.pseudonym?.charAt(0) || 'A')
                      : (post.authorProfile?.displayName?.charAt(0) || '?')
                    }
                  </div>
                  <div>
                    <button
                      onClick={() => post.account.author && navigateToProfile(post.account.author.toString())}
                      className="font-semibold text-gray-900 hover:underline"
                      disabled={post.account.author === null}
                    >
                      {post.account.author === null
                        ? (post.account.pseudonym || 'Anonymous')
                        : (post.authorProfile?.displayName || 'Unknown User')
                      }
                    </button>
                    <p className="text-sm text-gray-500">
                      {new Date(post.account.createdAt.toNumber() * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigateToCommunity(post.account.community.toString())}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Community
                </button>
              </div>

              {/* Post Content */}
              <div className="mb-4">
                {renderPostContent(post.account.contentUri)}
              </div>

              {/* Post Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex space-x-4">
                  {publicKey && (
                    <button
                      onClick={() => handleLikeToggle(post)}
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
                  
                  <button
                    onClick={() => navigateToPost(post.publicKey.toString())}
                    className="flex items-center space-x-1 px-3 py-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                  >
                    <span>💬</span>
                    <span>{post.account.commentsCount.toNumber()}</span>
                  </button>

                  {publicKey && post.account.author && (
                    <button
                      onClick={() => {
                        const amount = prompt('Enter tip amount in SOL:')
                        if (amount && !isNaN(Number(amount))) {
                          handleTipPost(post, Number(amount) * 1000000000) // Convert to lamports
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
        </div>

        {posts.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No posts to show</p>
            {!publicKey && (
              <p className="text-gray-400 mt-2">Connect your wallet to see personalized content</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
