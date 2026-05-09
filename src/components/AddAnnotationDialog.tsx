import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  useTheme,
} from '@mui/material';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import SpaceBarIcon from '@mui/icons-material/SpaceBar';
import PaletteIcon from '@mui/icons-material/Palette';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Annotation, AnnotationType } from '../types';

interface AddAnnotationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    type: AnnotationType;
    title: string;
    description: string;
    severity: 'minor' | 'moderate' | 'major';
  }) => void;
  onUpdate?: (data: {
    type: AnnotationType;
    title: string;
    description: string;
    severity: 'minor' | 'moderate' | 'major';
  }) => void;
  editingAnnotation?: Annotation | null;
}

const TYPE_OPTIONS: { value: AnnotationType; label: string; icon: React.ReactElement; color: string }[] = [
  { value: 'size', label: '尺寸', icon: <CropSquareIcon />, color: '#FF6B6B' },
  { value: 'spacing', label: '间距', icon: <SpaceBarIcon />, color: '#4ECDC4' },
  { value: 'color', label: '颜色', icon: <PaletteIcon />, color: '#FFD93D' },
  { value: 'alignment', label: '对齐', icon: <FormatAlignCenterIcon />, color: '#6C5CE7' },
  { value: 'typography', label: '文字', icon: <TextFieldsIcon />, color: '#A8E6CF' },
  { value: 'other', label: '其他', icon: <HelpOutlineIcon />, color: '#95A5A6' },
];

const SEVERITY_OPTIONS: { value: 'minor' | 'moderate' | 'major'; label: string; color: string }[] = [
  { value: 'minor', label: '轻微', color: '#FFA726' },
  { value: 'moderate', label: '中等', color: '#FF7043' },
  { value: 'major', label: '严重', color: '#EF5350' },
];

export default function AddAnnotationDialog({ open, onClose, onSave, onUpdate, editingAnnotation }: AddAnnotationDialogProps) {
  const theme = useTheme();
  const [type, setType] = useState<AnnotationType>('size');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'minor' | 'moderate' | 'major'>('moderate');
  const [titleError, setTitleError] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (editingAnnotation) {
      setType(editingAnnotation.type);
      setTitle(editingAnnotation.title);
      setDescription(editingAnnotation.description || '');
      setSeverity(editingAnnotation.severity);
      setTitleError(false);
    } else {
      // Reset form when not editing
      setType('size');
      setTitle('');
      setDescription('');
      setSeverity('moderate');
      setTitleError(false);
    }
  }, [editingAnnotation, open]);

  const isEditing = !!editingAnnotation;

  const handleSave = () => {
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    if (isEditing && onUpdate) {
      onUpdate({ type, title: title.trim(), description: description.trim(), severity });
    } else {
      onSave({ type, title: title.trim(), description: description.trim(), severity });
    }
    // Reset form
    setType('size');
    setTitle('');
    setDescription('');
    setSeverity('moderate');
    setTitleError(false);
  };

  const handleClose = () => {
    setType('size');
    setTitle('');
    setDescription('');
    setSeverity('moderate');
    setTitleError(false);
    onClose();
  };

  const selectedColor = TYPE_OPTIONS.find((t) => t.value === type)?.color || '#D0BCFF';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#2B2930',
          backgroundImage: 'none',
          borderRadius: 3,
          border: '1px solid #49454F',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              bgcolor: selectedColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {isEditing ? '✎' : '+'}
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
            {isEditing ? '编辑差异标注' : '添加差异标注'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Type selection */}
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block', fontWeight: 500 }}>
          差异类型
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2.5 }}>
          {TYPE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              icon={React.cloneElement(opt.icon, { sx: { fontSize: 16, color: type === opt.value ? '#fff' : opt.color } })}
              onClick={() => setType(opt.value)}
              variant={type === opt.value ? 'filled' : 'outlined'}
              sx={{
                px: 0.5,
                fontWeight: 600,
                fontSize: '0.8rem',
                bgcolor: type === opt.value ? opt.color : 'transparent',
                color: type === opt.value ? '#fff' : opt.color,
                borderColor: type === opt.value ? opt.color : 'divider',
                '&:hover': { bgcolor: type === opt.value ? opt.color : `${opt.color}20` },
              }}
            />
          ))}
        </Box>

        {/* Title */}
        <TextField
          fullWidth
          size="small"
          label="标注标题"
          placeholder="例如：按钮尺寸不一致"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (titleError) setTitleError(false);
          }}
          error={titleError}
          helperText={titleError ? '请输入标注标题' : ''}
          sx={{ mb: 2 }}
        />

        {/* Description */}
        <TextField
          fullWidth
          size="small"
          label="差异描述"
          placeholder="描述具体的差异内容和建议修复方式..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          rows={3}
          sx={{ mb: 2.5 }}
        />

        {/* Severity */}
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block', fontWeight: 500 }}>
          严重程度
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {SEVERITY_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              onClick={() => setSeverity(opt.value)}
              variant={severity === opt.value ? 'filled' : 'outlined'}
              sx={{
                flex: 1,
                fontWeight: 600,
                fontSize: '0.8rem',
                bgcolor: severity === opt.value ? opt.color : 'transparent',
                color: severity === opt.value ? '#fff' : opt.color,
                borderColor: severity === opt.value ? opt.color : 'divider',
                '&:hover': { bgcolor: severity === opt.value ? opt.color : `${opt.color}20` },
              }}
            />
          ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit" sx={{ borderColor: 'divider' }}>
          取消
        </Button>
        <Button onClick={handleSave} variant="contained" sx={{ bgcolor: '#D0BCFF', color: '#381E72', fontWeight: 700 }}>
          {isEditing ? '更新标注' : '保存标注'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
