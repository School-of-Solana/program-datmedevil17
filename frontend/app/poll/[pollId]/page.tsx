'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { 
  getProvider, 
  getProviderReadonly, 
  fetchPoll,
  fetchCommunity,
  fetchProfile,
  votePoll,
  checkIfMember
} from '@/services'

interface Poll {
  account: {
    pollId: any
    community: PublicKey
    createdBy: PublicKey
    questionUri: string
    optionProfiles: PublicKey[]
    votesPerOption: number[]
    endTime: any
    createdAt: any
  }
}

interface PollWithMetadata extends Poll {
  communityInfo?: any
  creatorProfile?: any
  optionProfilesData?: any[]
  isActive?: boolean
  totalVotes?: number
  hasUserVoted?: boolean
  userVote?: number
}

export default function PollDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { publicKey, signTransaction, sendTransaction } = useWallet()
  
  const pollId = params.pollId as string
  
  // State
  const [poll, setPoll] = useState<PollWithMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [votingLoading, setVotingLoading] = useState(false)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isCommunityMember, setIsCommunityMember] = useState<boolean>(false)
  const [checkingMembership, setCheckingMembership] = useState(false)

  // Program instances
  const readonlyProgram = useMemo(() => getProviderReadonly(), [])
  const program = useMemo(() => {
    if (publicKey && signTransaction && sendTransaction) {
      return getProvider(publicKey, signTransaction, sendTransaction)
    }
    return null
  }, [publicKey, signTransaction, sendTransaction])

  // Check if user is a member of the poll's community
  const checkMembership = async (communityPublicKey: PublicKey) => {
    if (!publicKey || !readonlyProgram) return

    setCheckingMembership(true)
    try {
      const isMember = await checkIfMember(readonlyProgram, publicKey, communityPublicKey)
      setIsCommunityMember(isMember)
    } catch (err) {
      console.warn('Failed to check membership:', err)
      setIsCommunityMember(false)
    } finally {
      setCheckingMembership(false)
    }
  }

  // Fetch poll data
  const fetchPollData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!readonlyProgram) return

      const pollPubkey = new PublicKey(pollId)
      const pollData = await fetchPoll(readonlyProgram, pollPubkey)
      
      if (pollData) {
        const enhanced: PollWithMetadata = {
          account: pollData
        }

        // Fetch community info
        try {
          enhanced.communityInfo = await fetchCommunity(readonlyProgram, pollData.community)
        } catch (err) {
          console.warn('Failed to fetch community info:', err)
        }

        // Fetch creator profile
        try {
          enhanced.creatorProfile = await fetchProfile(readonlyProgram, pollData.createdBy)
        } catch (err) {
          console.warn('Failed to fetch creator profile:', err)
        }

        // Fetch option profiles data
        try {
          enhanced.optionProfilesData = await Promise.all(
            pollData.optionProfiles.map(async (profilePubkey) => {
              try {
                return await fetchProfile(readonlyProgram, profilePubkey)
              } catch (err) {
                console.warn('Failed to fetch option profile:', err)
                return null
              }
            })
          )
        } catch (err) {
          console.warn('Failed to fetch option profiles:', err)
          enhanced.optionProfilesData = []
        }

        // Calculate poll statistics
        const now = Date.now() / 1000
        enhanced.isActive = now < pollData.endTime.toNumber()
        enhanced.totalVotes = pollData.votesPerOption.reduce((sum: number, count: number) => sum + count, 0)

        // Check if user has voted (placeholder - would need vote tracking)
        enhanced.hasUserVoted = false
        enhanced.userVote = undefined

        // Check if user is member of the community
        if (publicKey) {
          checkMembership(pollData.community)
        }

        setPoll(enhanced)
      }
    } catch (err) {
      console.error('Error fetching poll:', err)
      setError('Failed to load poll')
    } finally {
      setLoading(false)
    }
  }

  // Handle vote submission
  const handleVote = async () => {
    if (!program || !publicKey || !poll || selectedOption === null || !poll.isActive) return

    setVotingLoading(true)

    try {
      const pollPubkey = new PublicKey(pollId)
      
      await votePoll(program, publicKey, pollPubkey, selectedOption)

      // Update local state
      setPoll(prev => prev ? {
        ...prev,
        account: {
          ...prev.account,
          votesPerOption: prev.account.votesPerOption.map((count, index) =>
            index === selectedOption ? count + 1 : count
          )
        },
        totalVotes: (prev.totalVotes || 0) + 1,
        hasUserVoted: true,
        userVote: selectedOption
      } : null)

      setSelectedOption(null)
      alert('Vote cast successfully!')
    } catch (err) {
      console.error('Error voting:', err)
      alert('Failed to cast vote')
    } finally {
      setVotingLoading(false)
    }
  }

  // Navigation functions
  const navigateToCommunity = () => {
    if (poll?.account.community) {
      router.push(`/community/${poll.account.community.toString()}`)
    }
  }

  const navigateToProfile = (userAddress: string) => {
    router.push(`/profile/${userAddress}`)
  }

  // Load poll data on mount
  useEffect(() => {
    if (readonlyProgram && pollId) {
      fetchPollData()
    }
  }, [readonlyProgram, pollId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="bg-gradient-to-br from-gray-800 to-gray-700 border border-cyber-500/30 rounded-lg shadow p-6 mb-6">
              <div className="h-6 bg-gray-600/50 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-600/50 rounded w-1/2 mb-6"></div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-4 border border-gray-600/50 rounded-lg">
                    <div className="h-4 bg-gray-600/50 rounded w-full mb-2"></div>
                    <div className="h-2 bg-gray-600/50 rounded w-full"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!poll) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-headline font-bold text-gray-200 mb-2">Poll not found</h1>
          <p className="text-gray-400 mb-4">The poll you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gradient-to-r from-cyber-600 to-electric-600 hover:from-cyber-700 hover:to-electric-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-4xl mx-auto p-4">
        {/* Back Navigation */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-400 hover:text-gray-200 mb-6 transition-colors"
        >
          ← Back
        </button>

        {error && (
          <div className="bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-4">
            {error}
            <button 
              onClick={() => setError(null)}
              className="float-right text-red-400 hover:text-red-200"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Poll Content */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-gray-800 to-gray-700 border border-cyber-500/30 rounded-lg shadow-xl p-6">
              {/* Poll Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    poll.isActive
                      ? 'bg-green-900/50 text-green-400 border border-green-500/50'
                      : 'bg-red-900/50 text-red-400 border border-red-500/50'
                  }`}>
                    {poll.isActive ? '🟢 Active' : '🔴 Ended'}
                  </span>
                  <button
                    onClick={navigateToCommunity}
                    className="px-3 py-1 bg-cyber-900/50 text-cyber-400 border border-cyber-500/50 rounded-full text-sm hover:bg-cyber-800/50 transition-colors"
                  >
                    {poll.communityInfo?.name || 'Community'}
                  </button>
                </div>
                <span className="text-sm text-gray-400">
                  Poll #{poll.account.pollId.toString()}
                </span>
              </div>

              {/* Question */}
              <h1 className="text-2xl font-bold text-gray-900 mb-6 leading-relaxed">
                {poll.account.questionUri}
              </h1>

              {/* Voting Section */}
              {poll.isActive && publicKey && !poll.hasUserVoted ? (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-100 mb-4">Cast Your Vote</h3>
                  
                  {/* Membership Check */}
                  <div className="mb-4">
                    {checkingMembership ? (
                      <div className="flex items-center text-gray-400 text-sm">
                        <div className="animate-spin w-4 h-4 border-2 border-cyber-500 border-t-transparent rounded-full mr-2"></div>
                        Checking community membership...
                      </div>
                    ) : !isCommunityMember ? (
                      <div className="bg-yellow-900/50 border border-yellow-500/50 text-yellow-300 p-3 rounded-lg">
                        <div className="flex items-center">
                          <span className="text-yellow-400 mr-2">⚠️</span>
                          <div>
                            <div className="font-medium">Community Membership Required</div>
                            <div className="text-sm">You must be a member of this community to vote in this poll.</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-green-900/50 border border-green-500/50 text-green-300 p-3 rounded-lg">
                        <div className="flex items-center">
                          <span className="text-green-400 mr-2">✓</span>
                          <div className="text-sm">You are a community member and can vote in this poll.</div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {isCommunityMember && (
                    <>
                      <div className="space-y-3">
                        {poll.account.optionProfiles.map((optionPubkey, index) => {
                          const optionProfile = poll.optionProfilesData?.[index]
                          return (
                            <label
                              key={index}
                              className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                selectedOption === index
                                  ? 'border-cyber-500 bg-cyber-900/30 shadow-lg'
                                  : 'border-gray-600 hover:border-cyber-400 hover:bg-gray-700/30'
                              }`}
                            >
                              <input
                                type="radio"
                                name="pollOption"
                                value={index}
                                checked={selectedOption === index}
                                onChange={() => setSelectedOption(index)}
                                className="sr-only"
                              />
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-gradient-to-r from-cyber-500 to-electric-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                                  {optionProfile?.displayName?.charAt(0) || String.fromCharCode(65 + index)}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-100">
                                    {optionProfile?.displayName || `Option ${index + 1}`}
                                  </div>
                                  <div className="text-sm text-gray-400">
                                    {poll.account.votesPerOption[index]} votes
                                  </div>
                                </div>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                      
                      {selectedOption !== null && (
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={handleVote}
                            disabled={votingLoading}
                            className="px-6 py-3 bg-gradient-to-r from-cyber-600 to-electric-600 hover:from-cyber-700 hover:to-electric-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                          >
                            {votingLoading ? 'Casting Vote...' : 'Cast Vote'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                /* Results Section */
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Results</h3>
                  <div className="space-y-4">
                    {poll.account.optionProfiles.map((optionPubkey, index) => {
                      const optionProfile = poll.optionProfilesData?.[index]
                      const voteCount = poll.account.votesPerOption[index]
                      const percentage = poll.totalVotes ? (voteCount / poll.totalVotes) * 100 : 0
                      const isWinning = voteCount === Math.max(...poll.account.votesPerOption)
                      
                      return (
                        <div key={index} className={`p-4 border-2 rounded-lg ${
                          isWinning && poll.totalVotes ? 'border-green-400 bg-green-50' : 'border-gray-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <button
                                onClick={() => navigateToProfile(optionPubkey.toString())}
                                className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold mr-3 hover:shadow-md transition-shadow"
                              >
                                {optionProfile?.displayName?.charAt(0) || String.fromCharCode(65 + index)}
                              </button>
                              <div>
                                <button
                                  onClick={() => navigateToProfile(optionPubkey.toString())}
                                  className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                                >
                                  {optionProfile?.displayName || `Option ${index + 1}`}
                                </button>
                                {poll.hasUserVoted && poll.userVote === index && (
                                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                    Your Vote
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-gray-900">
                                {voteCount} votes
                              </div>
                              <div className="text-sm text-gray-600">
                                {percentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all duration-300 ${
                                isWinning && poll.totalVotes ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Poll Info */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div>
                    Total Votes: <span className="font-medium">{poll.totalVotes}</span>
                  </div>
                  <div>
                    {poll.isActive 
                      ? `Ends: ${new Date(poll.account.endTime.toNumber() * 1000).toLocaleString()}`
                      : `Ended: ${new Date(poll.account.endTime.toNumber() * 1000).toLocaleString()}`
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Community Info */}
            {poll.communityInfo && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Community</h3>
                <button
                  onClick={navigateToCommunity}
                  className="w-full p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all text-left"
                >
                  <div className="font-medium text-gray-900 mb-1">
                    {poll.communityInfo.name}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {poll.communityInfo.descriptionUri}
                  </div>
                  <div className="text-xs text-gray-500">
                    {poll.communityInfo.memberCount.toNumber()} members
                  </div>
                </button>
              </div>
            )}

            {/* Creator Info */}
            {poll.creatorProfile && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Created By</h3>
                <button
                  onClick={() => navigateToProfile(poll.account.createdBy.toString())}
                  className="w-full p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center mb-2">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                      {poll.creatorProfile.displayName?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {poll.creatorProfile.displayName}
                      </div>
                      <div className="text-sm text-gray-500">
                        View Profile
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Poll Stats */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Poll Statistics</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Votes</span>
                  <span className="font-medium">{poll.totalVotes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Options</span>
                  <span className="font-medium">{poll.account.optionProfiles.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`font-medium ${poll.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {poll.isActive ? 'Active' : 'Ended'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created</span>
                  <span className="font-medium text-sm">
                    {new Date(poll.account.createdAt.toNumber() * 1000).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Panel */}
            {!publicKey && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Join the Vote</h3>
                <p className="text-blue-700 text-sm mb-3">
                  Connect your wallet to participate in polls and community discussions.
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
