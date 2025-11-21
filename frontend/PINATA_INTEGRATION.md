# Image Upload Integration with Pinata IPFS

This application now supports image uploads using Pinata IPFS for decentralized storage.

## Features

### Profile Creation
- Upload custom avatar images
- Images are stored on IPFS via Pinata
- Fallback to generated avatars if no image is uploaded
- Preview images before uploading

### Post Creation
- Attach images to posts
- Images are embedded in post content
- Support for multiple image formats (JPEG, PNG, GIF, WebP)
- Image preview before posting

### Image Display
- Images are displayed inline with post content
- Optimized loading with fallback handling
- Responsive design for mobile and desktop

## Setup

### 1. Get Pinata API Credentials
1. Sign up at [Pinata.cloud](https://pinata.cloud/)
2. Go to [API Keys](https://app.pinata.cloud/developers/api-keys)
3. Create a new API key or JWT token

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and add your Pinata credentials:

```bash
# Use JWT (recommended)
NEXT_PUBLIC_PINATA_JWT=your_jwt_token_here

# OR use API Key/Secret
NEXT_PUBLIC_PINATA_API_KEY=your_api_key_here
NEXT_PUBLIC_PINATA_SECRET_API_KEY=your_secret_key_here
```

### 3. Image Upload Limits
- Maximum file size: 10MB
- Supported formats: JPEG, PNG, GIF, WebP
- Files are uploaded to IPFS and accessed via Pinata gateway

## Usage

### Creating Profile with Avatar
1. Connect your wallet
2. If no profile exists, the creation modal will appear
3. Enter display name
4. Upload an image or paste an image URL
5. Preview and create profile

### Adding Images to Posts
1. Click "What's on your mind?" to start composing
2. Type your post content
3. Click the camera icon (📷 Add Image) to select an image
4. Preview the image
5. Post content with embedded image

### Viewing Posts with Images
- Images are displayed inline with post content
- Click images to view full size
- Images load from IPFS via Pinata gateway

## Technical Details

### Image Storage
- Images are uploaded to Pinata IPFS
- IPFS hashes are returned as HTTPS URLs
- Images are accessible via `https://gateway.pinata.cloud/ipfs/{hash}`

### Content Format
- Post content with images uses format: `[Image: {url}]`
- The UI automatically renders these as proper image elements
- Text and images can be mixed in posts

### Error Handling
- Upload failures are handled gracefully
- Invalid file types are rejected
- File size limits are enforced
- Network errors show user-friendly messages

## Security
- API keys are client-side (for demo purposes)
- In production, use server-side proxies for API calls
- JWT tokens are preferred over API key/secret pairs
- Images are public on IPFS once uploaded

## Future Enhancements
- Image compression before upload
- Multiple images per post
- Image galleries
- Video upload support
- Private/encrypted image storage
