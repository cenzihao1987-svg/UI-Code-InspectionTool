/**
 * Build a Figma embed URL from a user-provided Figma link.
 * Supports focusing on a specific frame via node-id.
 */
export function buildFigmaEmbedUrl(rawUrl: string, nodeId?: string): string {
  let url = rawUrl.trim();

  // Remove trailing slash (but keep query params)
  if (!url.includes('?') && url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  // If a node-id is provided and not already in the URL, append it
  if (nodeId && !url.includes('node-id=')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}node-id=${nodeId}`;
  }

  // Extract the final node-id (from param or from URL)
  const finalNodeId = nodeId || parseNodeId(url);

  // Encode the Figma URL
  const encodedUrl = encodeURIComponent(url);

  // Build embed URL - IMPORTANT: pass node-id as a direct parameter to the embed endpoint
  // This ensures Figma focuses on the specified frame only
  let embedUrl = `https://www.figma.com/embed?embed_host=astra&url=${encodedUrl}`;

  if (finalNodeId) {
    // Format node-id correctly (Figma expects "123-456" in URLs, not "123:456")
    const formattedNodeId = finalNodeId.replace(':', '-');
    embedUrl += `&node-id=${formattedNodeId}`;
  }

  return embedUrl;
}

/**
 * Validate that a string looks like a valid Figma URL.
 * Supports modern Figma paths: /file/, /design/, /proto/, /community/file/
 */
export function isValidFigmaUrl(url: string): boolean {
  const trimmed = url.trim();
  // Figma支持多种URL格式：
  //   https://www.figma.com/file/XXX/Name
  //   https://www.figma.com/design/XXX/Name        ← 新版默认路径
  //   https://www.figma.com/proto/XXX/Name
  //   https://www.figma.com/community/file/XXX/Name
  // 可能带 ?node-id=... 等查询参数
  const figmaPattern = /^https?:\/\/([\w-]+\.)?figma\.com\/(community\/)?(file|design|proto)\/[\w-]+/;
  return figmaPattern.test(trimmed);
}

/**
 * Parse node-id from a Figma URL (e.g. ?node-id=123-456 or &node-id=123%3A456)
 * Returns the raw node-id string, or null if not found.
 */
export function parseNodeId(url: string): string | null {
  const trimmed = url.trim();
  // Match node-id in query params: ?node-id=XXX or &node-id=XXX
  const match = trimmed.match(/[?&]node-id=([^&]+)/);
  if (match) {
    return decodeURIComponent(match[1]);
  }
  return null;
}
