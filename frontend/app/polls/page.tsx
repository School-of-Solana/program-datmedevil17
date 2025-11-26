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
  fetchCommunityMembers,
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
    endTime: '',
    pollType: 'text' as 'text' | 'member'
  })
  const [createLoading, setCreateLoading] = useState(false)
  const [communityMembers, setCommunityMembers] = useState<any[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

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

  // Fetch community members for poll options
  const fetchCommunityMembersForPoll = async (communityId: string) => {
    if (!readonlyProgram || !communityId) return

    setLoadingMembers(true)
    try {
      const communityPubkey = new PublicKey(communityId)
      const members = await fetchCommunityMembers(readonlyProgram, communityPubkey)
      
      // Enhance members with profile info
      const enhancedMembers = await Promise.all(
        members.map(async (member) => {
          try {
            const profile = await fetchProfile(readonlyProgram, member.account.user)
            return {
              ...member,
              profile
            }
          } catch (err) {
            return {
              ...member,
              profile: null
            }
          }
        })
      )
      
      setCommunityMembers(enhancedMembers)
    } catch (err) {
      console.error('Error fetching community members:', err)
    } finally {
      setLoadingMembers(false)
    }
  }

  // Handle create poll
  const handleCreatePoll = async () => {
    if (!program || !publicKey || !newPollData.community || !newPollData.question) return

    // Validate poll options based on type
    if (newPollData.pollType === 'text' && !newPollData.options.some(opt => opt.trim())) {
      alert('Please add at least one option')
      return
    }
    if (newPollData.pollType === 'member' && selectedMembers.length < 2) {
      alert('Please select at least 2 members for the poll')
      return
    }

    setCreateLoading(true)

    try {
      const communityPubkey = new PublicKey(newPollData.community)
      const endTime = Math.floor(new Date(newPollData.endTime).getTime() / 1000)
      
      // Create option profiles based on poll type
      let optionProfiles: PublicKey[]
      
      if (newPollData.pollType === 'member') {
        // Use selected member addresses as poll options
        optionProfiles = selectedMembers.map(memberId => new PublicKey(memberId))
      } else {
        // For text options, use placeholder PublicKeys (would need actual implementation)
        optionProfiles = newPollData.options
          .filter(option => option.trim())
          .map(() => PublicKey.default) // Placeholder - would need actual option implementation
      }

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
        endTime: '',
        pollType: 'text'
      })
      setSelectedMembers([])
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center justify-between">
              <div className="h-8 bg-gray-700/50 rounded w-32"></div>
              <div className="h-10 bg-gray-700/50 rounded w-32"></div>
            </div>
            <div className="h-12 bg-gray-700/50 rounded w-full"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gradient-to-br from-gray-800 to-gray-700 border border-cyber-500/30 rounded-lg shadow p-6">
                  <div className="h-4 bg-gray-600/50 rounded w-full mb-4"></div>
                  <div className="h-3 bg-gray-600/50 rounded w-3/4 mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-2 bg-gray-600/50 rounded w-full"></div>
                    <div className="h-2 bg-gray-600/50 rounded w-full"></div>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-headline font-bold bg-gradient-to-r from-cyber-400 to-electric-400 bg-clip-text text-transparent">POLLS</h1>
          {publicKey && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-cyber-600 to-electric-600 hover:from-cyber-700 hover:to-electric-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg"
            >
              Create Poll
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
            <button 
              onClick={() => setError(null)}
              className="float-right text-red-400 hover:text-red-200"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-700 border border-cyber-500/30 rounded-lg shadow-xl p-6 mb-6">
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
                      ? 'bg-gradient-to-r from-cyber-600 to-electric-600 text-white shadow-lg'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
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
                className="w-full px-4 py-2 bg-gray-700/50 border border-cyber-500/30 text-gray-200 placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-cyber-500 focus:border-cyber-400 transition-all"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={fetchPollsData}
              className="px-4 py-2 bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white rounded-lg transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Polls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPolls.map((poll) => (
            <div key={poll.publicKey.toString()} className="bg-gradient-to-br from-gray-800 to-gray-700 border border-cyber-500/30 rounded-lg shadow-xl hover:shadow-cyber-500/20 hover:shadow-2xl transition-all duration-200">
              <div className="p-6">
                {/* Poll Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    poll.isActive
                      ? 'bg-green-900/50 text-green-400 border border-green-500/50'
                      : 'bg-gray-700/50 text-gray-400 border border-gray-500/50'
                  }`}>
                    {poll.isActive ? 'Active' : 'Ended'}
                  </span>
                  <button
                    onClick={() => navigateToCommunity(poll.account.community.toString())}
                    className="text-sm text-cyber-400 hover:text-cyber-300 transition-colors"
                  >
                    {poll.communityInfo?.name || 'Community'}
                  </button>
                </div>

                {/* Question */}
                <button
                  onClick={() => navigateToPoll(poll.publicKey.toString())}
                  className="block w-full text-left mb-4"
                >
                  <h3 className="text-lg font-semibold text-gray-100 hover:text-cyber-400 transition-colors line-clamp-2">
                    {poll.account.questionUri}
                  </h3>
                </button>

                {/* Vote Stats Preview */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-300 mb-2">
                    <span>Total Votes</span>
                    <span>{poll.totalVotes || 0}</span>
                  </div>
                  {poll.account.votesPerOption.slice(0, 2).map((count: any, index: number) => (
                    <div key={index} className="mb-1">
                      <div className="flex justify-between text-sm text-gray-400 mb-1">
                        <span>Option {index + 1}</span>
                        <span>{count} votes</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-cyber-500 to-electric-500 h-2 rounded-full"
                          style={{
                            width: `${poll.totalVotes ? (count / (poll.totalVotes || 1)) * 100 : 0}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  {poll.account.votesPerOption.length > 2 && (
                    <div className="text-sm text-gray-400 mt-2">
                      +{poll.account.votesPerOption.length - 2} more options
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-sm text-gray-400">
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
            <div className="w-24 h-24 bg-gradient-to-r from-cyber-500 to-electric-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white text-3xl">🗳️</span>
            </div>
            <h3 className="text-xl font-headline font-bold text-gray-200 mb-2">No polls found</h3>
            <p className="text-gray-400 mb-4">
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
                className="px-6 py-3 bg-gradient-to-r from-cyber-600 to-electric-600 hover:from-cyber-700 hover:to-electric-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg"
              >
                Create First Poll
              </button>
            )}
          </div>
        )}

        {/* Create Poll Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-cyber-500/30 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-headline font-bold bg-gradient-to-r from-cyber-400 to-electric-400 bg-clip-text text-transparent">CREATE POLL</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Community Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Community *
                    </label>
                    <input
                      type="text"
                      value={newPollData.community}
                      onChange={(e) => {
                        const communityId = e.target.value
                        setNewPollData(prev => ({ ...prev, community: communityId }))
                        if (communityId) {
                          fetchCommunityMembersForPoll(communityId)
                        }
                      }}
                      placeholder="Community Public Key"
                      className="w-full px-3 py-2 bg-gray-700/50 border border-cyber-500/30 text-gray-200 placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-cyber-500 focus:border-cyber-400 transition-all"
                    />
                  </div>

                  {/* Poll Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Poll Type *
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center text-gray-300">
                        <input
                          type="radio"
                          value="text"
                          checked={newPollData.pollType === 'text'}
                          onChange={(e) => setNewPollData(prev => ({ ...prev, pollType: e.target.value as 'text' | 'member' }))}
                          className="mr-2 accent-cyber-500"
                        />
                        Text Options
                      </label>
                      <label className="flex items-center text-gray-300">
                        <input
                          type="radio"
                          value="member"
                          checked={newPollData.pollType === 'member'}
                          onChange={(e) => setNewPollData(prev => ({ ...prev, pollType: e.target.value as 'text' | 'member' }))}
                          className="mr-2 accent-cyber-500"
                        />
                        Community Members
                      </label>
                    </div>
                  </div>

                  {/* Question */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Question *
                    </label>
                    <textarea
                      value={newPollData.question}
                      onChange={(e) => setNewPollData(prev => ({ ...prev, question: e.target.value }))}
                      placeholder="What would you like to ask?"
                      className="w-full px-3 py-2 bg-gray-700/50 border border-cyber-500/30 text-gray-200 placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-cyber-500 focus:border-cyber-400 transition-all resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      {newPollData.pollType === 'text' ? 'Options' : 'Select Members'}
                    </label>
                    
                    {newPollData.pollType === 'text' ? (
                      <div>
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
                              className="flex-1 px-3 py-2 bg-gray-700/50 border border-cyber-500/30 text-gray-200 placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-cyber-500 focus:border-cyber-400 transition-all"
                            />
                            {newPollData.options.length > 2 && (
                              <button
                                onClick={() => {
                                  const newOptions = newPollData.options.filter((_, i) => i !== index)
                                  setNewPollData(prev => ({ ...prev, options: newOptions }))
                                }}
                                className="px-3 py-2 text-red-400 hover:bg-red-900/50 rounded-lg transition-colors"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        {newPollData.options.length < 5 && (
                          <button
                            onClick={() => setNewPollData(prev => ({ ...prev, options: [...prev.options, ''] }))}
                            className="text-cyber-400 hover:text-cyber-300 text-sm transition-colors"
                          >
                            + Add Option
                          </button>
                        )}
                      </div>
                    ) : (
                      <div>
                        {loadingMembers ? (
                          <div className="text-center py-4">
                            <div className="animate-spin w-6 h-6 border-2 border-cyber-500 border-t-transparent rounded-full mx-auto"></div>
                            <div className="text-sm text-gray-400 mt-2">Loading community members...</div>
                          </div>
                        ) : communityMembers.length > 0 ? (
                          <div className="max-h-48 overflow-y-auto space-y-2">
                            {communityMembers.map((member) => (
                              <label key={member.account.user.toString()} className="flex items-center space-x-3 p-2 hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  checked={selectedMembers.includes(member.account.user.toString())}
                                  onChange={(e) => {
                                    const memberId = member.account.user.toString()
                                    if (e.target.checked) {
                                      setSelectedMembers(prev => [...prev, memberId])
                                    } else {
                                      setSelectedMembers(prev => prev.filter(id => id !== memberId))
                                    }
                                  }}
                                  className="rounded accent-cyber-500"
                                />
                                <div className="w-8 h-8 bg-gradient-to-r from-cyber-500 to-electric-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                  {member.profile?.displayName?.charAt(0) || member.account.user.toString().charAt(0)}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-sm text-gray-200">
                                    {member.profile?.displayName || 'Unknown User'}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {member.account.user.toString().slice(0, 8)}...
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        ) : newPollData.community ? (
                          <div className="text-center py-4 text-gray-400">
                            No community members found
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-400">
                            Select a community first
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      End Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={newPollData.endTime}
                      onChange={(e) => setNewPollData(prev => ({ ...prev, endTime: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-cyber-500/30 text-gray-200 rounded-lg focus:ring-2 focus:ring-cyber-500 focus:border-cyber-400 transition-all"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-cyber-500/20">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePoll}
                    disabled={createLoading || !newPollData.community || !newPollData.question || !newPollData.endTime}
                    className="px-4 py-2 bg-gradient-to-r from-cyber-600 to-electric-600 hover:from-cyber-700 hover:to-electric-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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
