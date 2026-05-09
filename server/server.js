const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

/**
 * 截图接口
 * POST /screenshot
 * Body: { url: string, waitForSelector?: string, timeout?: number }
 * Response: { success: boolean, image?: string, error?: string }
 */
app.post('/screenshot', async (req, res) => {
  const { url, waitForSelector = 'body', timeout = 30000 } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: '缺少 URL 参数' });
  }

  let browser;
  try {
    console.log(`📸 正在截图: ${url}`);

    // 启动浏览器
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    // 设置视口大小（模拟常见屏幕尺寸）
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 2, // Retina 显示
    });

    // 导航到目标 URL
    await page.goto(url, {
      waitUntil: 'networkidle2', // 等待网络空闲
      timeout: timeout,
    });

    // 等待指定选择器出现（确保页面渲染完成）
    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: 5000 });
      } catch (err) {
        console.warn(`⚠️ 选择器未找到: ${waitForSelector}，继续截图`);
      }
    }

    // 额外等待 1 秒确保渲染完成
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 截图（完整页面）
    const screenshot = await page.screenshot({
      encoding: 'base64',
      fullPage: true, // 截取完整页面
      type: 'png',
    });

    console.log(`✅ 截图成功: ${url}`);

    res.json({
      success: true,
      image: `data:image/png;base64,${screenshot}`,
    });
  } catch (error) {
    console.error(`❌ 截图失败: ${url}`, error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

/**
 * 健康检查接口
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'screenshot-service' });
});

app.listen(PORT, () => {
  console.log(`🚀 截图服务已启动: http://localhost:${PORT}`);
  console.log(`📸 截图接口: POST http://localhost:${PORT}/screenshot`);
});
