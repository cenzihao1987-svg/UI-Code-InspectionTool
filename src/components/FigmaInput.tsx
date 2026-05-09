import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  IconButton,
  useTheme,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Collapse,
  Fade,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DesignServicesOutlinedIcon from '@mui/icons-material/DesignServicesOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CenterFocusStrongOutlinedIcon from '@mui/icons-material/CenterFocusStrongOutlined';
import KeyIcon from '@mui/icons-material/Key';
import { isValidFigmaUrl, buildFigmaEmbedUrl, parseNodeId, fetchFigmaFrameImage, validateFigmaToken } from '../utils/figmaEmbed';

interface FigmaInputProps {
  embedUrl: string | null;
  designImage: string | null;
  onFigmaLoad: (embedUrl: string) => void;
  onImageSelect: (dataUrl: string, file: File) => void;
  onClear: () => void;
}

type InputMode = 'figma-link' | 'image-upload';

export default function FigmaInput({
  embedUrl,
  designImage,
  onFigmaLoad,
  onImageSelect,
  onClear,
}: FigmaInputProps) {
  const theme = useTheme();
  const [inputMode, setInputMode] = useState<InputMode>('figma-link');
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [nodeId, setNodeId] = useState('');
  const [showFrameInput, setShowFrameInput] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [fetchingImage, setFetchingImage] = useState(false);
  const [corsError, setCorsError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load API token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('figma_api_token');
    if (savedToken) {
      setApiToken(savedToken);
      setTokenValid(true);
      setShowTokenInput(false); // Hide token input if token is saved
    }
  }, []);

  // Validate and save token
  const handleTokenChange = async (token: string) => {
    setApiToken(token);
    if (token.trim()) {
      setTokenValid(null); // Reset validation state
      const isValid = await validateFigmaToken(token.trim());
      setTokenValid(isValid);
      if (isValid) {
        localStorage.setItem('figma_api_token', token.trim());
      } else {
        localStorage.removeItem('figma_api_token');
      }
    } else {
      setTokenValid(null);
      localStorage.removeItem('figma_api_token');
    }
  };

  const hasContent = embedUrl || designImage;

  // ---- Figma link handlers ----
  const handleLoad = async () => {
    const url = inputValue.trim();
    if (!url) {
      setError('请输入 Figma 链接');
      return;
    }
    if (!isValidFigmaUrl(url)) {
      setError('请输入有效的 Figma 链接');
      return;
    }
    setError('');
    setCorsError(false);

    // If node-id is specified and we have API token, fetch the frame image
    const currentNodeId = nodeId || parseNodeId(url);
    if (currentNodeId && apiToken.trim()) {
      setFetchingImage(true);
      try {
        const imageUrl = await fetchFigmaFrameImage(url, currentNodeId, apiToken.trim());
        
        // Pass the URL directly - the Image object will load it without CORS issues
        // (CORS only applies when reading image data, not when displaying)
        const mockFile = new File([], 'figma-frame.png', { type: 'image/png' });
        onImageSelect(imageUrl, mockFile);
        setFetchingImage(false);
        return;
      } catch (err: any) {
        // Check if it's a CORS error
        if (err.message?.includes('CORS') || err.message?.includes('Failed to fetch')) {
          setCorsError(true);
        }
        setError(`获取 Frame 图片失败: ${err.message || '未知错误'}`);
        setFetchingImage(false);
        // Fall through to embed URL as fallback
      }
    }

    // Fallback: use embed URL (will show all frames)
    setLoading(true);
    setTimeout(() => {
      const embedUrlResult = buildFigmaEmbedUrl(url, nodeId || undefined);
      onFigmaLoad(embedUrlResult);
      setLoading(false);
    }, 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLoad();
  };

  // ---- Image upload handlers ----
  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onImageSelect(e.target.result as string, file);
        }
      };
      reader.readAsDataURL(file);
    },
    [onImageSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleModeChange = (_: any, newMode: InputMode | null) => {
    if (newMode && !hasContent) {
      setInputMode(newMode);
      setError('');
    }
  };

  const dragBorderColor = isDragging
    ? theme.palette.primary.main
    : theme.palette.divider;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 0,
        height: 400,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: theme.palette.background.paper,
        border: '1px solid',
        borderColor: theme.palette.divider,
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid',
          borderColor: theme.palette.divider,
          flexWrap: 'wrap',
        }}
      >
        <DesignServicesOutlinedIcon
          sx={{ fontSize: 20, color: theme.palette.primary.main }}
        />
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Figma 设计稿
        </Typography>

        {!hasContent && (
          <ToggleButtonGroup
            value={inputMode}
            exclusive
            onChange={handleModeChange}
            size="small"
            sx={{
              ml: 'auto',
              '& .MuiToggleButton-root': {
                border: `1px solid ${theme.palette.divider}`,
                px: 1,
                py: 0.25,
                fontSize: '0.75rem',
                gap: 0.5,
                borderRadius: '6px !important',
                '&.Mui-selected': {
                  bgcolor: '#4F378B',
                  color: '#EADDFF',
                },
              },
            }}
          >
            <ToggleButton value="figma-link">
              <LinkIcon sx={{ fontSize: 14 }} /> 链接
            </ToggleButton>
            <ToggleButton value="image-upload">
              <ImageOutlinedIcon sx={{ fontSize: 14 }} /> 图片
            </ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

      {/* Content area */}
      {hasContent ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            minHeight: 220,
          }}
        >
          {embedUrl && (
            <iframe
              src={embedUrl}
              style={{
                width: '100%',
                height: '100%',
                minHeight: 320,
                border: 'none',
              }}
              allowFullScreen
              title="Figma Design"
            />
          )}
          {designImage && (
            <Box
              component="img"
              src={designImage}
              alt="Design preview"
              sx={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                p: 1,
              }}
            />
          )}
          <IconButton
            onClick={onClear}
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(0,0,0,0.5)',
              color: '#fff',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
              zIndex: 10,
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      ) : inputMode === 'figma-link' ? (
        /* Figma link input */
        <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="https://www.figma.com/file/..."
              value={inputValue}
              onChange={(e) => {
                const val = e.target.value;
                setInputValue(val);
                if (error) setError('');
                // Auto-detect node-id from pasted URL
                const detected = parseNodeId(val);
                if (detected) {
                  setNodeId(detected);
                  setShowFrameInput(true);
                }
              }}
              onKeyDown={handleKeyDown}
              error={!!error}
              helperText={error}
              InputProps={{
                startAdornment: (
                  <LinkIcon
                    sx={{ mr: 0.5, color: theme.palette.text.secondary, fontSize: 18 }}
                  />
                ),
              }}
              sx={{
                '& .MuiFormHelperText-root': {
                  position: 'absolute',
                  bottom: -20,
                  m: 0,
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleLoad}
              disabled={loading}
              sx={{ minWidth: 72, height: 40 }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : '加载'}
            </Button>
          </Box>

          {/* 指定 Frame / Node-ID */}
          <Box
            onClick={() => setShowFrameInput(!showFrameInput)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 1.5,
              mb: 0.5,
              cursor: 'pointer',
              color: 'text.secondary',
              '&:hover': { color: theme.palette.primary.main },
              userSelect: 'none',
            }}
          >
            <CenterFocusStrongOutlinedIcon sx={{ fontSize: 16 }} />
            <Typography variant="caption" sx={{ fontWeight: 500 }}>
              指定 Frame{nodeId ? ` (${nodeId})` : ''}
            </Typography>
            {showFrameInput ? (
              <ExpandLessIcon sx={{ fontSize: 16, ml: 'auto' }} />
            ) : (
              <ExpandMoreIcon sx={{ fontSize: 16, ml: 'auto' }} />
            )}
          </Box>

          {showFrameInput && (
            <TextField
              fullWidth
              size="small"
              placeholder="例如: 123-456 或 0:1"
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              InputProps={{
                startAdornment: (
                  <CenterFocusStrongOutlinedIcon
                    sx={{ mr: 0.5, color: theme.palette.text.secondary, fontSize: 16 }}
                  />
                ),
              }}
              sx={{
                mb: 1.5,
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.8rem',
                },
              }}
            />
          )}

          {/* Figma API Token (for fetching single frame image) */}
          <Box
            onClick={() => setShowTokenInput(!showTokenInput)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 1,
              mb: 0.5,
              cursor: 'pointer',
              color: tokenValid === false ? 'error.main' : tokenValid ? 'success.main' : 'text.secondary',
              '&:hover': { color: theme.palette.primary.main },
              userSelect: 'none',
            }}
          >
            <KeyIcon sx={{ fontSize: 16 }} />
            <Typography variant="caption" sx={{ fontWeight: 500 }}>
              {tokenValid === true
                ? 'Figma API Token (已验证)'
                : tokenValid === false
                ? 'Figma API Token (验证失败)'
                : 'Figma API Token (可选)'}
            </Typography>
            {showTokenInput ? (
              <ExpandLessIcon sx={{ fontSize: 16, ml: 'auto' }} />
            ) : (
              <ExpandMoreIcon sx={{ fontSize: 16, ml: 'auto' }} />
            )}
          </Box>

          <Collapse in={showTokenInput}>
            <TextField
              fullWidth
              size="small"
              type="password"
              placeholder="输入 Figma API Token..."
              value={apiToken}
              onChange={(e) => handleTokenChange(e.target.value)}
              helperText="用于获取指定 Frame 的图片。Token 将保存在本地。"
              FormHelperTextProps={{ sx: { fontSize: '0.7rem' } }}
              sx={{
                mb: 1.5,
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.8rem',
                },
              }}
            />
          </Collapse>

          {/* CORS Error Alert */}
          <Collapse in={corsError}>
            <Alert
              severity="warning"
              sx={{ mb: 1.5, fontSize: '0.75rem' }}
              onClose={() => setCorsError(false)}
            >
              由于浏览器 CORS 限制，无法直接调用 Figma API。请使用 CORS 代理扩展，或将 Token 和 Frame URL 交给开发人员处理。
            </Alert>
          </Collapse>

          {fetchingImage && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary">
                正在获取 Frame 图片...
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              mt: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              color: 'text.secondary',
              opacity: 0.5,
            }}
          >
            <DesignServicesOutlinedIcon sx={{ fontSize: 36 }} />
            <Typography variant="caption">输入 Figma 链接查看设计稿</Typography>
          </Box>
        </Box>
      ) : (
        /* Image upload mode */
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 220,
          }}
        >
          <Box
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            sx={{
              width: 'calc(100% - 32px)',
              height: 'calc(100% - 32px)',
              m: 2,
              border: '2px dashed',
              borderColor: dragBorderColor,
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              bgcolor: isDragging
                ? 'rgba(208, 188, 255, 0.05)'
                : 'transparent',
              '&:hover': {
                bgcolor: 'rgba(208, 188, 255, 0.05)',
                borderColor: theme.palette.primary.main,
              },
            }}
          >
            <CloudUploadOutlinedIcon
              sx={{
                fontSize: 48,
                color: isDragging
                  ? theme.palette.primary.main
                  : theme.palette.text.secondary,
              }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              {isDragging ? '松开以上传' : '上传 Figma 导出的设计稿截图'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              从 Figma 导出 PNG 后拖拽或点击上传
            </Typography>
          </Box>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </Box>
      )}
    </Paper>
  );
}
