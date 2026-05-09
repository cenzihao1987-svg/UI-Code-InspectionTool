/**
 * Figma API 集成
 * 使用 Figma API 导出设计稿图片（比截图更准确）
 * 
 * 文档：https://www.figma.com/developers/api#images-endpoints
 */

const FIGMA_API_BASE = 'https://api.figma.com/v1';

export interface FigmaFileInfo {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
}

export interface FigmaImageExport {
  err: string | null;
  images: Record<string, string>; // nodeId -> imageUrl
}

/**
 * 从 Figma URL 中提取文件 ID 和节点 ID
 * 
 * URL 格式：
 * - https://www.figma.com/file/FILE_ID/name?node-id=NODE_ID
 * - https://www.figma.com/design/FILE_ID/name?node-id=NODE_ID
 */
export function parseFigmaUrl(url: string): { fileId: string; nodeId: string | null } | null {
  try {
    const urlObj = new URL(url);
    
    // 检查是否是 Figma URL
    if (!urlObj.hostname.includes('figma.com')) {
      return null;
    }

    // 提取文件 ID
    // URL 格式: /file/FILE_ID/... 或 /design/FILE_ID/...
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const fileIdIndex = pathParts.findIndex(
      (part) => part === 'file' || part === 'design'
    );
    
    if (fileIdIndex === -1 || fileIdIndex + 1 >= pathParts.length) {
      return null;
    }

    const fileId = pathParts[fileIdIndex + 1];
    
    // 提取节点 ID（从 query string）
    const nodeId = urlObj.searchParams.get('node-id');
    
    return { fileId, nodeId };
  } catch {
    return null;
  }
}

/**
 * 获取 Figma 文件信息
 */
async function getFigmaFileInfo(
  fileId: string,
  accessToken: string
): Promise<FigmaFileInfo | null> {
  try {
    const response = await fetch(`${FIGMA_API_BASE}/files/${fileId}`, {
      headers: {
        'X-Figma-Token': accessToken,
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API 错误: ${response.status}`);
    }

    const data = await response.json();
    return {
      name: data.name,
      lastModified: data.lastModified,
      thumbnailUrl: data.thumbnailUrl,
    };
  } catch (error) {
    console.error('获取 Figma 文件信息失败:', error);
    return null;
  }
}

/**
 * 导出 Figma 节点为图片
 * @param fileId - Figma 文件 ID
 * @param nodeIds - 要导出的节点 ID 数组
 * @param accessToken - Figma Access Token
 * @param format - 图片格式 (png/jpg/svg/pdf)
 * @param scale - 缩放比例 (1, 2, 3, 4)
 */
export async function exportFigmaImages(
  fileId: string,
  nodeIds: string[],
  accessToken: string,
  format: 'png' | 'jpg' | 'svg' | 'pdf' = 'png',
  scale: number = 2
): Promise<Record<string, string> | null> {
  try {
    // 格式化节点 ID（Figma API 需要特定格式）
    // URL 中的 node-id=123-456 需要转换为 123:456
    const formattedNodeIds = nodeIds.map((id) => id.replace(/-/g, ':'));

    const params = new URLSearchParams({
      ids: formattedNodeIds.join(','),
      format,
      scale: String(scale),
    });

    const response = await fetch(
      `${FIGMA_API_BASE}/images/${fileId}?${params.toString()}`,
      {
        headers: {
          'X-Figma-Token': accessToken,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Figma API 错误: ${response.status}`);
    }

    const data: FigmaImageExport = await response.json();
    
    if (data.err) {
      throw new Error(`Figma API 返回错误: ${data.err}`);
    }

    // 将 URL 转换为 base64（避免 CORS 问题）
    const images: Record<string, string> = {};
    for (const [nodeId, imageUrl] of Object.entries(data.images)) {
      if (imageUrl) {
        try {
          // 尝试获取图片并转换为 base64
          const imgResponse = await fetch(imageUrl);
          const blob = await imgResponse.blob();
          
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          
          images[nodeId] = base64;
        } catch {
          // 如果转换失败，使用原始 URL
          console.warn(`无法转换图片为 base64: ${imageUrl}`);
          images[nodeId] = imageUrl;
        }
      }
    }

    return images;
  } catch (error) {
    console.error('导出 Figma 图片失败:', error);
    return null;
  }
}

/**
 * 智能处理 Figma 链接
 * 1. 如果有 Access Token，使用 Figma API 导出
 * 2. 如果没有 Token，返回 null 并提示用户
 */
export async function processFigmaUrl(
  figmaUrl: string,
  accessToken?: string
): Promise<{
  success: boolean;
  imageData?: string;
  error?: string;
  needToken?: boolean;
}> {
  const parsed = parseFigmaUrl(figmaUrl);
  
  if (!parsed) {
    return {
      success: false,
      error: '无效的 Figma URL',
    };
  }

  const { fileId, nodeId } = parsed;

  // 如果没有提供 Access Token
  if (!accessToken) {
    return {
      success: false,
      needToken: true,
      error: '需要 Figma Access Token 才能导出设计稿图片',
    };
  }

  // 使用 Figma API 导出
  const nodeIds = nodeId ? [nodeId] : [];
  
  if (nodeIds.length === 0) {
    // 如果没有指定节点，获取文件缩略图
    const fileInfo = await getFigmaFileInfo(fileId, accessToken);
    if (fileInfo?.thumbnailUrl) {
      try {
        const response = await fetch(fileInfo.thumbnailUrl);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        return { success: true, imageData: base64 };
      } catch {
        return {
          success: false,
          error: '无法获取文件缩略图',
        };
      }
    }
  }

  // 导出指定节点
  const images = await exportFigmaImages(fileId, nodeIds, accessToken);
  
  if (!images || Object.keys(images).length === 0) {
    return {
      success: false,
      error: '导出失败，请检查 Figma 链接和 Access Token',
    };
  }

  // 返回第一张图片
  const firstImage = Object.values(images)[0];
  return { success: true, imageData: firstImage };
}
