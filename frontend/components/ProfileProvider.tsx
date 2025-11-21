'use client'
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { 
  getProvider, 
  getProviderReadonly, 
  fetchProfile,
  createProfile
} from '@/services'

interface ProfileContextType {
  profile: any | null
  hasProfile: boolean
  isLoading: boolean
  showCreateProfile: boolean
  setShowCreateProfile: (show: boolean) => void
  createUserProfile: (displayName: string, avatarUri: string) => Promise<boolean>
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  hasProfile: false,
  isLoading: false,
  showCreateProfile: false,
  setShowCreateProfile: () => {},
  createUserProfile: async () => false
})

export const useProfile = () => {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { publicKey, signTransaction, sendTransaction, connected } = useWallet()
  
  const [profile, setProfile] = useState<any | null>(null)
  const [hasProfile, setHasProfile] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateProfile, setShowCreateProfile] = useState(false)

  // Program instances
  const readonlyProgram = useMemo(() => getProviderReadonly(), [])
  const program = useMemo(() => {
    if (publicKey && signTransaction && sendTransaction) {
      return getProvider(publicKey, signTransaction, sendTransaction)
    }
    return null
  }, [publicKey, signTransaction, sendTransaction])

  // Check for existing profile when wallet connects
  useEffect(() => {
    const checkProfile = async () => {
      if (!publicKey || !connected || !readonlyProgram) {
        setProfile(null)
        setHasProfile(false)
        setShowCreateProfile(false)
        return
      }

      setIsLoading(true)
      try {
        const userProfile = await fetchProfile(readonlyProgram, publicKey)
        
        if (userProfile) {
          setProfile(userProfile)
          setHasProfile(true)
          setShowCreateProfile(false)
        } else {
          setProfile(null)
          setHasProfile(false)
          // Show create profile modal after a short delay to ensure wallet is fully connected
          setTimeout(() => {
            setShowCreateProfile(true)
          }, 1000)
        }
      } catch (error) {
        console.error('Error checking profile:', error)
        setProfile(null)
        setHasProfile(false)
        setShowCreateProfile(true)
      } finally {
        setIsLoading(false)
      }
    }

    checkProfile()
  }, [publicKey, connected, readonlyProgram])

  // Create new profile
  const createUserProfile = async (displayName: string, avatarUri: string): Promise<boolean> => {
    if (!program || !publicKey) {
      console.error('Program or publicKey not available')
      return false
    }

    try {
      setIsLoading(true)
      
      await createProfile(program, publicKey, displayName, avatarUri)
      
      // Fetch the newly created profile
      const newProfile = await fetchProfile(readonlyProgram!, publicKey)
      
      if (newProfile) {
        setProfile(newProfile)
        setHasProfile(true)
        setShowCreateProfile(false)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error creating profile:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const contextValue: ProfileContextType = {
    profile,
    hasProfile,
    isLoading,
    showCreateProfile,
    setShowCreateProfile,
    createUserProfile
  }

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  )
}
