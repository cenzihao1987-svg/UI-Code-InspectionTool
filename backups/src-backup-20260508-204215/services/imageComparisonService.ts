import { ANNOTATION_COLORS } from '../types';

// 标注建议（从图像对比结果中生成）
export interface AILabelSuggestion {
  id: string;
  type: 'issue' | 'suggestion' | 'praise';
  severity: 'critical' | 'major' | 'minor';
  title: string;
  description: string;
  position: { x: number; y: number };
  category: 'layout' | 'typography' | 'color' | 'spacing' | 'component' | 'responsive' | 'other';
  color: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

// 图像对比结果
export interface ImageComparisonResult {
  success: boolean;
  suggestions: AILabelSuggestion[];
  summary: string;
  overallScore: number; // 0-100，相似度评分
  diffImageUrl?: string; // 差异可视化图片 URL
  stats: {
    totalPixels: number;
    diffPixels: number;
    diffPercentage: number;
    matchedPixels: number;
  };
  error?: string;
}

// 差异区域
interface DiffRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  diffCount: number;
}

/**
 * 图像对比服务类（传统算法，无 AI）
 */
class ImageComparisonService {
  /**
   * 对比两张图片，生成差异报告
   */
  async compareImages(
    designImageUrl: string,
    actualImageUrl: string,
    options?: {
      threshold?: number; // 像素差异阈值 (0-255)，默认 30
      maxDiffPercentage?: number; // 最大差异百分比，默认 10%
    }
  ): Promise<ImageComparisonResult> {
    const threshold = options?.threshold || 30;
    const maxDiffPercentage = options?.maxDiffPercentage || 10;

    try {
      // 1. 加载两张图片
      const designImg = await this.loadImage(designImageUrl);
      const actualImg = await this.loadImage(actualImageUrl);

      // 2. 创建 Canvas 进行对比
      const { diffRegions, diffCanvas, stats } = await this.pixelCompare(
        designImg,
        actualImg,
        threshold
      );

      // 3. 生成标注建议
      const suggestions = this.generateSuggestions(diffRegions, stats);

      // 4. 计算相似度评分
      const overallScore = Math.max(0, 100 - stats.diffPercentage * 5);

      // 5. 生成差异图片 URL
      const diffImageUrl = diffCanvas.toDataURL('image/png');

      // 6. 生成总结
      const summary = this.generateSummary(stats, diffRegions);

      return {
        success: true,
        suggestions,
        summary,
        overallScore,
        diffImageUrl,
        stats,
      };
    } catch (error: any) {
      console.error('图像对比失败:', error);
      return {
        success: false,
        suggestions: [],
        summary: '',
        overallScore: 0,
        stats: {
          totalPixels: 0,
          diffPixels: 0,
          diffPercentage: 100,
          matchedPixels: 0,
        },
        error: error.message || '图像对比失败',
      };
    }
  }

  /**
   * 加载图片
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // 处理跨域
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(new Error(`图片加载失败: ${url}`));
      img.src = url;
    });
  }

  /**
   * 像素级对比
   */
  private async pixelCompare(
    designImg: HTMLImageElement,
    actualImg: HTMLImageElement,
    threshold: number
  ): Promise<{
    diffRegions: DiffRegion[];
    diffCanvas: HTMLCanvasElement;
    stats: ImageComparisonResult['stats'];
  }> {
    // 创建 Canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // 使用设计稿的尺寸作为标准
    const width = designImg.width;
    const height = designImg.height;
    canvas.width = width;
    canvas.height = height;

    // 绘制设计稿
    ctx.drawImage(designImg, 0, 0, width, height);
    const designData = ctx.getImageData(0, 0, width, height).data;

    // 绘制实际截图（可能需要缩放）
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(actualImg, 0, 0, width, height);
    const actualData = ctx.getImageData(0, 0, width, height).data;

    // 创建差异 Canvas
    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = width;
    diffCanvas.height = height;
    const diffCtx = diffCanvas.getContext('2d')!;
    const diffImageData = diffCtx.createImageData(width, height);
    const diffData = diffImageData.data;

    // 像素级对比
    let diffCount = 0;
    const diffPixels: boolean[] = new Array(width * height).fill(false);

    for (let i = 0; i < designData.length; i += 4) {
      const pixelIndex = i / 4;
      const dR = designData[i];
      const dG = designData[i + 1];
      const dB = designData[i + 2];
      const dA = designData[i + 3];

      const aR = actualData[i];
      const aG = actualData[i + 1];
      const aB = actualData[i + 2];
      const aA = actualData[i + 3];

      // 计算像素差异
      const diff = Math.abs(dR - aR) + Math.abs(dG - aG) + Math.abs(dB - aB) + Math.abs(dA - aA);

      if (diff > threshold * 4) { // 阈值 * 4 因为 4 个通道
        diffCount++;
        diffPixels[pixelIndex] = true;

        // 红色标记差异
        diffData[i] = 255; // R
        diffData[i + 1] = 0; // G
        diffData[i + 2] = 0; // B
        diffData[i + 3] = 128; // A (半透明)
      } else {
        // 透明（无差异）
        diffData[i] = 0;
        diffData[i + 1] = 0;
        diffData[i + 2] = 0;
        diffData[i + 3] = 0;
      }
    }

    diffCtx.putImageData(diffImageData, 0, 0);

    // 检测差异区域
    const diffRegions = this.detectDiffRegions(diffPixels, width, height);

    // 统计数据
    const totalPixels = width * height;
    const diffPercentage = (diffCount / totalPixels) * 100;
    const stats = {
      totalPixels,
      diffPixels: diffCount,
      diffPercentage,
      matchedPixels: totalPixels - diffCount,
    };

    return { diffRegions, diffCanvas, stats };
  }

  /**
   * 检测差异区域（连通域分析）
   */
  private detectDiffRegions(
    diffPixels: boolean[],
    width: number,
    height: number
  ): DiffRegion[] {
    const visited: boolean[] = new Array(width * height).fill(false);
    const regions: DiffRegion[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        if (diffPixels[idx] && !visited[idx]) {
          // BFS 查找连通域
          const queue: [number, number][] = [[x, y]];
          let minX = x, minY = y, maxX = x, maxY = y;
          let regionDiffCount = 0;

          while (queue.length > 0) {
            const [cx, cy] = queue.shift()!;
            const cidx = cy * width + cx;

            if (visited[cidx] || !diffPixels[cidx]) continue;

            visited[cidx] = true;
            regionDiffCount++;

            minX = Math.min(minX, cx);
            minY = Math.min(minY, cy);
            maxX = Math.max(maxX, cx);
            maxY = Math.max(maxY, cy);

            // 4 连通
            if (cx > 0) queue.push([cx - 1, cy]);
            if (cx < width - 1) queue.push([cx + 1, cy]);
            if (cy > 0) queue.push([cx, cy - 1]);
            if (cy < height - 1) queue.push([cx, cy + 1]);
          }

          // 只保留足够大的区域（过滤噪点）
          if (regionDiffCount > 50) {
            regions.push({
              x: minX,
              y: minY,
              width: maxX - minX + 1,
              height: maxY - minY + 1,
              diffCount: regionDiffCount,
            });
          }
        }
      }
    }

    return regions;
  }

  /**
   * 生成标注建议
   */
  private generateSuggestions(
    diffRegions: DiffRegion[],
    stats: ImageComparisonResult['stats']
  ): AILabelSuggestion[] {
    const suggestions: AILabelSuggestion[] = [];

    // 为每个差异区域生成标注
    diffRegions.forEach((region, index) => {
      const severity = region.diffCount > 1000 ? 'critical' : region.diffCount > 500 ? 'major' : 'minor';
      const category = this.inferCategory(region);

      suggestions.push({
        id: `diff-${Date.now()}-${index}`,
        type: 'issue',
        severity,
        title: `差异区域 #${index + 1}`,
        description: `发现 ${region.diffCount} 个像素差异，位于 (${region.x}, ${region.y})，${category} 可能存在问题`,
        position: { x: region.x + region.width / 2, y: region.y + region.height / 2 },
        category,
        color: this.getColorBySeverity(severity),
        boundingBox: {
          x: region.x,
          y: region.y,
          width: region.width,
          height: region.height,
        },
      });
    });

    // 如果差异过多，添加总结性建议
    if (stats.diffPercentage > 5) {
      suggestions.push({
        id: `diff-summary-${Date.now()}`,
        type: 'issue',
        severity: stats.diffPercentage > 15 ? 'critical' : 'major',
        title: '整体差异较大',
        description: `总差异占比 ${stats.diffPercentage.toFixed(2)}%，建议仔细检查实现是否符合设计稿`,
        position: { x: 100, y: 100 },
        category: 'other',
        color: this.getColorBySeverity(stats.diffPercentage > 15 ? 'critical' : 'major'),
      });
    }

    return suggestions;
  }

  /**
   * 推断差异类别
   */
  private inferCategory(region: DiffRegion): AILabelSuggestion['category'] {
    // 简单的启发式规则
    const aspectRatio = region.width / region.height;

    if (aspectRatio > 5) return 'layout'; // 横向长条可能是布局问题
    if (region.width < 50 && region.height < 50) return 'typography'; // 小区域可能是文字
    if (region.width > 200 && region.height > 200) return 'component'; // 大区域可能是组件

    return 'other';
  }

  /**
   * 根据严重程度获取颜色
   */
  private getColorBySeverity(severity: string): string {
    switch (severity) {
      case 'critical':
        return '#FF6B6B'; // 红色
      case 'major':
        return '#FFD93D'; // 黄色
      case 'minor':
        return '#95A5A6'; // 灰色
      default:
        return '#95A5A6';
    }
  }

  /**
   * 生成总结
   */
  private generateSummary(
    stats: ImageComparisonResult['stats'],
    diffRegions: DiffRegion[]
  ): string {
    const lines: string[] = [];

    lines.push(`## 图像对比报告`);
    lines.push(``);
    lines.push(`- 总像素数：${stats.totalPixels.toLocaleString()}`);
    lines.push(`- 差异像素数：${stats.diffPixels.toLocaleString()}`);
    lines.push(`- 差异占比：${stats.diffPercentage.toFixed(2)}%`);
    lines.push(`- 匹配像素数：${stats.matchedPixels.toLocaleString()}`);
    lines.push(`- 差异区域数：${diffRegions.length}`);
    lines.push(``);

    if (stats.diffPercentage === 0) {
      lines.push(`✅ **完美匹配**：两张图片完全一致！`);
    } else if (stats.diffPercentage < 1) {
      lines.push(`✅ **高度一致**：差异极小（<1%），可能是压缩或舍入误差`);
    } else if (stats.diffPercentage < 5) {
      lines.push(`⚠️ **轻微差异**：存在一些小差异，建议检查`);
    } else if (stats.diffPercentage < 15) {
      lines.push(`⚠️ **明显差异**：差异较明显，需要改进`);
    } else {
      lines.push(`❌ **严重差异**：差异很大，实现与设计稿严重不符`);
    }

    return lines.join('\n');
  }
}

// 导出单例
const imageComparisonService = new ImageComparisonService();
export default imageComparisonService;
