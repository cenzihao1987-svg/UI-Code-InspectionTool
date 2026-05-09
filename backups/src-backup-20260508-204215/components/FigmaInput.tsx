import React, { useState, useRef, useCallback } from 'react';
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
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DesignServicesOutlinedIcon from '@mui/icons-material/DesignServicesOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CenterFocusStrongOutlinedIcon from '@mui/icons-material/CenterFocusStrongOutlined';
import { isValidFigmaUrl, buildFigmaEmbedUrl, parseNodeId } from '../utils/figmaEmbed';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasContent = embedUrl || designImage;

  // ---- Figma link handlers ----
  const handleLoad = () => {
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
