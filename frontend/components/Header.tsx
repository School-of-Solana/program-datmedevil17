'use client'
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useWallet } from "@solana/wallet-adapter-react"
import dynamic from "next/dynamic"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useProfile } from "./ProfileProvider"

// Dynamically import WalletMultiButton to avoid hydration issues
const DynamicWalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false }
)

const Header = () => {
  const [mounted, setMounted] = useState(false)
  const { publicKey } = useWallet()
  const { profile, hasProfile, isLoading } = useProfile()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const navigateToProfile = () => {
    if (publicKey) {
      router.push(`/profile/${publicKey.toString()}`)
    }
  }

  return (
    <header className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-cyber-400/20 shadow-lg">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <h1 className="text-2xl font-headline font-bold bg-gradient-to-r from-cyber-400 to-electric-400 bg-clip-text text-transparent">
              SLICK
            </h1>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="/" className="text-gray-300 hover:text-cyber-400 font-medium transition-all duration-200 hover:glow">
              Home
            </a>
            <a href="/explore" className="text-gray-300 hover:text-cyber-400 font-medium transition-all duration-200 hover:glow">
              Explore
            </a>
            <a href="/communities" className="text-gray-300 hover:text-cyber-400 font-medium transition-all duration-200 hover:glow">
              Communities
            </a>
          </div>

          {/* Wallet Connection and Profile */}
          <div className="flex items-center space-x-4">
            {/* Profile Button - only show when wallet is connected */}
            {mounted && publicKey && (
              <div className="flex items-center space-x-3">
                {/* Profile Status Indicator */}
                {isLoading ? (
                  <div className="flex items-center space-x-2 px-3 py-2 text-gray-400">
                    <div className="w-4 h-4 border-2 border-cyber-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="hidden lg:inline text-sm">Loading...</span>
                  </div>
                ) : hasProfile ? (
                  <button
                    onClick={navigateToProfile}
                    className="flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-cyber-400 font-medium transition-all duration-200 rounded-lg hover:bg-gray-800/50 border border-transparent hover:border-cyber-400/30"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-cyber-500 to-electric-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      {profile?.displayName?.charAt(0) || publicKey.toString().charAt(0)}
                    </div>
                    <div className="hidden lg:block text-left">
                      <div className="text-sm font-medium">{profile?.displayName || 'Profile'}</div>
                      <div className="text-xs text-gray-400">View Profile</div>
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2 px-3 py-2 text-electric-400 bg-electric-900/20 rounded-lg border border-electric-400/30">
                    <div className="w-8 h-8 bg-electric-500/20 rounded-full flex items-center justify-center border border-electric-400/50">
                      <span className="text-electric-400 text-sm">!</span>
                    </div>
                    <span className="hidden lg:inline text-sm font-medium">Profile needed</span>
                  </div>
                )}
              </div>
            )}

            {/* Wallet Connection */}
            {mounted ? (
              <DynamicWalletMultiButton className="!bg-gradient-to-r !from-cyber-600 !to-electric-600 hover:!from-cyber-700 hover:!to-electric-700 !rounded-lg !text-sm !font-medium !px-6 !py-2 !transition-all !duration-200 !shadow-lg hover:!shadow-cyber-500/25 !border !border-cyber-500/30" />
            ) : (
              <div className="bg-gradient-to-r from-cyber-600 to-electric-600 rounded-lg text-sm font-medium px-6 py-2 text-white shadow-lg animate-pulse">
                Select Wallet
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="text-gray-400 hover:text-cyber-400 focus:outline-none focus:text-cyber-400 transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </header>
  )
}

export default Header
