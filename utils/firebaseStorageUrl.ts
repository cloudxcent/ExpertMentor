/**
 * Ensures Firebase Storage URLs are properly formatted for image display
 * Adds alt=media parameter and handles base64 data URLs
 * @param url - Firebase Storage download URL or base64 data URL
 * @returns URL safe for image display
 */
export const ensureMediaUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  // Base64 data URLs work as-is
  if (url.startsWith('data:')) {
    return url;
  }
  
  // If it's already a media URL, return as is
  if (url.includes('alt=media')) {
    return url;
  }
  
  // Add alt=media parameter for Firebase Storage URLs
  return url.includes('?') 
    ? `${url}&alt=media` 
    : `${url}?alt=media`;
};
