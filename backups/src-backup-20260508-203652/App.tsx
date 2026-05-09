import React, { useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  CssBaseline,
  ThemeProvider,
  AppBar,
  Toolbar,
  Alert,
  Snackbar,
  useTheme,
  CircularProgress,
  Button,
  Tooltip,
  Fade,
  Checkbox,
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

import theme from './theme';
import { CompareMode, UploadedImage, Annotation, AIAnnotationSuggestion, AIAnalysisResult } from './types';
import { ANNOTATION_COLORS } from './types';

import ImageUploader from './components/ImageUploader';
import FigmaInput from './components/FigmaInput';
import ModeSwitcher from './components/ModeSwitcher';
import ComparisonView from './components/ComparisonView';
import AddAnnotationDialog from './components/AddAnnotationDialog';
import AnnotationListPanel from './components/AnnotationListPanel';
import imageComparisonService from './services/imageComparisonService';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppInner />
    </ThemeProvider>
  );
}

function AppInner() {
  const muiTheme = useTheme();

  // Left panel: screenshot
  const [screenshot, setScreenshot] = useState<UploadedImage | null>(null);

  // Right panel: Figma embed URL + design image
  const [figmaEmbed, setFigmaEmbed] = useState<string | null>(null);
  const [designImage, setDesignImage] = useState<UploadedImage | null>(null);

  const [mode, setMode] = useState<CompareMode>('side-by-side');

  // Annotations
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [nextAnnotationId, setNextAnnotationId] = useState(1);

  // AI Analysis
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AIAnnotationSuggestion[]>([]);
  const [showAiResults, setShowAiResults] = useState(false);
  const [checkedSuggestionIds, setCheckedSuggestionIds] = useState<Set<string>>(new Set());

  // Dialog for adding annotations
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse follow hint
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showHint, setShowHint] = useState(false);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });

  // ---- Left panel handlers ----
  const handleScreenshotSelect = useCallback(
    (dataUrl: string, file: File) => {
      const img = new Image();
      img.onload = () => {
        setScreenshot({
          src: dataUrl,
          file,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
        setSnackbar({ open: true, message: '截图上传成功', severity: 'success' });
      };
      img.src = dataUrl;
    },
    []
  );

  const handleScreenshotClear = useCallback(() => {
    setScreenshot(null);
  }, []);

  // ---- Right panel handlers ----
  const handleFigmaLoad = useCallback((embedUrl: string) => {
    setFigmaEmbed(embedUrl);
    setSnackbar({ open: true, message: 'Figma 设计稿加载成功', severity: 'success' });
  }, []);

  const handleDesignImageSelect = useCallback(
    (dataUrl: string, file: File) => {
      const img = new Image();
      img.onload = () => {
        setDesignImage({
          src: dataUrl,
          file,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
        setSnackbar({
          open: true,
          message: '设计稿图片上传成功',
          severity: 'success',
        });
      };
      img.src = dataUrl;
    },
    []
  );

  const handleRightClear = useCallback(() => {
    setFigmaEmbed(null);
    setDesignImage(null);
  }, []);

  const handleModeChange = useCallback((newMode: CompareMode) => {
    setMode(newMode);
  }, []);

  // ---- Annotation handlers ----
  const handleImageClick = useCallback((x: number, y: number) => {
    setPendingPos({ x, y });
    setDialogOpen(true);
  }, []);

  const handleAnnotationSave = useCallback(
    (data: { type: Annotation['type']; title: string; description: string; severity: Annotation['severity'] }) => {
      const newAnnotation: Annotation = {
        id: nextAnnotationId,
        x: pendingPos.x,
        y: pendingPos.y,
        ...data,
      };
      setAnnotations((prev) => [...prev, newAnnotation]);
      setNextAnnotationId((id) => id + 1);
      setDialogOpen(false);
      setSnackbar({ open: true, message: `标注 #${nextAnnotationId} 已添加`, severity: 'success' });
    },
    [nextAnnotationId, pendingPos]
  );

  const handleAnnotationRemove = useCallback((id: number) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    setSnackbar({ open: true, message: `标注 #${id} 已删除`, severity: 'info' });
  }, []);

  const handleAnnotationUpdate = useCallback(
    (id: number, data: Partial<Omit<Annotation, 'id' | 'x' | 'y'>>) => {
      setAnnotations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...data } : a))
      );
    },
    []
  );

  // ---- Mouse handlers for hint ----
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setShowHint(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowHint(false);
  }, []);

  // ---- AI Analysis handler ----
  const handleAIAnalyze = useCallback(async () => {
    if (!screenshot || (!figmaEmbed && !designImage)) {
      setSnackbar({
        open: true,
        message: '请先上传截图和设计稿',
        severity: 'error',
      });
      return;
    }

    setAiLoading(true);
    setAiResult(null);
    setAiSuggestions([]);

    try {
      const designSrc = designImage?.src || screenshot.src;

      const result = await imageComparisonService.compareImages(
        designSrc,
        screenshot.src,
        { threshold: 30, maxDiffPercentage: 10 }
      );

      setAiResult(result);

      if (result.success && result.suggestions.length > 0) {
        const aiSugs: AIAnnotationSuggestion[] = result.suggestions.map(s => ({
          id: s.id,
          type: s.type as 'issue' | 'suggestion' | 'praise',
          severity: s.severity as 'critical' | 'major' | 'minor',
          title: s.title,
          description: s.description,
          position: s.position,
          category: s.category,
          color: s.color,
        }));
        setAiSuggestions(aiSugs);
        setShowAiResults(true);
        setSnackbar({
          open: true,
          message: `图像对比完成，发现 ${result.suggestions.length} 个差异`,
          severity: 'success',
        });
      } else if (result.success && result.suggestions.length === 0) {
        setSnackbar({
          open: true,
          message: '图像对比完成，未发现明显差异',
          severity: 'info',
        });
      } else {
        setSnackbar({
          open: true,
          message: result.error || '图像对比失败',
          severity: 'error',
        });
      }
    } catch (error: any) {
      console.error('图像对比失败:', error);
      setSnackbar({
        open: true,
        message: error.message || '图像对比失败',
        severity: 'error',
      });
    } finally {
      setAiLoading(false);
    }
  }, [screenshot, figmaEmbed, designImage]);

  // ---- Toggle AI Suggestion Checkbox ----
  // 勾选立即添加标注到对比视图；取消勾选立即移除
  const handleToggleSuggestion = useCallback(
    (suggestion: AIAnnotationSuggestion, checked: boolean) => {
      if (checked) {
        const newAnnotation: Annotation = {
          id: nextAnnotationId,
          x: (suggestion.position.x / (screenshot?.width || 1000)) * 100,
          y: (suggestion.position.y / (screenshot?.height || 1000)) * 100,
          type: mapAICategoryToAnnotationType(suggestion.category),
          title: suggestion.title,
          description: suggestion.description,
          severity: mapAISeverityToAnnotationSeverity(suggestion.severity),
          suggestionId: suggestion.id,
        };
        setAnnotations((prev) => [...prev, newAnnotation]);
        setNextAnnotationId((id) => id + 1);
        setCheckedSuggestionIds((prev) => new Set([...prev, suggestion.id]));
      } else {
        setAnnotations((prev) => prev.filter((a) => a.suggestionId !== suggestion.id));
        setCheckedSuggestionIds((prev) => {
          const next = new Set(prev);
          next.delete(suggestion.id);
          return next;
        });
      }
    },
    [nextAnnotationId, screenshot]
  );

  // ---- 确定：收起 AI 结果面板，只保留已确认的标注 ----
  const handleConfirmSuggestions = useCallback(() => {
    setShowAiResults(false);
    setCheckedSuggestionIds(new Set());
    setSnackbar({
      open: true,
      message: '已确认标注，对比视图中可查看',
      severity: 'success',
    });
  }, []);

  const handleApplyAISuggestions = useCallback(() => {
    if (aiSuggestions.length === 0) return;

    const newAnnotations: Annotation[] = aiSuggestions.map((suggestion, index) => ({
      id: nextAnnotationId + index,
      x: (suggestion.position.x / (screenshot?.width || 1000)) * 100,
      y: (suggestion.position.y / (screenshot?.height || 1000)) * 100,
      type: mapAICategoryToAnnotationType(suggestion.category),
      title: suggestion.title,
      description: suggestion.description,
      severity: mapAISeverityToAnnotationSeverity(suggestion.severity),
    }));

    setAnnotations((prev) => [...prev, ...newAnnotations]);
    setNextAnnotationId((id) => id + aiSuggestions.length);
    setAiSuggestions([]);
    setShowAiResults(false);
    setSnackbar({
      open: true,
      message: `已添加 ${newAnnotations.length} 个标注`,
      severity: 'success',
    });
  }, [aiSuggestions, nextAnnotationId, screenshot]);

  // 辅助函数：映射 AI 类别到标注类型
  function mapAICategoryToAnnotationType(category: string): Annotation['type'] {
    const mapping: Record<string, Annotation['type']> = {
      layout: 'alignment',
      typography: 'typography',
      color: 'color',
      spacing: 'spacing',
      component: 'other',
      responsive: 'alignment',
      other: 'other',
    };
    return mapping[category] || 'other';
  }

  // 辅助函数：映射 AI 严重程度到标注严重程度
  function mapAISeverityToAnnotationSeverity(severity: string): Annotation['severity'] {
    const mapping: Record<string, Annotation['severity']> = {
      critical: 'major',
      major: 'moderate',
      minor: 'minor',
    };
    return mapping[severity] || 'minor';
  }

  const hasContent = !!(screenshot && (figmaEmbed || designImage));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: muiTheme.palette.background.default,
        pb: 6,
      }}
    >
      {/* Header */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: '#1C1B1F',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ gap: 1.5 }}>
          <CompareArrowsIcon sx={{ color: muiTheme.palette.primary.main, fontSize: 28 }} />
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Manrope, system-ui, sans-serif',
              fontWeight: 700,
              fontSize: '1.15rem',
              letterSpacing: '-0.01em',
            }}
          >
            界面走查工具
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              mt: 0.25,
              display: { xs: 'none', sm: 'block' },
            }}
          >
            UI Inspection Tool
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 3, px: { xs: 2, sm: 3 } }}>
        {/* Input Section - Two columns */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2.5,
            mb: 2,
          }}
        >
          <ImageUploader
            image={screenshot?.src || null}
            onImageSelect={handleScreenshotSelect}
            onClear={handleScreenshotClear}
          />
          <FigmaInput
            embedUrl={figmaEmbed || null}
            designImage={designImage?.src || null}
            onFigmaLoad={handleFigmaLoad}
            onImageSelect={handleDesignImageSelect}
            onClear={handleRightClear}
          />
        </Box>

        {/* Mode Switcher + Action buttons */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <ModeSwitcher
            mode={mode}
            onChange={handleModeChange}
            disabled={!screenshot || (!figmaEmbed && !designImage)}
          />
          {hasContent && (
            <>
              {/* Image Comparison Button - BIGGER */}
              <Tooltip title="使用传统图像对比算法分析差异（无需 AI）">
                <Box
                  component="button"
                  onClick={handleAIAnalyze}
                  disabled={aiLoading}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 2,
                    py: 0.75,
                    border: '1px solid',
                    borderColor: aiLoading ? 'text.disabled' : '#2196F3',
                    borderRadius: 2,
                    bgcolor: aiLoading ? 'transparent' : 'rgba(33, 150, 243, 0.08)',
                    color: aiLoading ? 'text.disabled' : '#2196F3',
                    cursor: aiLoading ? 'not-allowed' : 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: aiLoading ? 'transparent' : 'rgba(33, 150, 243, 0.15)',
                    },
                  }}
                >
                  {aiLoading ? (
                    <>
                      <CircularProgress size={16} thickness={3} sx={{ color: 'text.disabled' }} />
                      对比中...
                    </>
                  ) : (
                    <>
                      <CompareArrowsIcon sx={{ fontSize: 18 }} />
                      图像对比分析
                    </>
                  )}
                </Box>
              </Tooltip>

              {/* Add Annotation Button */}
              <Box
                component="button"
                onClick={() => handleImageClick(50, 50)}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.5,
                  border: '1px solid',
                  borderColor: muiTheme.palette.divider,
                  borderRadius: 2,
                  bgcolor: 'transparent',
                  color: muiTheme.palette.primary.main,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: 'rgba(208, 188, 255, 0.08)',
                  },
                }}
              >
                + 添加标注
              </Box>
            </>
          )}
        </Box>

        {/* AI Analysis Results - only show when showAiResults is true */}
        {showAiResults && aiResult && (
          <Fade in>
            <Box sx={{ mt: 2, mb: 2 }}>
              <Alert
                severity={aiResult.success ? 'success' : 'error'}
                sx={{
                  borderRadius: 3,
                  bgcolor: aiResult.success ? 'rgba(76, 175, 80, 0.08)' : undefined,
                  border: '1px solid',
                  borderColor: aiResult.success ? 'success.main' : 'error.main',
                  '& .MuiAlert-message': { width: '100%' },
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CompareArrowsIcon fontSize="small" />
                    图像对比结果
                    {aiResult.success && (
                      <Box
                        component="span"
                        sx={{
                          ml: 'auto',
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          bgcolor: aiResult.overallScore >= 80 ? 'success.main' :
                                   aiResult.overallScore >= 60 ? 'warning.main' : 'error.main',
                          color: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        相似度: {aiResult.overallScore}%
                      </Box>
                    )}
                  </Typography>
                  {aiResult.summary && (
                    <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', whiteSpace: 'pre-line' }}>
                      {aiResult.summary}
                    </Typography>
                  )}
                  {!aiResult.success && aiResult.error && (
                    <Typography variant="body2" sx={{ color: 'error.main' }}>
                      错误: {aiResult.error}
                    </Typography>
                  )}
                </Box>
              </Alert>

              {/* Stats */}
              {aiResult.success && aiResult.stats && (
                <Box
                  sx={{
                    mt: 1,
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">总像素数</Typography>
                    <Typography variant="body2" fontWeight={600}>{aiResult.stats.totalPixels.toLocaleString()}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">差异像素数</Typography>
                    <Typography variant="body2" fontWeight={600} color="error.main">{aiResult.stats.diffPixels.toLocaleString()}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">差异占比</Typography>
                    <Typography variant="body2" fontWeight={600} color={aiResult.stats.diffPercentage > 5 ? 'error.main' : 'success.main'}>
                      {aiResult.stats.diffPercentage.toFixed(2)}%
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">匹配像素数</Typography>
                    <Typography variant="body2" fontWeight={600} color="success.main">{aiResult.stats.matchedPixels.toLocaleString()}</Typography>
                  </Box>
                </Box>
              )}

              {/* AI Suggestions List */}
              {aiSuggestions.length > 0 && (
                <Box
                  sx={{
                    mt: 1,
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  {/* Title bar with buttons on the LEFT */}
                  <Box display="flex" alignItems="center" flexWrap="wrap" gap={1} mb={1}>
                    <Button
                      variant="contained"
                      size="medium"
                      onClick={handleApplyAISuggestions}
                      sx={{
                        bgcolor: '#2196F3',
                        '&:hover': { bgcolor: '#1976D2' },
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        px: 2,
                        py: 0.5,
                      }}
                    >
                      一键添加全部
                    </Button>
                    {checkedSuggestionIds.size > 0 && (
                      <Button
                        variant="contained"
                        size="medium"
                        onClick={handleConfirmSuggestions}
                        sx={{
                          bgcolor: 'success.main',
                          '&:hover': { bgcolor: 'success.dark' },
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          px: 2,
                          py: 0.5,
                        }}
                      >
                        确定 ({checkedSuggestionIds.size})
                      </Button>
                    )}
                    <Typography variant="subtitle2" sx={{ ml: 0.5 }}>
                      💡 发现 {aiSuggestions.length} 个差异区域
                    </Typography>
                  </Box>
                  {/* Scrollable list - fixed 4.5 items height, 2 columns */}
                  <Box
                    sx={{
                      maxHeight: 270,
                      overflow: 'auto',
                      pr: 0.5,
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 0.5,
                      '&::-webkit-scrollbar': { width: 6 },
                      '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                      '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 3 },
                    }}
                  >
                    {[...aiSuggestions]
                      .sort((a, b) => {
                        const severityOrder = { critical: 0, major: 1, minor: 2 };
                        return severityOrder[a.severity] - severityOrder[b.severity];
                      })
                      .map((suggestion) => {
                        const checked = checkedSuggestionIds.has(suggestion.id);
                        return (
                          <Box
                            key={suggestion.id}
                            onClick={() => handleToggleSuggestion(suggestion, !checked)}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              p: 0.75,
                              borderRadius: 1,
                              borderLeft: '3px solid',
                              borderColor: suggestion.color,
                              bgcolor: checked ? 'rgba(33, 150, 243, 0.12)' : 'rgba(255,255,255,0.03)',
                              transition: 'all 0.2s',
                              cursor: 'pointer',
                              '&:hover': {
                                bgcolor: checked ? 'rgba(33, 150, 243, 0.18)' : 'rgba(255,255,255,0.06)',
                              },
                            }}
                          >
                            {/* Left: Content */}
                            <Box sx={{ flex: 1, minWidth: 0, mr: 0.75 }}>
                              <Box display="flex" alignItems="center" gap={0.5} mb={0.25}>
                                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                                  {suggestion.title}
                                </Typography>
                                <Box
                                  component="span"
                                  sx={{
                                    px: 0.4,
                                    py: 0.1,
                                    borderRadius: 0.5,
                                    fontSize: '0.55rem',
                                    fontWeight: 600,
                                    bgcolor: suggestion.severity === 'critical' ? 'error.main' :
                                            suggestion.severity === 'major' ? 'warning.main' : 'info.main',
                                    color: '#fff',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                  }}
                                >
                                  {suggestion.severity === 'critical' ? '严重' :
                                   suggestion.severity === 'major' ? '中等' : '轻微'}
                                </Box>
                              </Box>
                              <Typography variant="caption" display="block" sx={{ color: 'text.secondary', fontSize: '0.65rem', lineHeight: 1.3 }}>
                                {suggestion.description.length > 40 ? suggestion.description.slice(0, 40) + '...' : suggestion.description}
                              </Typography>
                            </Box>

                            {/* Right: Circular checkbox */}
                            <Box
                              sx={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                border: '2px solid',
                                borderColor: checked ? '#2196F3' : 'rgba(255,255,255,0.3)',
                                bgcolor: checked ? '#2196F3' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'all 0.2s',
                                ml: 0.5,
                              }}
                            >
                              {checked && (
                                <Box
                                  component="svg"
                                  viewBox="0 0 24 24"
                                  sx={{ width: 12, height: 12, color: '#fff' }}
                                >
                                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor" />
                                </Box>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                  </Box>
                </Box>
              )}
            </Box>
          </Fade>
        )}

        {/* Comparison View with mouse follow hint */}
        <Box
          sx={{ mt: 1.5, mb: 2, position: 'relative' }}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <ComparisonView
            mode={mode}
            screenshotSrc={screenshot?.src || null}
            figmaEmbedUrl={figmaEmbed || null}
            designImageSrc={designImage?.src || null}
            annotations={annotations}
            onImageClick={handleImageClick}
          />
        </Box>

        {/* Annotation List */}
        {annotations.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <AnnotationListPanel
              annotations={annotations}
              onRemove={handleAnnotationRemove}
              onUpdate={handleAnnotationUpdate}
            />
          </Box>
        )}

      </Container>

      {/* Add Annotation Dialog */}
      <AddAnnotationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleAnnotationSave}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Floating hint that follows mouse */}
      {showHint && (
        <Fade in>
          <Box
            sx={{
              position: 'fixed',
              left: mousePos.x + 15,
              top: mousePos.y + 15,
              px: 1.5,
              py: 0.75,
              borderRadius: 2,
              bgcolor: 'rgba(33, 150, 243, 0.95)',
              color: '#fff',
              fontSize: '0.8125rem',
              fontWeight: 600,
              zIndex: 9999,
              pointerEvents: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              whiteSpace: 'nowrap',
            }}
          >
            双击添加差异标注
          </Box>
        </Fade>
      )}
    </Box>
  );
}
