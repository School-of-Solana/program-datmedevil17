'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { 
  getProvider, 
  getProviderReadonly, 
  fetchPoll,
  fetchCommunity,
  fetchProfile,
  fetchAllPolls,
  fetchCommunityPolls,
  createPoll,
  votePoll,
  checkIfMember
} from '@/services'

interface Poll {
  publicKey: PublicKey
  account: {
    pollId: any
    community: PublicKey
    createdBy: PublicKey
    questionUri: string
    optionProfiles: PublicKey[]
    votesPerOption: any[]
    endTime: any
    createdAt: any
  }
}

interface PollWithMetadata extends Poll {
  communityInfo?: any
  creatorProfile?: any
  isActive?: boolean
  totalVotes?: number
  hasUserVoted?: boolean
  userVote?: number
}

type FilterType = 'all' | 'my' | 'community' | 'active' | 'ended'

export default function PollsPage() {
  const router = useRouter()
  const { publicKey, signTransaction, sendTransaction } = useWallet()

  // State
  const [polls, setPolls] = useState<PollWithMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Create poll form state
  const [newPollData, setNewPollData] = useState({
    community: '',
    question: '',
    options: ['', ''],
    endTime: ''
  })
  const [createLoading, setCreateLoading] = useState(false)

  // Program instances
  const readonlyProgram = useMemo(() => getProviderReadonly(), [])
  const program = useMemo(() => {
    if (publicKey && signTransaction && sendTransaction) {
      return getProvider(publicKey, signTransaction, sendTransaction)
    }
    return null
  }, [publicKey, signTransaction, sendTransaction])

  // Fetch and enhance polls data
  const fetchPollsData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!readonlyProgram) return

      const allPolls = await fetchAllPolls(readonlyProgram)

      // Enhance polls with metadata
      const enhancedPolls: PollWithMetadata[] = await Promise.all(
        allPolls.map(async (poll) => {
          const enhanced: PollWithMetadata = { ...poll }

          // Fetch community info
          try {
            enhanced.communityInfo = await fetchCommunity(readonlyProgram, poll.account.community)
          } catch (err) {
            console.warn('Failed to fetch community info:', err)
          }

          // Fetch creator profile
          try {
            enhanced.creatorProfile = await fetchProfile(readonlyProgram, poll.account.createdBy)
          } catch (err) {
            console.warn('Failed to fetch creator profile:', err)
          }

          // Calculate poll statistics
          const now = Date.now() / 1000
          enhanced.isActive = now < poll.account.endTime.toNumber()
          enhanced.totalVotes = poll.account.votesPerOption.reduce((sum: number, count: any) => sum + count, 0)

          // Check if user has voted (this would require a vote tracking system)
          enhanced.hasUserVoted = false // Placeholder - would need to implement vote tracking

          return enhanced
        })
      )

      // Sort by creation date (newest first)
      enhancedPolls.sort((a, b) => b.account.createdAt.toNumber() - a.account.createdAt.toNumber())
      setPolls(enhancedPolls)
    } catch (err) {
      console.error('Error fetching polls:', err)
      setError('Failed to load polls')
    } finally {
      setLoading(false)
    }
  }

  // Filter polls based on current filter
  const filteredPolls = useMemo(() => {
    let filtered = polls

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(poll =>
        poll.account.questionUri.toLowerCase().includes(searchTerm.toLowerCase()) ||
        poll.communityInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply type filter
    switch (filter) {
      case 'my':
        filtered = filtered.filter(poll => 
          publicKey && poll.account.createdBy.equals(publicKey)
        )
        break
      case 'community':
        // Show polls from communities user is member of (would need membership tracking)
        break
      case 'active':
        filtered = filtered.filter(poll => poll.isActive)
        break
      case 'ended':
        filtered = filtered.filter(poll => !poll.isActive)
        break
      default:
        // 'all' - no additional filtering
        break
    }

    return filtered
  }, [polls, filter, searchTerm, publicKey])

  // Handle create poll
  const handleCreatePoll = async () => {
    if (!program || !publicKey || !newPollData.community || !newPollData.question) return

    setCreateLoading(true)

    try {
      const communityPubkey = new PublicKey(newPollData.community)
      const endTime = Math.floor(new Date(newPollData.endTime).getTime() / 1000)
      
      // For now, using placeholder PublicKeys for options
      const optionProfiles = newPollData.options
        .filter(option => option.trim())
        .map(() => PublicKey.default) // Placeholder - would need actual option implementation

      await createPoll(
        program,
        publicKey,
        communityPubkey,
        newPollData.question,
        optionProfiles,
        endTime
      )

      // Reset form and refresh
      setNewPollData({
        community: '',
        question: '',
        options: ['', ''],
        endTime: ''
      })
      setShowCreateModal(false)
      await fetchPollsData()

      alert('Poll created successfully!')
    } catch (err) {
      console.error('Error creating poll:', err)
      alert('Failed to create poll')
    } finally {
      setCreateLoading(false)
    }
  }

  // Navigate to poll detail
  const navigateToPoll = (pollId: string) => {
    router.push(`/poll/${pollId}`)
  }

  // Navigate to community
  const navigateToCommunity = (communityId: string) => {
    router.push(`/community/${communityId}`)
  }

  // Load polls on mount
  useEffect(() => {
    if (readonlyProgram) {
      fetchPollsData()
    }
  }, [readonlyProgram])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center justify-between">
              <div className="h-8 bg-gray-200 rounded w-32"></div>
              <div className="h-10 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="h-12 bg-gray-200 rounded w-full"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6">
                  <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-2 bg-gray-200 rounded w-full"></div>
                    <div className="h-2 bg-gray-200 rounded w-full"></div>
                  </div>
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Polls</h1>
          {publicKey && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Poll
            </button>
          )}
        </div>

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

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All Polls' },
                { key: 'active', label: 'Active' },
                { key: 'ended', label: 'Ended' },
                ...(publicKey ? [{ key: 'my', label: 'My Polls' }] : [])
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as FilterType)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search polls or communities..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={fetchPollsData}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Polls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPolls.map((poll) => (
            <div key={poll.publicKey.toString()} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Poll Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    poll.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {poll.isActive ? 'Active' : 'Ended'}
                  </span>
                  <button
                    onClick={() => navigateToCommunity(poll.account.community.toString())}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {poll.communityInfo?.name || 'Community'}
                  </button>
                </div>

                {/* Question */}
                <button
                  onClick={() => navigateToPoll(poll.publicKey.toString())}
                  className="block w-full text-left mb-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2">
                    {poll.account.questionUri}
                  </h3>
                </button>

                {/* Vote Stats Preview */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Total Votes</span>
                    <span>{poll.totalVotes || 0}</span>
                  </div>
                  {poll.account.votesPerOption.slice(0, 2).map((count: any, index: number) => (
                    <div key={index} className="mb-1">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Option {index + 1}</span>
                        <span>{count} votes</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${poll.totalVotes ? (count / (poll.totalVotes || 1)) * 100 : 0}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  {poll.account.votesPerOption.length > 2 && (
                    <div className="text-sm text-gray-500 mt-2">
                      +{poll.account.votesPerOption.length - 2} more options
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    by {poll.creatorProfile?.displayName || 'Unknown'}
                  </span>
                  <span>
                    {poll.isActive 
                      ? `Ends ${new Date(poll.account.endTime.toNumber() * 1000).toLocaleDateString()}`
                      : `Ended ${new Date(poll.account.endTime.toNumber() * 1000).toLocaleDateString()}`
                    }
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredPolls.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🗳️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No polls found</h3>
            <p className="text-gray-600 mb-4">
              {filter === 'my' 
                ? "You haven't created any polls yet."
                : searchTerm 
                ? "Try adjusting your search terms."
                : "No polls match your current filter."
              }
            </p>
            {publicKey && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create First Poll
              </button>
            )}
          </div>
        )}

        {/* Create Poll Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Create Poll</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Community Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Community *
                    </label>
                    <input
                      type="text"
                      value={newPollData.community}
                      onChange={(e) => setNewPollData(prev => ({ ...prev, community: e.target.value }))}
                      placeholder="Community Public Key"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Question */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question *
                    </label>
                    <textarea
                      value={newPollData.question}
                      onChange={(e) => setNewPollData(prev => ({ ...prev, question: e.target.value }))}
                      placeholder="What would you like to ask?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Options
                    </label>
                    {newPollData.options.map((option, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...newPollData.options]
                            newOptions[index] = e.target.value
                            setNewPollData(prev => ({ ...prev, options: newOptions }))
                          }}
                          placeholder={`Option ${index + 1}`}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {newPollData.options.length > 2 && (
                          <button
                            onClick={() => {
                              const newOptions = newPollData.options.filter((_, i) => i !== index)
                              setNewPollData(prev => ({ ...prev, options: newOptions }))
                            }}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    {newPollData.options.length < 5 && (
                      <button
                        onClick={() => setNewPollData(prev => ({ ...prev, options: [...prev.options, ''] }))}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        + Add Option
                      </button>
                    )}
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={newPollData.endTime}
                      onChange={(e) => setNewPollData(prev => ({ ...prev, endTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePoll}
                    disabled={createLoading || !newPollData.community || !newPollData.question || !newPollData.endTime}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {createLoading ? 'Creating...' : 'Create Poll'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
