'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { 
  getProvider, 
  getProviderReadonly, 
  fetchPost,
  fetchPostComments,
  fetchProfile,
  fetchCommunity,
  likePost,
  unlikePost,
  tipPost,
  commentOnPost,
  checkIfLiked,
  checkIfMember
} from '@/services'

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

interface Comment {
  publicKey: PublicKey
  account: {
    commentId: any
    post: PublicKey
    commenter: PublicKey
    contentUri: string
    contentHash: number[]
    createdAt: any
  }
}

interface PostWithMetadata extends Post {
  authorProfile?: any
  communityInfo?: any
  isLiked?: boolean
  isMember?: boolean
}

interface CommentWithMetadata extends Comment {
  commenterProfile?: any
}

export default function PostDetail() {
  const params = useParams()
  const router = useRouter()
  const { publicKey, signTransaction, sendTransaction } = useWallet()
  
  const postId = params.postId as string
  
  // State
  const [post, setPost] = useState<PostWithMetadata | null>(null)
  const [comments, setComments] = useState<CommentWithMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Comment form state
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  
  // Action loading states
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())

  // Program instances
  const readonlyProgram = useMemo(() => getProviderReadonly(), [])
  const program = useMemo(() => {
    if (publicKey && signTransaction && sendTransaction) {
      return getProvider(publicKey, signTransaction, sendTransaction)
    }
    return null
  }, [publicKey, signTransaction, sendTransaction])

  // Fetch post data
  const fetchPostData = async () => {
    try {
      if (!readonlyProgram) return

      const postPubkey = new PublicKey(postId)
      const postData = await fetchPost(readonlyProgram, postPubkey)
      
      if (postData) {
        const enhancedPost: PostWithMetadata = {
          publicKey: postPubkey,
          account: postData
        }

        // Fetch author profile if not anonymous
        if (postData.author) {
          try {
            enhancedPost.authorProfile = await fetchProfile(readonlyProgram, postData.author)
          } catch (err) {
            console.warn('Failed to fetch author profile:', err)
          }
        }

        // Fetch community info
        try {
          enhancedPost.communityInfo = await fetchCommunity(readonlyProgram, postData.community)
        } catch (err) {
          console.warn('Failed to fetch community info:', err)
        }

        // Check if current user liked this post
        if (publicKey) {
          try {
            enhancedPost.isLiked = await checkIfLiked(readonlyProgram, publicKey, postPubkey)
          } catch (err) {
            enhancedPost.isLiked = false
          }

          // Check if user is member of the community
          try {
            enhancedPost.isMember = await checkIfMember(readonlyProgram, publicKey, postData.community)
          } catch (err) {
            enhancedPost.isMember = false
          }
        }

        setPost(enhancedPost)
      }
    } catch (err) {
      console.error('Error fetching post:', err)
      setError('Failed to load post')
    }
  }

  // Fetch comments
  const fetchComments = async () => {
    try {
      setCommentsLoading(true)
      if (!readonlyProgram) return

      const postPubkey = new PublicKey(postId)
      const commentsData = await fetchPostComments(readonlyProgram, postPubkey)
      
      // Enhance comments with metadata
      const enhancedComments: CommentWithMetadata[] = await Promise.all(
        commentsData.map(async (comment) => {
          const enhanced: CommentWithMetadata = { ...comment }

          // Fetch commenter profile
          try {
            enhanced.commenterProfile = await fetchProfile(readonlyProgram, comment.account.commenter)
          } catch (err) {
            console.warn('Failed to fetch commenter profile:', err)
          }

          return enhanced
        })
      )

      // Sort by creation date (oldest first for comments)
      enhancedComments.sort((a, b) => a.account.createdAt.toNumber() - b.account.createdAt.toNumber())
      setComments(enhancedComments)
    } catch (err) {
      console.error('Error fetching comments:', err)
    } finally {
      setCommentsLoading(false)
    }
  }

  // Handle like/unlike post
  const handleLikeToggle = async () => {
    if (!program || !publicKey || !post) return

    setActionLoading(prev => new Set(prev).add('like'))

    try {
      if (post.isLiked) {
        await unlikePost(program, publicKey, post.publicKey)
      } else {
        await likePost(program, publicKey, post.publicKey)
      }

      // Update local state
      setPost(prev => prev ? {
        ...prev,
        isLiked: !prev.isLiked,
        account: {
          ...prev.account,
          likesCount: {
            toNumber: () => prev.isLiked 
              ? prev.account.likesCount.toNumber() - 1 
              : prev.account.likesCount.toNumber() + 1
          }
        }
      } : null)
    } catch (err) {
      console.error('Error toggling like:', err)
      setError('Failed to like/unlike post')
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete('like')
        return newSet
      })
    }
  }

  // Handle tip post
  const handleTipPost = async (amount: number) => {
    if (!program || !publicKey || !post || !post.account.author) return

    setActionLoading(prev => new Set(prev).add('tip'))

    try {
      await tipPost(program, publicKey, post.publicKey, post.account.author, amount)
      
      // Update local state
      setPost(prev => prev ? {
        ...prev,
        account: {
          ...prev.account,
          totalTipLamports: {
            toNumber: () => prev.account.totalTipLamports.toNumber() + amount
          }
        }
      } : null)

      alert(`Tipped ${amount / 1000000000} SOL successfully!`)
    } catch (err) {
      console.error('Error tipping post:', err)
      alert('Failed to tip post')
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete('tip')
        return newSet
      })
    }
  }

  // Handle create comment
  const handleCreateComment = async () => {
    if (!program || !publicKey || !post || !newComment.trim()) return

    setCommentLoading(true)

    try {
      const contentHash = Array.from(new TextEncoder().encode(newComment.trim()))
      
      await commentOnPost(
        program,
        publicKey,
        post.publicKey,
        newComment.trim(),
        contentHash
      )

      // Reset form
      setNewComment('')

      // Refresh comments and post data
      await Promise.all([fetchComments(), fetchPostData()])
    } catch (err) {
      console.error('Error creating comment:', err)
      setError('Failed to post comment')
    } finally {
      setCommentLoading(false)
    }
  }

  // Navigation functions
  const navigateToCommunity = () => {
    if (post?.account.community) {
      router.push(`/community/${post.account.community.toString()}`)
    }
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
        await fetchPostData()
        await fetchComments()
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    if (readonlyProgram && postId) {
      loadData()
    }
  }, [readonlyProgram, postId, publicKey])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full mr-3"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-full"></div>
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-4 mb-4">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full mr-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Post not found</h1>
          <p className="text-gray-600 mb-4">The post you're looking for doesn't exist or has been removed.</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Post Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              {/* Post Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <button
                    onClick={() => post.account.author && navigateToProfile(post.account.author.toString())}
                    className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3 hover:shadow-md transition-shadow"
                  >
                    {post.account.author === null
                      ? (post.account.pseudonym?.charAt(0) || 'A')
                      : (post.authorProfile?.displayName?.charAt(0) || '?')
                    }
                  </button>
                  <div>
                    <button
                      onClick={() => post.account.author && navigateToProfile(post.account.author.toString())}
                      className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                      disabled={!post.account.author}
                    >
                      {post.account.author === null
                        ? (post.account.pseudonym || 'Anonymous')
                        : (post.authorProfile?.displayName || 'Unknown User')
                      }
                    </button>
                    <div className="text-sm text-gray-500">
                      {new Date(post.account.createdAt.toNumber() * 1000).toLocaleDateString()} at{' '}
                      {new Date(post.account.createdAt.toNumber() * 1000).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                {/* Community Badge */}
                <button
                  onClick={navigateToCommunity}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                >
                  {post.communityInfo?.name || 'Community'}
                </button>
              </div>

              {/* Post Content */}
              <div className="mb-6">
                <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap">
                  {post.account.contentUri}
                </p>
              </div>

              {/* Post Stats */}
              <div className="flex items-center justify-between py-4 border-t border-b border-gray-200">
                <div className="flex items-center space-x-6 text-gray-600">
                  <div className="flex items-center space-x-1">
                    <span>❤️</span>
                    <span>{post.account.likesCount.toNumber()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>💬</span>
                    <span>{post.account.commentsCount.toNumber()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>💰</span>
                    <span>{(post.account.totalTipLamports.toNumber() / 1000000000).toFixed(4)} SOL</span>
                  </div>
                </div>
              </div>

              {/* Post Actions */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex space-x-3">
                  {publicKey && (
                    <button
                      onClick={handleLikeToggle}
                      disabled={actionLoading.has('like')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                        post.isLiked 
                          ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>{post.isLiked ? '❤️' : '🤍'}</span>
                      <span>{actionLoading.has('like') ? 'Loading...' : (post.isLiked ? 'Liked' : 'Like')}</span>
                    </button>
                  )}

                  {publicKey && post.account.author && (
                    <button
                      onClick={() => {
                        const amount = prompt('Enter tip amount in SOL:')
                        if (amount && !isNaN(Number(amount))) {
                          handleTipPost(Number(amount) * 1000000000)
                        }
                      }}
                      disabled={actionLoading.has('tip')}
                      className="flex items-center space-x-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50"
                    >
                      <span>💰</span>
                      <span>{actionLoading.has('tip') ? 'Loading...' : 'Tip'}</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={navigateToCommunity}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View Community
                </button>
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                Comments ({post.account.commentsCount.toNumber()})
              </h2>

              {/* Add Comment Form */}
              {publicKey && post.isMember && (
                <div className="mb-6">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleCreateComment}
                      disabled={!newComment.trim() || commentLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {commentLoading ? 'Posting...' : 'Post Comment'}
                    </button>
                  </div>
                </div>
              )}

              {/* Comments List */}
              {commentsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full mr-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.publicKey.toString()} className="border-l-2 border-gray-100 pl-4">
                      <div className="flex items-center mb-2">
                        <button
                          onClick={() => navigateToProfile(comment.account.commenter.toString())}
                          className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-2 hover:shadow-md transition-shadow"
                        >
                          {comment.commenterProfile?.displayName?.charAt(0) || '?'}
                        </button>
                        <button
                          onClick={() => navigateToProfile(comment.account.commenter.toString())}
                          className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-sm"
                        >
                          {comment.commenterProfile?.displayName || 'Unknown User'}
                        </button>
                        <span className="text-gray-500 text-sm ml-2">
                          {new Date(comment.account.createdAt.toNumber() * 1000).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {comment.account.contentUri}
                      </p>
                    </div>
                  ))}

                  {comments.length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-4xl mb-3">💬</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No comments yet</h3>
                      <p className="text-gray-600">
                        {publicKey && post.isMember 
                          ? 'Be the first to share your thoughts!'
                          : 'Join the community to participate in the discussion.'
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Community Info Panel */}
            {post.communityInfo && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Community</h3>
                <button
                  onClick={navigateToCommunity}
                  className="w-full p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all text-left"
                >
                  <div className="font-medium text-gray-900 mb-1">
                    {post.communityInfo.name}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {post.communityInfo.descriptionUri}
                  </div>
                  <div className="text-xs text-gray-500">
                    {post.communityInfo.memberCount.toNumber()} members
                  </div>
                </button>
              </div>
            )}

            {/* Author Info Panel */}
            {post.account.author && post.authorProfile && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Author</h3>
                <button
                  onClick={() => navigateToProfile(post.account.author!.toString())}
                  className="w-full p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center mb-2">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                      {post.authorProfile.displayName?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {post.authorProfile.displayName}
                      </div>
                      <div className="text-sm text-gray-500">
                        View Profile
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Post Stats Panel */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Post Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Likes</span>
                  <span className="font-medium">{post.account.likesCount.toNumber()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Comments</span>
                  <span className="font-medium">{post.account.commentsCount.toNumber()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Tips</span>
                  <span className="font-medium">{(post.account.totalTipLamports.toNumber() / 1000000000).toFixed(4)} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Posted</span>
                  <span className="font-medium text-sm">
                    {new Date(post.account.createdAt.toNumber() * 1000).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            {!publicKey && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Join the Discussion</h3>
                <p className="text-blue-700 text-sm mb-3">
                  Connect your wallet to like, comment, and tip posts.
                </p>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}