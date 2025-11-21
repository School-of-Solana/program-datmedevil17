import axios from 'axios'

// Pinata API configuration
const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY
const PINATA_SECRET_API_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT

interface PinataResponse {
  IpfsHash: string
  PinSize: number
  Timestamp: string
  isDuplicate?: boolean
}

interface UploadOptions {
  name?: string
  keyValues?: Record<string, string>
}

class PinataService {
  private baseURL = 'https://api.pinata.cloud'
  
  private getHeaders() {
    if (PINATA_JWT) {
      return {
        'Authorization': `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json'
      }
    } else if (PINATA_API_KEY && PINATA_SECRET_API_KEY) {
      return {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_API_KEY,
        'Content-Type': 'application/json'
      }
    } else {
      throw new Error('Pinata API credentials not configured')
    }
  }

  private getFileHeaders() {
    if (PINATA_JWT) {
      return {
        'Authorization': `Bearer ${PINATA_JWT}`
      }
    } else if (PINATA_API_KEY && PINATA_SECRET_API_KEY) {
      return {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_API_KEY
      }
    } else {
      throw new Error('Pinata API credentials not configured')
    }
  }

  /**
   * Upload a file to Pinata IPFS
   */
  async uploadFile(file: File, options: UploadOptions = {}): Promise<string> {
    try {
      const formData = new FormData()
      formData.append('file', file)

      // Add metadata
      const metadata = {
        name: options.name || file.name,
        keyvalues: options.keyValues || {}
      }
      formData.append('pinataMetadata', JSON.stringify(metadata))

      // Add pinning options
      const pinataOptions = {
        cidVersion: 0
      }
      formData.append('pinataOptions', JSON.stringify(pinataOptions))

      const response = await axios.post<PinataResponse>(
        `${this.baseURL}/pinning/pinFileToIPFS`,
        formData,
        {
          headers: this.getFileHeaders(),
          maxBodyLength: Infinity
        }
      )

      if (response.data.IpfsHash) {
        return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
      } else {
        throw new Error('No IPFS hash returned from Pinata')
      }
    } catch (error) {
      console.error('Error uploading file to Pinata:', error)
      if (axios.isAxiosError(error)) {
        throw new Error(`Pinata upload failed: ${error.response?.data?.error || error.message}`)
      }
      throw new Error('Failed to upload file to IPFS')
    }
  }

  /**
   * Upload JSON data to Pinata IPFS
   */
  async uploadJSON(data: any, options: UploadOptions = {}): Promise<string> {
    try {
      const body = {
        pinataContent: data,
        pinataMetadata: {
          name: options.name || 'json-upload',
          keyvalues: options.keyValues || {}
        },
        pinataOptions: {
          cidVersion: 0
        }
      }

      const response = await axios.post<PinataResponse>(
        `${this.baseURL}/pinning/pinJSONToIPFS`,
        body,
        {
          headers: this.getHeaders()
        }
      )

      if (response.data.IpfsHash) {
        return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
      } else {
        throw new Error('No IPFS hash returned from Pinata')
      }
    } catch (error) {
      console.error('Error uploading JSON to Pinata:', error)
      if (axios.isAxiosError(error)) {
        throw new Error(`Pinata upload failed: ${error.response?.data?.error || error.message}`)
      }
      throw new Error('Failed to upload JSON to IPFS')
    }
  }

  /**
   * Test Pinata authentication
   */
  async testAuthentication(): Promise<boolean> {
    try {
      await axios.get(`${this.baseURL}/data/testAuthentication`, {
        headers: this.getHeaders()
      })
      return true
    } catch (error) {
      console.error('Pinata authentication test failed:', error)
      return false
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File, maxSizeMB: number = 10): { valid: boolean; error?: string } {
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return { valid: false, error: `File size must be less than ${maxSizeMB}MB` }
    }

    // Check file type for images
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const isImage = allowedImageTypes.includes(file.type)

    if (!isImage) {
      return { valid: false, error: 'Only image files (JPEG, PNG, GIF, WebP) are allowed' }
    }

    return { valid: true }
  }

  /**
   * Generate a thumbnail URL for images
   */
  generateThumbnailUrl(ipfsUrl: string, width: number = 400, height: number = 400): string {
    // Extract the IPFS hash from the URL
    const hash = ipfsUrl.split('/ipfs/')[1]
    if (!hash) return ipfsUrl

    // Return optimized image URL using Pinata's image optimization
    return `https://gateway.pinata.cloud/ipfs/${hash}?img-width=${width}&img-height=${height}&img-fit=crop`
  }
}

// Create and export a singleton instance
export const pinataService = new PinataService()

// Export utility functions for easy use
export const uploadImage = async (file: File, name?: string): Promise<string> => {
  const validation = pinataService.validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }
  
  return await pinataService.uploadFile(file, { name })
}

export const uploadJSON = async (data: any, name?: string): Promise<string> => {
  return await pinataService.uploadJSON(data, { name })
}

export const generateThumbnail = (ipfsUrl: string, width?: number, height?: number): string => {
  return pinataService.generateThumbnailUrl(ipfsUrl, width, height)
}

export default pinataService
