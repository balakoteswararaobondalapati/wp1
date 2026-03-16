/**
 * Safe clipboard copy utility with fallback for when Clipboard API is blocked
 * Uses document.execCommand('copy') as fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern Clipboard API first (only if available and not blocked)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Clipboard API blocked, fall through to fallback
      console.log('Clipboard API blocked, using fallback method');
    }
  }

  // Fallback: Use document.execCommand (works in all browsers)
  return textareaCopyFallback(text);
}

/**
 * Fallback clipboard copy using textarea and execCommand
 * Works even when Clipboard API is blocked by permissions policy
 */
function textareaCopyFallback(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';
  textarea.setAttribute('readonly', '');
  
  document.body.appendChild(textarea);
  
  try {
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    document.body.removeChild(textarea);
    console.error('Fallback copy failed:', err);
    return false;
  }
}
