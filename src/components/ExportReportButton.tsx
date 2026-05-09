import React, { useState } from 'react';
import {
  Button,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { Annotation, ANNOTATION_COLORS } from '../types';

/**
 * 检查是否为图片 URL
 */
function isImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    return /\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)$/i.test(pathname);
  } catch {
    return false;
  }
}

/**
 * 尝试加载外部图片为 base64（避免 CORS 问题）
 */
async function loadImageAsBase64(src: string): Promise<string | null> {
  if (src.startsWith('data:')) {
    return src;
  }

  if (!isImageUrl(src)) {
    return null;
  }

  try {
    const response = await fetch(src, { mode: 'cors' });
    if (!response.ok) throw new Error('Fetch failed');
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    });
  } catch {
    console.warn('无法通过 fetch 加载图片，将尝试直接使用原始 URL:', src);
    return src; // 返回原始 URL，让 html2canvas 尝试处理
  }
}

/**
 * 检查后端截图服务是否可用
 */
async function checkBackendService(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3001/health', {
      mode: 'cors',
      signal: AbortSignal.timeout(2000), // 2秒超时
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 使用后端服务截图网页
 */
async function captureWebpage(url: string): Promise<string | null> {
  try {
    console.log('[Export] 尝试截图网页:', url);
    const response = await fetch('http://localhost:3001/screenshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, waitForSelector: 'body', timeout: 30000 }),
      signal: AbortSignal.timeout(35000), // 35秒超时
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '截图失败');
    }

    const data = await response.json();
    if (data.success && data.image) {
      console.log('[Export] 网页截图成功');
      return data.image;
    }
    return null;
  } catch (error) {
    console.error('[Export] 网页截图失败:', error);
    return null;
  }
}

interface ExportReportButtonProps {
  annotations: Annotation[];
  screenshotSrc: string | null;
  designImageSrc: string | null;
  figmaEmbedUrl: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  size: '尺寸',
  spacing: '间距',
  color: '颜色',
  alignment: '对齐',
  typography: '文字',
  other: '其他',
};

const SEVERITY_LABELS: Record<string, string> = {
  minor: '轻微',
  moderate: '中等',
  major: '严重',
};

export default function ExportReportButton({
  annotations,
  screenshotSrc,
  designImageSrc,
  figmaEmbedUrl,
}: ExportReportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!screenshotSrc) {
      alert('请先上传截图');
      return;
    }
    if (!designImageSrc && !figmaEmbedUrl) {
      alert('请先加载设计稿（上传图片或输入 Figma 链接）');
      return;
    }

    setExporting(true);

    try {
      console.log('[Export] 开始导出...', { 
        hasDesignImage: !!designImageSrc, 
        hasFigmaUrl: !!figmaEmbedUrl,
        designImageSrcType: designImageSrc ? (designImageSrc.startsWith('data:') ? 'base64' : 'url') : 'none'
      });
      
      // ===== 智能处理设计稿 URL =====
      let processedDesignImageSrc: string | null = null;
      let designImageWarning: string | null = null;

      // 情况 1：有设计稿图片（可能是 URL）
      if (designImageSrc) {
        console.log('[Export] 处理设计稿:', designImageSrc.substring(0, 100));
        
        // 如果是 base64 数据，直接使用
        if (designImageSrc.startsWith('data:')) {
          console.log('[Export] 设计稿是 base64 数据，直接使用');
          processedDesignImageSrc = designImageSrc;
        } else {
          // 是外部 URL
          const figmaParsed = parseFigmaUrl(designImageSrc);
          console.log('[Export] Figma 解析结果:', figmaParsed);
          
          if (figmaParsed) {
            // 是 Figma URL - 尝试使用 Figma API 导出
            const figmaToken = localStorage.getItem('figma_access_token');
            console.log('[Export] 检测到 Figma URL，Token 状态:', figmaToken ? '已配置' : '未配置');
            
            const figmaResult = await processFigmaUrl(designImageSrc, figmaToken || undefined);
            console.log('[Export] Figma API 结果:', figmaResult);
            
            if (figmaResult.success && figmaResult.imageData) {
              console.log('[Export] Figma 图片获取成功');
              processedDesignImageSrc = figmaResult.imageData;
            } else if (figmaResult.needToken) {
              designImageWarning = '需要 Figma Access Token 才能导出设计稿图片。请在设置中配置 Token，或上传设计稿图片。';
            } else {
              designImageWarning = `Figma 设计稿导出失败: ${figmaResult.error}。请上传设计稿图片。`;
            }
          } else if (isImageUrl(designImageSrc)) {
            // 是图片 URL - 尝试加载
            console.log('[Export] 检测到图片 URL，尝试加载...');
            const base64 = await loadImageAsBase64(designImageSrc);
            if (base64) {
              console.log('[Export] 图片加载成功');
              processedDesignImageSrc = base64;
            } else {
              designImageWarning = '设计稿图片加载失败（可能是跨域限制）。请尝试上传图片文件。';
            }
          } else {
            // 是其他网页 URL - 尝试使用后端服务截图
            console.log('[Export] 检测到网页 URL，尝试使用后端服务截图...');
            
            const isBackendAvailable = await checkBackendService();
            console.log('[Export] 后端服务状态:', isBackendAvailable ? '可用' : '不可用');
            
            if (isBackendAvailable) {
              const webpageScreenshot = await captureWebpage(designImageSrc);
              if (webpageScreenshot) {
                console.log('[Export] 网页截图成功，使用截图作为设计稿');
                processedDesignImageSrc = webpageScreenshot;
              } else {
                designImageWarning = '网页截图失败。请尝试上传设计稿图片。';
              }
            } else {
              designImageWarning = '设计稿是网页链接，需要后端截图服务才能自动截图。请：\n1. 启动后端服务：cd server && node server.js\n2. 或者上传设计稿图片';
            }
          }
        }
      }
      
      // 情况 2：只有 Figma 嵌入 URL（没有上传图片）
      if (!processedDesignImageSrc && figmaEmbedUrl && !designImageSrc) {
        console.log('[Export] 只有 Figma 嵌入 URL，尝试导出...');
        const figmaToken = localStorage.getItem('figma_access_token');
        const figmaResult = await processFigmaUrl(figmaEmbedUrl, figmaToken || undefined);
        
        if (figmaResult.success && figmaResult.imageData) {
          processedDesignImageSrc = figmaResult.imageData;
        } else if (figmaResult.needToken) {
          designImageWarning = '需要 Figma Access Token 才能导出设计稿图片。请在设置中配置 Token，或上传设计稿图片。';
        } else {
          designImageWarning = `Figma 设计稿导出失败: ${figmaResult.error}。请上传设计稿图片。`;
        }
      }
      
      console.log('[Export] 处理结果:', { hasProcessedImage: !!processedDesignImageSrc, warning: designImageWarning });
      
      // 如果既没有处理后的图片，也没有警告（不应该发生）
      if (!processedDesignImageSrc && !designImageWarning) {
        designImageWarning = '设计稿无法加载。请上传设计稿图片。';
      }
      
      // 创建隐藏容器
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '1400px';
      container.style.backgroundColor = '#1C1B1F';
      container.style.color = '#fff';
      container.style.fontFamily = 'Inter, system-ui, sans-serif';
      container.style.padding = '48px';

      // 标题
      const title = document.createElement('h1');
      title.textContent = 'UI 走查报告';
      title.style.fontSize = '36px';
      title.style.fontWeight = '700';
      title.style.marginBottom = '8px';
      title.style.color = '#D0BCFF';
      container.appendChild(title);

      const subtitle = document.createElement('p');
      subtitle.textContent = `生成时间: ${new Date().toLocaleString('zh-CN')} | 共 ${annotations.length} 处标注`;
      subtitle.style.fontSize = '14px';
      subtitle.style.color = '#999';
      subtitle.style.marginBottom = '40px';
      container.appendChild(subtitle);

      // 对比视图区域
      const comparisonTitle = document.createElement('h2');
      comparisonTitle.textContent = '对比视图';
      comparisonTitle.style.fontSize = '28px';
      comparisonTitle.style.fontWeight = '600';
      comparisonTitle.style.marginBottom = '20px';
      comparisonTitle.style.color = '#fff';
      container.appendChild(comparisonTitle);

      // 双列布局
      const flexBox = document.createElement('div');
      flexBox.style.display = 'flex';
      flexBox.style.gap = '24px';
      flexBox.style.marginBottom = '24px';

      // 左列：截图 + 标注
      const leftCol = document.createElement('div');
      leftCol.style.flex = '1';
      leftCol.style.backgroundColor = '#2B2930';
      leftCol.style.borderRadius = '12px';
      leftCol.style.padding = '16px';
      leftCol.style.border = '1px solid #49454F';

      const leftLabel = document.createElement('p');
      leftLabel.textContent = '界面截图';
      leftLabel.style.fontSize = '16px';
      leftLabel.style.fontWeight = '600';
      leftLabel.style.color = '#D0BCFF';
      leftLabel.style.marginBottom = '12px';
      leftCol.appendChild(leftLabel);

      if (screenshotSrc) {
        const imgContainer = document.createElement('div');
        imgContainer.style.position = 'relative';
        imgContainer.style.display = 'inline-block';
        imgContainer.style.width = '100%';

        const screenshotImg = document.createElement('img');
        screenshotImg.src = screenshotSrc;
        screenshotImg.style.width = '100%';
        screenshotImg.style.borderRadius = '8px';
        screenshotImg.style.display = 'block';
        screenshotImg.alt = '截图';
        imgContainer.appendChild(screenshotImg);

        // 添加标注标记到截图
        annotations.forEach((ann) => {
          const marker = document.createElement('div');
          marker.style.position = 'absolute';
          marker.style.left = `${ann.x}%`;
          marker.style.top = `${ann.y}%`;
          marker.style.transform = 'translate(-50%, -50%)';
          marker.style.zIndex = '10';
          marker.style.width = '32px';
          marker.style.height = '32px';
          marker.style.borderRadius = '50%';
          marker.style.backgroundColor = ANNOTATION_COLORS[ann.type] || '#D0BCFF';
          marker.style.display = 'flex';
          marker.style.alignItems = 'center';
          marker.style.justifyContent = 'center';
          marker.style.color = '#fff';
          marker.style.fontSize = '14px';
          marker.style.fontWeight = '800';
          marker.style.fontFamily = 'Manrope, sans-serif';
          marker.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.8), 0 2px 8px rgba(0,0,0,0.5)';
          marker.textContent = String(ann.id);
          imgContainer.appendChild(marker);
        });

        leftCol.appendChild(imgContainer);
      }

      // 右列：设计稿
      const rightCol = document.createElement('div');
      rightCol.style.flex = '1';
      rightCol.style.backgroundColor = '#2B2930';
      rightCol.style.borderRadius = '12px';
      rightCol.style.padding = '16px';
      rightCol.style.border = '1px solid #49454F';

      const rightLabel = document.createElement('p');
      rightLabel.textContent = '设计稿';
      rightLabel.style.fontSize = '16px';
      rightLabel.style.fontWeight = '600';
      rightLabel.style.color = '#D0BCFF';
      rightLabel.style.marginBottom = '12px';
      rightCol.appendChild(rightLabel);

      // 使用处理后的设计稿图片
      if (processedDesignImageSrc) {
        console.log('[Export] 添加设计稿图片到导出容器...');
        const designImg = document.createElement('img');
        designImg.src = processedDesignImageSrc;
        designImg.style.width = '100%';
        designImg.style.borderRadius = '8px';
        designImg.style.display = 'block';
        designImg.alt = '设计稿';
        rightCol.appendChild(designImg);
      } else if (designImageWarning) {
        // 显示警告信息
        console.log('[Export] 显示警告:', designImageWarning);
        const warningMsg = document.createElement('div');
        
        const isTokenWarning = designImageWarning.includes('Token');
        const borderColor = isTokenWarning ? '#FFA726' : '#EF5350';
        const textColor = isTokenWarning ? '#FFA726' : '#EF5350';
        
        warningMsg.innerHTML = `
          <div style="padding: 30px 20px; text-align: center; color: ${textColor}; font-size: 14px; background-color: ${isTokenWarning ? 'rgba(255, 167, 38, 0.1)' : 'rgba(239, 83, 80, 0.1)'}; border-radius: 8px; border: 2px dashed ${borderColor};">
            <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">⚠️</div>
            <div style="font-weight: 600; margin-bottom: 12px;">${designImageWarning}</div>
            ${isTokenWarning ? `
              <div style="font-size: 12px; color: #D0BCFF; margin-top: 12px; padding: 8px; background: rgba(208, 188, 255, 0.1); border-radius: 4px;">
                💡 提示：点击左上角设置按钮配置 Figma Token
              </div>
            ` : ''}
          </div>
        `;
        rightCol.appendChild(warningMsg);
      }

      flexBox.appendChild(leftCol);
      flexBox.appendChild(rightCol);
      container.appendChild(flexBox);

      // 标注清单
      if (annotations.length > 0) {
        const annTitle = document.createElement('h2');
        annTitle.textContent = '差异标注清单';
        annTitle.style.fontSize = '28px';
        annTitle.style.fontWeight = '600';
        annTitle.style.marginTop = '48px';
        annTitle.style.marginBottom = '20px';
        annTitle.style.color = '#fff';
        container.appendChild(annTitle);

        annotations.forEach((ann) => {
          const item = document.createElement('div');
          item.style.display = 'flex';
          item.style.gap = '16px';
          item.style.padding = '16px 20px';
          item.style.backgroundColor = '#2B2930';
          item.style.borderRadius = '12px';
          item.style.border = '1px solid #49454F';
          item.style.marginBottom = '12px';
          item.style.alignItems = 'flex-start';

          const badge = document.createElement('div');
          badge.textContent = String(ann.id);
          badge.style.width = '36px';
          badge.style.height = '36px';
          badge.style.minWidth = '36px';
          badge.style.borderRadius = '50%';
          badge.style.backgroundColor = ANNOTATION_COLORS[ann.type] || '#D0BCFF';
          badge.style.display = 'flex';
          badge.style.alignItems = 'center';
          badge.style.justifyContent = 'center';
          badge.style.color = '#fff';
          badge.style.fontSize = '16px';
          badge.style.fontWeight = '800';
          badge.style.fontFamily = 'Manrope, sans-serif';
          item.appendChild(badge);

          const content = document.createElement('div');
          content.style.flex = '1';

          const titleRow = document.createElement('div');
          titleRow.style.display = 'flex';
          titleRow.style.alignItems = 'center';
          titleRow.style.gap = '8px';
          titleRow.style.marginBottom = '6px';
          titleRow.style.flexWrap = 'wrap';

          const typeLabel = document.createElement('span');
          typeLabel.textContent = TYPE_LABELS[ann.type] || '其他';
          typeLabel.style.fontSize = '13px';
          typeLabel.style.fontWeight = '600';
          typeLabel.style.color = ANNOTATION_COLORS[ann.type] || '#95A5A6';
          titleRow.appendChild(typeLabel);

          const titleText = document.createElement('span');
          titleText.textContent = ann.title;
          titleText.style.fontSize = '15px';
          titleText.style.fontWeight = '600';
          titleText.style.color = '#fff';
          titleRow.appendChild(titleText);

          const severityBadge = document.createElement('span');
          severityBadge.textContent = SEVERITY_LABELS[ann.severity] || '轻微';
          severityBadge.style.marginLeft = 'auto';
          severityBadge.style.padding = '3px 10px';
          severityBadge.style.borderRadius = '6px';
          severityBadge.style.fontSize = '12px';
          severityBadge.style.fontWeight = '600';
          severityBadge.style.backgroundColor = 
            ann.severity === 'major' ? '#EF5350' :
            ann.severity === 'moderate' ? '#FF7043' : '#FFA726';
          severityBadge.style.color = '#fff';
          titleRow.appendChild(severityBadge);

          content.appendChild(titleRow);

          if (ann.description) {
            const desc = document.createElement('p');
            desc.textContent = ann.description;
            desc.style.fontSize = '14px';
            desc.style.color = '#aaa';
            desc.style.margin = '0';
            desc.style.lineHeight = '1.6';
            content.appendChild(desc);
          }

          const posInfo = document.createElement('p');
          posInfo.textContent = `位置: X=${ann.x.toFixed(1)}%, Y=${ann.y.toFixed(1)}%`;
          posInfo.style.fontSize = '12px';
          posInfo.style.color = '#777';
          posInfo.style.margin = '6px 0 0 0';
          content.appendChild(posInfo);

          item.appendChild(content);
          container.appendChild(item);
        });
      }

      // 页脚
      const footer = document.createElement('div');
      footer.style.marginTop = '48px';
      footer.style.paddingTop = '20px';
      footer.style.borderTop = '1px solid #49454F';
      footer.style.textAlign = 'center';
      footer.style.color = '#666';
      footer.style.fontSize = '12px';
      footer.textContent = 'UI 走查工具 | 生成于 ' + new Date().toLocaleString('zh-CN');
      container.appendChild(footer);

      // 添加到 body
      document.body.appendChild(container);

      // 等待图片加载完成
      console.log('[Export] 等待图片加载...');
      const images = container.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                // 图片已加载，再等待一帧确保渲染完成
                requestAnimationFrame(() => resolve());
              } else {
                img.onload = () => {
                  requestAnimationFrame(() => resolve());
                };
                img.onerror = () => {
                  console.warn('[Export] 图片加载失败:', img.src.substring(0, 100));
                  resolve();
                };
              }
            })
        )
      );

      // 额外等待确保渲染完成
      console.log('[Export] 图片加载完成，等待渲染...');
      await new Promise<void>((resolve) => setTimeout(resolve, 500));

      // 使用 html2canvas 捕获
      console.log('[Export] 开始 html2canvas 捕获...');
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(container, {
        backgroundColor: '#1C1B1F',
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        foreignObjectRendering: false,
      });

      console.log('[Export] 捕获完成，下载图片...');

      // 移除临时容器
      document.body.removeChild(container);

      // 下载图片
      const link = document.createElement('a');
      link.download = `UI走查报告_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      console.log('[Export] 导出成功！');
      setExporting(false);
    } catch (error) {
      console.error('[Export] 导出失败:', error);
      alert('导出失败，请重试。详情查看控制台。');
      setExporting(false);
    }
  };

  return (
    <Box
      sx={{
        mt: 3,
        mb: 4,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Button
        variant="contained"
        size="large"
        onClick={handleExport}
        disabled={exporting || annotations.length === 0}
        startIcon={
          exporting ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <DownloadIcon />
          )
        }
        sx={{
          bgcolor: '#D0BCFF',
          color: '#381E72',
          fontWeight: 700,
          fontSize: '1rem',
          px: 4,
          py: 1.5,
          borderRadius: 3,
          boxShadow: '0 4px 16px rgba(208, 188, 255, 0.3)',
          '&:hover': {
            bgcolor: '#E8D5FF',
            boxShadow: '0 6px 20px rgba(208, 188, 255, 0.4)',
          },
          '&:disabled': {
            bgcolor: 'rgba(208, 188, 255, 0.3)',
            color: 'rgba(56, 30, 114, 0.5)',
          },
        }}
      >
        {exporting ? '正在导出...' : '导出完整报告图片'}
      </Button>
    </Box>
  );
}

// ===== Figma 相关函数 =====

/**
 * 从 Figma URL 中提取文件 ID 和节点 ID
 */
function parseFigmaUrl(url: string): { fileId: string; nodeId: string | null } | null {
  try {
    const urlObj = new URL(url);
    
    if (!urlObj.hostname.includes('figma.com')) {
      return null;
    }

    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const fileIdIndex = pathParts.findIndex(
      (part) => part === 'file' || part === 'design'
    );
    
    if (fileIdIndex === -1 || fileIdIndex + 1 >= pathParts.length) {
      return null;
    }

    const fileId = pathParts[fileIdIndex + 1];
    const nodeId = urlObj.searchParams.get('node-id');
    
    return { fileId, nodeId };
  } catch {
    return null;
  }
}

/**
 * 智能处理 Figma 链接
 */
async function processFigmaUrl(
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

  if (!accessToken) {
    return {
      success: false,
      needToken: true,
      error: '需要 Figma Access Token 才能导出设计稿图片',
    };
  }

  try {
    // 如果有节点 ID，导出指定节点
    if (nodeId) {
      const formattedNodeId = nodeId.replace(/-/g, ':');
      const params = new URLSearchParams({
        ids: formattedNodeId,
        format: 'png',
        scale: '2',
      });

      const response = await fetch(
        `https://api.figma.com/v1/images/${fileId}?${params.toString()}`,
        {
          headers: {
            'X-Figma-Token': accessToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Figma API 错误: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.err) {
        throw new Error(`Figma API 返回错误: ${data.err}`);
      }

      // 获取图片并转换为 base64
      const imageUrl = data.images[formattedNodeId];
      if (imageUrl) {
        const imgResponse = await fetch(imageUrl);
        const blob = await imgResponse.blob();
        
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('FileReader failed'));
          reader.readAsDataURL(blob);
        });
        
        return { success: true, imageData: base64 };
      }
    } else {
      // 如果没有节点 ID，获取文件缩略图
      const response = await fetch(`https://api.figma.com/v1/files/${fileId}`, {
        headers: {
          'X-Figma-Token': accessToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Figma API 错误: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.thumbnailUrl) {
        const imgResponse = await fetch(data.thumbnailUrl);
        const blob = await imgResponse.blob();
        
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('FileReader failed'));
          reader.readAsDataURL(blob);
        });
        
        return { success: true, imageData: base64 };
      }
    }

    return {
      success: false,
      error: '导出失败，请检查 Figma 链接和 Access Token',
    };
  } catch (error) {
    console.error('[Figma] 导出失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}
