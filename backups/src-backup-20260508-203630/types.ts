export type CompareMode = 'side-by-side' | 'slider';

export interface UploadedImage {
  src: string;       // data URL or object URL
  file: File;
  width: number;
  height: number;
}

export type AnnotationType = 'size' | 'spacing' | 'color' | 'alignment' | 'typography' | 'other';

export type AnnotationSeverity = 'minor' | 'moderate' | 'major';

export interface Annotation {
  id: number;
  x: number;        // 0-100% percentage position on the image
  y: number;
  type: AnnotationType;
  title: string;
  description: string;
  severity: AnnotationSeverity;
  suggestionId?: string;  // 来源 AI 建议的 ID（可选）
}

// AI 自动标注相关类型
export type AIAnnotationType = 'issue' | 'suggestion' | 'praise';

export type AIAnnotationSeverity = 'critical' | 'major' | 'minor';

export interface AIAnnotationSuggestion {
  id: string;
  type: AIAnnotationType;
  severity: AIAnnotationSeverity;
  title: string;
  description: string;
  position: { x: number; y: number };  // 像素坐标
  category: 'layout' | 'typography' | 'color' | 'spacing' | 'component' | 'responsive' | 'other';
  color: string;
}

export interface AIAnalysisResult {
  success: boolean;
  suggestions: AIAnnotationSuggestion[];
  summary: string;
  overallScore: number;  // 0-100 相似度评分
  error?: string;
  diffImageUrl?: string; // 差异可视化图片 URL
  stats?: {
    totalPixels: number;
    diffPixels: number;
    diffPercentage: number;
    matchedPixels: number;
  };
}

// 标注颜色常量
export const ANNOTATION_COLORS: Record<AnnotationType, string> = {
  size: '#FF6B6B',
  spacing: '#4ECDC4',
  color: '#FFD93D',
  alignment: '#6C5CE7',
  typography: '#A8E6CF',
  other: '#95A5A6',
};
