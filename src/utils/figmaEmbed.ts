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

/**
 * Fetch a specific frame's image URL from Figma API.
 * Uses Vite's proxy to avoid CORS issues during development.
 *
 * @param figmaUrl - The Figma URL
 * @param nodeId - The node-id of the frame to fetch
 * @param apiToken - Figma API token
 * @returns Promise<string> - URL of the frame image (proxied)
 */
export async function fetchFigmaFrameImage(
  figmaUrl: string,
  nodeId: string,
  apiToken: string
): Promise<string> {
  // Extract file ID from Figma URL
  const fileIdMatch = figmaUrl.match(/figma\.com\/(?:file|design|proto)\/([a-zA-Z0-9]+)/);
  if (!fileIdMatch) {
    throw new Error('无法从 URL 中提取 Figma 文件 ID');
  }
  const fileId = fileIdMatch[1];

  // Format node-id (Figma API expects "123:456" format)
  const apiNodeId = nodeId.replace('-', ':');

  // Call Figma API via Vite proxy
  const apiUrl = `/api/figma/v1/images/${fileId}?ids=${apiNodeId}&format=png&scale=2`;

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'X-Figma-Token': apiToken,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Figma API 请求失败: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  if (!data.images || !data.images[apiNodeId]) {
    throw new Error('Figma API 未返回图片 URL');
  }

  // Return the image URL directly - browser will fetch it via proxy if needed
  const imageUrl = data.images[apiNodeId];
  
  // Return the direct Figma image URL (it should be accessible without CORS issues)
  return imageUrl;
}

/**
 * Validate Figma API token by making a test request via Vite proxy.
 */
export async function validateFigmaToken(apiToken: string): Promise<boolean> {
  try {
    const response = await fetch('/api/figma/v1/me', {
      method: 'GET',
      headers: {
        'X-Figma-Token': apiToken,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
