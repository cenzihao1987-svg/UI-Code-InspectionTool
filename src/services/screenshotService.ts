/**
 * 截图服务客户端
 * 用于调用后端截图 API
 */

const SCREENSHOT_SERVICE_URL = 'http://localhost:3001';

/**
 * 调用后端服务截图
 * @param url - 要截图的 URL
 * @param waitForSelector - 等待选择器（可选）
 * @returns Promise<{ success: boolean, image?: string, error?: string }>
 */
export async function captureScreenshot(
  url: string,
  waitForSelector: string = 'body'
): Promise<{ success: boolean; image?: string; error?: string }> {
  try {
    const response = await fetch(`${SCREENSHOT_SERVICE_URL}/screenshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        waitForSelector,
        timeout: 30000,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('截图服务调用失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '截图服务不可用',
    };
  }
}

/**
 * 检查截图服务是否可用
 */
export async function isScreenshotServiceAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${SCREENSHOT_SERVICE_URL}/health`, {
      method: 'GET',
    });
    const data = await response.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}
