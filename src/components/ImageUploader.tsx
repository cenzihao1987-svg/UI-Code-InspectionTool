import React, { useCallback, useRef, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  useTheme,
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';

interface ImageUploaderProps {
  image: string | null;
  onImageSelect: (dataUrl: string, file: File) => void;
  onClear: () => void;
}

export default function ImageUploader({ image, onImageSelect, onClear }: ImageUploaderProps) {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const borderColor = isDragging
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
        position: 'relative',
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
        }}
      >
        <ImageOutlinedIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          界面截图
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
          PNG / JPG / WebP
        </Typography>
      </Box>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          minHeight: 260,
        }}
      >
        {image ? (
          <>
            <Box
              component="img"
              src={image}
              alt="Screenshot preview"
              sx={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                p: 1,
              }}
            />
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
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        ) : (
          <Box
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            sx={{
              width: 'calc(100% - 32px)',
              height: 'calc(100% - 32px)',
              m: 2,
              border: '2px dashed',
              borderColor,
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
              拖拽上传界面截图
            </Typography>
            <Typography variant="caption" color="text.secondary">
              或点击此处选择文件
            </Typography>
          </Box>
        )}
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </Paper>
  );
}
