// Image compression and base64 conversion utilities
// Compresses images to stay within Firestore's 1MB document limit

/**
 * Compresses an image file and converts it to base64
 * @param file - The image file to compress
 * @param maxWidth - Maximum width in pixels (default: 1920)
 * @param maxHeight - Maximum height in pixels (default: 1920)
 * @param quality - JPEG quality 0-1 (default: 0.85)
 * @param maxSizeKB - Maximum size in KB after compression (default: 600KB to account for base64 + encryption overhead)
 * @returns Promise<string> - Base64 data URI (data:image/jpeg;base64,...)
 */
export async function compressImageToBase64(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.85,
  maxSizeKB: number = 600
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width
        let height = img.height
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }
        
        // Draw image with better quality settings
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert to base64 with compression
        // Try different quality levels if size is too large
        const tryCompress = (currentQuality: number): void => {
          const base64 = canvas.toDataURL('image/jpeg', currentQuality)
          const base64SizeKB = (base64.length * 3) / 4 / 1024 // Approximate size in KB
          
          if (base64SizeKB <= maxSizeKB || currentQuality <= 0.3) {
            resolve(base64)
          } else {
            // Reduce quality and try again
            tryCompress(currentQuality - 0.1)
          }
        }
        
        tryCompress(quality)
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
      
      if (e.target?.result) {
        img.src = e.target.result as string
      } else {
        reject(new Error('Failed to read file'))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * Extracts base64 string from data URI
 * @param dataUri - Data URI (data:image/jpeg;base64,...)
 * @returns Base64 string without the data URI prefix
 */
export function extractBase64FromDataUri(dataUri: string): string {
  const commaIndex = dataUri.indexOf(',')
  if (commaIndex === -1) return dataUri
  return dataUri.substring(commaIndex + 1)
}

/**
 * Creates data URI from base64 string and mime type
 * @param base64 - Base64 string
 * @param mimeType - MIME type (default: image/jpeg)
 * @returns Data URI
 */
export function createDataUriFromBase64(base64: string, mimeType: string = 'image/jpeg'): string {
  // If already a data URI, return as is
  if (base64.startsWith('data:')) {
    return base64
  }
  return `data:${mimeType};base64,${base64}`
}

