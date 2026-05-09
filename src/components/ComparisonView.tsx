import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  useTheme,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import SpaceBarIcon from '@mui/icons-material/SpaceBar';
import PaletteIcon from '@mui/icons-material/Palette';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { CompareMode, Annotation, AnnotationType, ANNOTATION_COLORS } from '../types';

// 本地常量定义
const ANNOTATION_LABELS: Record<AnnotationType, string> = {
  size: '尺寸',
  spacing: '间距',
  color: '颜色',
  alignment: '对齐',
  typography: '文字',
  other: '其他',
};

const ANNOTATION_ICONS: Record<AnnotationType, React.ReactElement> = {
  size: <CropSquareIcon sx={{ fontSize: 12 }} />,
  spacing: <SpaceBarIcon sx={{ fontSize: 12 }} />,
  color: <PaletteIcon sx={{ fontSize: 12 }} />,
  alignment: <FormatAlignCenterIcon sx={{ fontSize: 12 }} />,
  typography: <TextFieldsIcon sx={{ fontSize: 12 }} />,
  other: <HelpOutlineIcon sx={{ fontSize: 12 }} />,
};

interface ComparisonViewProps {
  mode: CompareMode;
  screenshotSrc: string | null;
  figmaEmbedUrl: string | null;
  designImageSrc: string | null;
  annotations: Annotation[];
  onImageClick: (x: number, y: number) => void;
  onEditAnnotation: (id: number) => void;
}

export default function ComparisonView({
  mode,
  screenshotSrc,
  figmaEmbedUrl,
  designImageSrc,
  annotations,
  onImageClick,
  onEditAnnotation,
}: ComparisonViewProps) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<number | null>(null);
  const [imgASize, setImgASize] = useState({ w: 0, h: 0 });
  const [imgBSize, setImgBSize] = useState({ w: 0, h: 0 });

  const hasScreenshot = !!screenshotSrc;
  const hasDesign = !!(figmaEmbedUrl || designImageSrc);
  const hasBoth = hasScreenshot && hasDesign;

  // Load image sizes
  useEffect(() => {
    if (screenshotSrc) {
      const img = new Image();
      img.onload = () => setImgASize({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = screenshotSrc;
    }
    if (designImageSrc) {
      const img = new Image();
      img.onload = () => setImgBSize({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = designImageSrc;
    }
  }, [screenshotSrc, designImageSrc]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25));
  const handleReset = () => setZoom(1);

  // 优化后的滑块事件处理 - 简化且稳定
  const updateSliderPosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = (x / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, pct)));
  }, []);

  const handleSliderMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    // 立即更新位置
    let clientX: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }
    updateSliderPosition(clientX);
  }, [updateSliderPosition]);

  // 全局事件监听 - 防止鼠标丢失
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        updateSliderPosition(e.clientX);
      };
      
      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        if (e.touches.length > 0) {
          updateSliderPosition(e.touches[0].clientX);
        }
      };
      
      const handleMouseUp = () => setIsDragging(false);
      const handleTouchEnd = () => setIsDragging(false);

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchend', handleTouchEnd);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, updateSliderPosition]);

  // Double-click to add annotation
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent, container: HTMLElement | null) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      onImageClick(Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
    },
    [onImageClick]
  );

  // Empty state
  if (!hasBoth) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          border: '1px solid',
          borderColor: theme.palette.divider,
          borderRadius: 3,
          bgcolor: theme.palette.background.paper,
          minHeight: 400,
        }}
      >
        <CompareIconLarge />
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
          请先上传界面截图并加载 Figma 设计稿
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          双击图片可添加差异标注
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: theme.palette.divider,
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: theme.palette.background.paper,
      }}
    >
      {/* Toolbar */}
      <Box
        sx={{
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid',
          borderColor: theme.palette.divider,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          对比视图
        </Typography>
        {annotations.length > 0 && (
          <Typography
            variant="caption"
            sx={{ ml: 0.5, color: theme.palette.primary.main, fontWeight: 600 }}
          >
            {annotations.length} 处标注
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary">
          {Math.round(zoom * 100)}%
        </Typography>
        <IconButton size="small" onClick={handleZoomOut}>
          <ZoomOutIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={handleZoomIn}>
          <ZoomInIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={handleReset}>
          <RestartAltIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Viewport */}
      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          overflow: 'auto',
          minHeight: 450,
          bgcolor: '#121212',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease',
          }}
        >
          {mode === 'side-by-side' && (
            <SideBySideView
              screenshotSrc={screenshotSrc!}
              figmaEmbedUrl={figmaEmbedUrl}
              designImageSrc={designImageSrc}
              annotations={annotations}
              onDoubleClick={handleDoubleClick}
              hoveredAnnotation={hoveredAnnotation}
              onHoverAnnotation={setHoveredAnnotation}
              onEditAnnotation={onEditAnnotation}
            />
          )}

          {mode === 'slider' && (
            <OptimizedSliderView
              screenshotSrc={screenshotSrc!}
              designImageSrc={designImageSrc!}
              sliderPos={sliderPos}
              isDragging={isDragging}
              onMouseDown={handleSliderMouseDown}
              imgASize={imgASize}
              imgBSize={imgBSize}
            />
          )}
        </Box>
      </Box>
    </Paper>
  );
}

/* ============================================================
   Optimized Slider View - 稳定可靠的滑块实现
   ============================================================ */
function OptimizedSliderView({
  screenshotSrc,
  designImageSrc,
  sliderPos,
  isDragging,
  onMouseDown,
  imgASize,
  imgBSize,
}: {
  screenshotSrc: string;
  designImageSrc: string;
  sliderPos: number;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent | React.TouchEvent) => void;
  imgASize: { w: number; h: number };
  imgBSize: { w: number; h: number };
}) {
  const [dimensions, setDimensions] = useState({ width: '100%' });

  // 计算统一宽度
  useEffect(() => {
    if (!imgASize.w || !imgBSize.w) return;
    const targetWidth = Math.max(imgASize.w, imgBSize.w);
    setDimensions({ width: `${targetWidth}px` });
  }, [imgASize, imgBSize]);

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        cursor: isDragging ? 'ew-resize' : 'col-resize',
        userSelect: 'none',
        mx: 'auto',
        width: dimensions.width,
        // 允许点击容器任意位置
        '&:active': {
          cursor: 'ew-resize',
        },
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onMouseDown}
    >
      {/* Background: design image */}
      <Box
        component="img"
        src={designImageSrc}
        draggable={false}
        sx={{
          display: 'block',
          width: dimensions.width,
          height: 'auto',
          objectFit: 'contain',
          pointerEvents: 'none', // 防止图片干扰事件
        }}
        alt="design"
      />

      {/* Foreground clip: screenshot */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          overflow: 'hidden',
          width: `${sliderPos}%`,
        }}
      >
        <Box
          component="img"
          src={screenshotSrc}
          draggable={false}
          sx={{
            display: 'block',
            width: dimensions.width,
            height: 'auto',
            objectFit: 'contain',
            pointerEvents: 'none',
          }}
          alt="screenshot"
        />
      </Box>

      {/* Slider handle - 增大可点击区域 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${sliderPos}%`,
          transform: 'translateX(-50%)',
          width: 40, // 增大可点击宽度
          cursor: 'ew-resize',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // 滑条指示器
          '&::before': {
            content: '""',
            width: 4,
            height: '100%',
            bgcolor: '#D0BCFF',
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            borderRadius: 2,
            boxShadow: '0 0 8px rgba(208, 188, 255, 0.5)',
          },
          // 圆形手柄
          '&::after': {
            content: '""',
            width: 36,
            height: 36,
            borderRadius: '50%',
            bgcolor: '#D0BCFF',
            border: '3px solid #fff',
            boxShadow: '0 0 16px rgba(0,0,0,0.6)',
            position: 'relative',
            zIndex: 1,
            transition: 'all 0.15s ease',
          },
          // Hover 效果
          '&:hover::after': {
            transform: 'scale(1.1)',
            boxShadow: '0 0 20px rgba(208, 188, 255, 0.8)',
          },
          // 拖动时的效果
          ...(isDragging && {
            '&::after': {
              transform: 'scale(1.15)',
              boxShadow: '0 0 24px rgba(208, 188, 255, 0.9)',
            },
          }),
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onMouseDown}
      />
    </Box>
  );
}

/* ============================================================
   Side-by-Side View with Annotations
   ============================================================ */
function SideBySideView({
  screenshotSrc,
  figmaEmbedUrl,
  designImageSrc,
  annotations,
  onDoubleClick,
  hoveredAnnotation,
  onHoverAnnotation,
  onEditAnnotation,
}: {
  screenshotSrc: string;
  figmaEmbedUrl: string | null;
  designImageSrc: string | null;
  annotations: Annotation[];
  onDoubleClick: (e: React.MouseEvent, container: HTMLElement | null) => void;
  hoveredAnnotation: number | null;
  onHoverAnnotation: (id: number | null) => void;
  onEditAnnotation: (id: number) => void;
}) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number | string>('100%');

  // 动态匹配截图区域高度
  useEffect(() => {
    const updateHeight = () => {
      if (leftRef.current) {
        const height = leftRef.current.offsetHeight;
        if (height > 0) {
          setIframeHeight(height);
        }
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);

    const img = leftRef.current?.querySelector('img');
    if (img) {
      if (img.complete) {
        updateHeight();
      } else {
        img.addEventListener('load', updateHeight);
      }
    }

    return () => {
      window.removeEventListener('resize', updateHeight);
      if (img) {
        img.removeEventListener('load', updateHeight);
      }
    };
  }, [screenshotSrc]);

  return (
    <Box sx={{ display: 'flex', gap: 0, width: '100%' }}>
      {/* Left: Screenshot */}
      <Box ref={leftRef} sx={{ flex: 1, p: 1, borderRight: '1px solid #333', position: 'relative' }}>
        <Typography
          variant="caption"
          sx={{ display: 'block', textAlign: 'center', color: '#aaa', mb: 0.5 }}
        >
          界面截图
        </Typography>
        <Box
          sx={{ position: 'relative', cursor: 'crosshair' }}
          onDoubleClick={(e) => onDoubleClick(e, leftRef.current)}
        >
          <Box
            component="img"
            src={screenshotSrc}
            sx={{ width: '100%', display: 'block', pointerEvents: 'none' }}
            alt="screenshot"
            draggable={false}
          />
          {/* Annotation markers */}
          {annotations.map((ann) => {
            const isLeftAnn = ann.x < 50;
            return (
              <AnnotationMarker
                key={ann.id}
                annotation={ann}
                isHovered={hoveredAnnotation === ann.id}
                onHover={onHoverAnnotation}
                onEdit={onEditAnnotation}
              />
            );
          })}
        </Box>
      </Box>

      {/* Right: Figma iframe or Design Image */}
      <Box ref={rightRef} sx={{ flex: 1, p: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <Typography
          variant="caption"
          sx={{ display: 'block', textAlign: 'center', color: '#aaa', mb: 0.5 }}
        >
          设计稿
        </Typography>
        <Box
          sx={{ position: 'relative', cursor: 'crosshair', flex: 1, display: 'flex', flexDirection: 'column' }}
          onDoubleClick={(e) => onDoubleClick(e, rightRef.current)}
        >
          {designImageSrc ? (
            <Box
              component="img"
              src={designImageSrc}
              sx={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
              alt="design"
              draggable={false}
            />
          ) : figmaEmbedUrl ? (
            <Box
              component="iframe"
              src={figmaEmbedUrl}
              sx={{
                width: '100%',
                height: iframeHeight,
                border: 'none',
                display: 'block',
                flex: 1,
              }}
              allowFullScreen
              title="Figma Design"
            />
          ) : (
            <Box
              sx={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#555',
              }}
            >
              未加载设计稿
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

/* ============================================================
   Annotation Marker
   ============================================================ */
function AnnotationMarker({
  annotation,
  isHovered,
  onHover,
  onEdit,
}: {
  annotation: Annotation;
  isHovered: boolean;
  onHover: (id: number | null) => void;
  onEdit: (id: number) => void;
}) {
  const theme = useTheme();
  const color = ANNOTATION_COLORS[annotation.type];
  const severityColor =
    annotation.severity === 'minor'
      ? '#FFA726'
      : annotation.severity === 'moderate'
        ? '#FF7043'
        : '#EF5350';

  return (
    <Tooltip
      title={
        <Box sx={{ py: 0.5, maxWidth: 260 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                bgcolor: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {annotation.id}
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#fff' }}>
              {ANNOTATION_LABELS[annotation.type]} - {annotation.title}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#ccc', display: 'block' }}>
            {annotation.description}
          </Typography>
          <Box
            sx={{
              mt: 0.5,
              display: 'inline-flex',
              px: 0.75,
              py: 0.15,
              borderRadius: 1,
              bgcolor: `${severityColor}30`,
              color: severityColor,
              fontSize: '0.65rem',
              fontWeight: 600,
            }}
          >
            {annotation.severity === 'minor' ? '轻微' : annotation.severity === 'moderate' ? '中等' : '严重'}
          </Box>
        </Box>
      }
      placement="top"
      arrow
      open={isHovered}
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: '#2B2930',
            border: '1px solid #49454F',
            borderRadius: 2,
            '& .MuiTooltip-arrow': { color: '#2B2930' },
          },
        },
      }}
    >
      <Box
        onClick={() => onEdit(annotation.id)}
        onMouseEnter={() => onHover(annotation.id)}
        onMouseLeave={() => onHover(null)}
        sx={{
          position: 'absolute',
          left: `${annotation.x}%`,
          top: `${annotation.y}%`,
          transform: 'translate(-50%, -50%)',
          zIndex: isHovered ? 20 : 10,
          cursor: 'pointer',
          transition: 'transform 0.15s ease',
          '&:hover': { transform: 'translate(-50%, -50%) scale(1.2)' },
        }}
      >
        {/* Outer ring */}
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 12,
            fontWeight: 800,
            fontFamily: 'Manrope, sans-serif',
            boxShadow: isHovered
              ? `0 0 0 3px #fff, 0 0 12px ${color}80`
              : `0 0 0 2px rgba(255,255,255,0.6)`,
            transition: 'box-shadow 0.2s ease',
          }}
        >
          {annotation.id}
        </Box>
      </Box>
    </Tooltip>
  );
}

/* ============================================================
   Empty State Icon
   ============================================================ */
function CompareIconLarge() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
      <rect x="2" y="2" width="9" height="9" rx="1.5" stroke="#CAC4D0" strokeWidth="1.5" />
      <rect x="13" y="2" width="9" height="9" rx="1.5" stroke="#CAC4D0" strokeWidth="1.5" />
      <rect x="2" y="13" width="9" height="9" rx="1.5" stroke="#CAC4D0" strokeWidth="1.5" />
      <rect x="13" y="13" width="9" height="9" rx="1.5" stroke="#CAC4D0" strokeWidth="1.5" />
      <line x1="6.5" y1="2" x2="6.5" y2="11" stroke="#D0BCFF" strokeWidth="1" />
      <line x1="2" y1="6.5" x2="11" y2="6.5" stroke="#D0BCFF" strokeWidth="1" />
    </svg>
  );
}
