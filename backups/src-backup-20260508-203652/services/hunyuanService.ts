import { ANNOTATION_COLORS } from '../types';

// 混元 API 配置
interface HunyuanConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

// 标注建议（从 AI 分析结果中解析）
export interface AILabelSuggestion {
  id: string;
  type: 'issue' | 'suggestion' | 'praise';
  severity: 'critical' | 'major' | 'minor';
  title: string;
  description: string;
  position: { x: number; y: number };
  category: 'layout' | 'typography' | 'color' | 'spacing' | 'component' | 'responsive' | 'other';
  color: string;
}

// AI 分析结果
export interface AIAnalysisResult {
  success: boolean;
  suggestions: AILabelSuggestion[];
  summary: string;
  overallScore: number; // 0-100，相似度评分
  error?: string;
}

// 默认配置
const DEFAULT_CONFIG: HunyuanConfig = {
  apiKey: import.meta.env.VITE_HUNYUAN_API_KEY || '',
  baseURL: import.meta.env.VITE_HUNYUAN_API_BASE || 'https://api.hunyuan.cloud.tencent.com/hyllm/v1',
  model: import.meta.env.VITE_HUNYUAN_MODEL || 'hunyuan-vision',
};

/**
 * 混元 API 服务类
 */
class HunyuanService {
  private config: HunyuanConfig;

  constructor(config?: Partial<HunyuanConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<HunyuanConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * 检查 API 是否已配置
   */
  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  /**
   * 将图片转换为 base64
   */
  private async imageToBase64(imageUrl: string): Promise<string> {
    try {
      // 如果是已经 base64 的图片，直接返回
      if (imageUrl.startsWith('data:image')) {
        return imageUrl;
      }

      // 如果是本地 URL 或相对路径，需要转为绝对路径后获取
      const absoluteUrl = imageUrl.startsWith('http')
        ? imageUrl
        : `${window.location.origin}${imageUrl}`;

      const response = await fetch(absoluteUrl);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Failed to convert image to base64:', error);
      throw new Error('图片转换失败，请检查图片 URL 是否正确');
    }
  }

  /**
   * 调用混元 API 进行图片分析
   */
  async analyzeImages(
    designImageUrl: string,
    actualImageUrl: string,
    prompt?: string
  ): Promise<AIAnalysisResult> {
    if (!this.isConfigured()) {
      throw new Error('混元 API Key 未配置，请在 .env 文件中设置 VITE_HUNYUAN_API_KEY');
    }

    try {
      // 转换图片为 base64
      const designImage = await this.imageToBase64(designImageUrl);
      const actualImage = await this.imageToBase64(actualImageUrl);

      // 构建默认提示词
      const defaultPrompt = `
你是一位资深的前端开发和 UI/UX 设计专家，请对比分析以下两张图片：
- 第一张是 Figma 设计稿
- 第二张是实际实现的页面截图

请仔细对比两张图片的差异，并从以下维度进行分析：
1. 布局差异（元素位置、对齐、间距）
2. 字体差异（字号、字重、字体家族）
3. 颜色差异（背景色、文字色、边框色）
4. 组件差异（按钮样式、输入框样式等）
5. 响应式问题（元素截断、溢出等）

请返回 JSON 格式的分析结果，格式如下：
{
  "suggestions": [
    {
      "type": "issue",
      "severity": "critical|major|minor",
      "title": "问题标题",
      "description": "详细描述",
      "position": {"x": 100, "y": 100},
      "category": "layout|typography|color|spacing|component|responsive|other"
    }
  ],
  "summary": "总体分析总结",
  "overallScore": 85
}

注意：
- position 是问题在图片上的坐标（像素），请根据第二张图（实际截图）来确定
- overallScore 是相似度评分（0-100），100 表示完全一致
- 只返回 JSON，不要包含其他文本
`;

      const finalPrompt = prompt || defaultPrompt;

      // 构建请求 URL：如果配置了代理则走本地代理，否则直连
      const isProxy = this.config.baseURL.includes('openrouter.ai');
      const apiUrl = isProxy
        ? '/api/openrouter/chat/completions'
        : `${this.config.baseURL}/chat/completions`;

      // 调用 API
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 直连时才在 header 里带 Authorization；走代理时由 Vite 代理统一加
      if (!isProxy) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      // OpenRouter 推荐添加的头部（直连时生效）
      if (isProxy) {
        // 走代理时这些 header 由 vite.config.ts 的 configure 钩子统一注入
      } else {
        headers['HTTP-Referer'] = import.meta.env.VITE_OPENROUTER_SITE_URL || window.location.origin;
        headers['X-Title'] = import.meta.env.VITE_OPENROUTER_SITE_NAME || 'UI-Inspection-Tool';
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: finalPrompt },
                {
                  type: 'image_url',
                  image_url: { url: designImage },
                },
                {
                  type: 'image_url',
                  image_url: { url: actualImage },
                },
              ],
            },
          ],
          temperature: 0.2,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`混元 API 调用失败: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      if (!content) {
        throw new Error('AI 返回内容为空');
      }

      // 解析 JSON 响应（支持多种格式）
      let analysisData: any = null;

      // 方法1: 提取 ```json... ``` 代码块
      const markdownMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (markdownMatch) {
        try {
          analysisData = JSON.parse(markdownMatch[1]);
        } catch (e) {
          console.warn('Markdown JSON 解析失败，尝试直接匹配', e);
        }
      }

      // 方法2: 直接匹配 JSON 对象
      if (!analysisData) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            analysisData = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.warn('直接 JSON 解析失败', e);
          }
        }
      }

      if (!analysisData) {
        console.error('AI 返回内容:', content);
        throw new Error('AI 返回结果无法解析为 JSON，请检查提示词或模型输出');
      }

      // 转换为标准格式
      const suggestions: AILabelSuggestion[] = (analysisData.suggestions || []).map(
        (item: any, index: number) => ({
          id: `ai-${Date.now()}-${index}`,
          type: item.type || 'issue',
          severity: item.severity || 'minor',
          title: item.title || '未命名问题',
          description: item.description || '',
          position: item.position || { x: 100, y: 100 },
          category: item.category || 'other',
          color: this.getColorByType(item.type, item.severity),
        })
      );

      return {
        success: true,
        suggestions,
        summary: analysisData.summary || '分析完成',
        overallScore: analysisData.overallScore || 0,
      };
    } catch (error: any) {
      console.error('AI 分析失败:', error);
      return {
        success: false,
        suggestions: [],
        summary: '',
        overallScore: 0,
        error: error.message || 'AI 分析失败',
      };
    }
  }

  /**
   * 根据类型和严重程度获取颜色
   */
  private getColorByType(type: string, severity: string): string {
    // AI 标注类型对应的颜色
    if (type === 'praise') return '#6BCB77';    // 绿色 - 优点
    if (type === 'suggestion') return '#4ECDC4';  // 青色 - 建议

    // 根据严重程度返回颜色
    switch (severity) {
      case 'critical':
        return '#FF6B6B';  // 红色 - 严重
      case 'major':
        return '#FFD93D';   // 黄色 - 重要
      case 'minor':
        return '#95A5A6';   // 灰色 - 轻微
      default:
        return '#95A5A6';   // 默认灰色
    }
  }

  /**
   * 截图功能（使用 Canvas 截图）
   */
  async captureScreenshot(url: string): Promise<string> {
    // 注意：由于浏览器跨域限制，这里需要使用代理或后端服务
    // MVP 版本：返回提示，建议使用浏览器扩展或手动截图
    throw new Error(
      '自动截图功能需要后端支持。MVP 版本请手动截图后上传。\n' +
      '完整版本将支持通过 Playwright 自动截图。'
    );
  }
}

// 导出单例
const hunyuanService = new HunyuanService();
export default hunyuanService;
