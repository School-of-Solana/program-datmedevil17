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
    <header className="w-full bg-white border-b border-gray-200 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">Slick</h1>
          </div>

          {/* Navigation Links - You can add tabs here */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="/" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              Home
            </a>
            <a href="/explore" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              Explore
            </a>
            <a href="/communities" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              Communities
            </a>
            <a href="/polls" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              Polls
            </a>
            {/* Add more navigation tabs here as needed */}
          </div>

          {/* Wallet Connection and Profile */}
          <div className="flex items-center space-x-4">
            {/* Profile Button - only show when wallet is connected */}
            {mounted && publicKey && (
              <div className="flex items-center space-x-3">
                {/* Profile Status Indicator */}
                {isLoading ? (
                  <div className="flex items-center space-x-2 px-3 py-2 text-gray-500">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="hidden lg:inline text-sm">Loading...</span>
                  </div>
                ) : hasProfile ? (
                  <button
                    onClick={navigateToProfile}
                    className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors rounded-lg hover:bg-gray-50"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {profile?.displayName?.charAt(0) || publicKey.toString().charAt(0)}
                    </div>
                    <div className="hidden lg:block text-left">
                      <div className="text-sm font-medium">{profile?.displayName || 'Profile'}</div>
                      <div className="text-xs text-gray-500">View Profile</div>
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2 px-3 py-2 text-amber-600">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                      <span className="text-amber-600 text-sm">!</span>
                    </div>
                    <span className="hidden lg:inline text-sm font-medium">Profile needed</span>
                  </div>
                )}
              </div>
            )}

            {/* Wallet Connection */}
            {mounted ? (
              <DynamicWalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !rounded-lg !text-sm !font-medium !px-4 !py-2 !transition-colors" />
            ) : (
              <div className="bg-blue-600 rounded-lg text-sm font-medium px-4 py-2 text-white">
                Select Wallet
              </div>
            )}
          </div>

          {/* Mobile menu button - for future mobile navigation */}
          <div className="md:hidden">
            <button
              type="button"
              className="text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700"
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
