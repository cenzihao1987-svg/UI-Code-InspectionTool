import React from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  useTheme,
  Divider,
  Tooltip,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import SpaceBarIcon from '@mui/icons-material/SpaceBar';
import PaletteIcon from '@mui/icons-material/Palette';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Annotation, AnnotationType } from '../types';

interface AnnotationListPanelProps {
  annotations: Annotation[];
  onRemove: (id: number) => void;
  onUpdate: (id: number, data: Partial<Omit<Annotation, 'id' | 'x' | 'y'>>) => void;
  onEdit: (id: number) => void;
}

const TYPE_COLORS: Record<AnnotationType, string> = {
  size: '#FF6B6B',
  spacing: '#4ECDC4',
  color: '#FFD93D',
  alignment: '#6C5CE7',
  typography: '#A8E6CF',
  other: '#95A5A6',
};

const TYPE_LABELS: Record<AnnotationType, string> = {
  size: '尺寸',
  spacing: '间距',
  color: '颜色',
  alignment: '对齐',
  typography: '文字',
  other: '其他',
};

const TYPE_ICONS: Record<AnnotationType, React.ReactElement> = {
  size: <CropSquareIcon sx={{ fontSize: 16 }} />,
  spacing: <SpaceBarIcon sx={{ fontSize: 16 }} />,
  color: <PaletteIcon sx={{ fontSize: 16 }} />,
  alignment: <FormatAlignCenterIcon sx={{ fontSize: 16 }} />,
  typography: <TextFieldsIcon sx={{ fontSize: 16 }} />,
  other: <HelpOutlineIcon sx={{ fontSize: 16 }} />,
};

const SEVERITY_LABELS: Record<string, string> = {
  minor: '轻微',
  moderate: '中等',
  major: '严重',
};

const SEVERITY_COLORS: Record<string, string> = {
  minor: '#FFA726',
  moderate: '#FF7043',
  major: '#EF5350',
};

export default function AnnotationListPanel({ annotations, onRemove, onUpdate, onEdit }: AnnotationListPanelProps) {
  const theme = useTheme();

  if (annotations.length === 0) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        border: '1px solid',
        borderColor: theme.palette.divider,
        borderRadius: 3,
        bgcolor: theme.palette.background.paper,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          差异标注清单
        </Typography>
        <Typography
          variant="caption"
          sx={{
            ml: 'auto',
            color: theme.palette.primary.main,
            fontWeight: 600,
            bgcolor: `${theme.palette.primary.main}20`,
            px: 1,
            py: 0.25,
            borderRadius: 1,
          }}
        >
          共 {annotations.length} 项
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {annotations.map((ann) => {
          const color = TYPE_COLORS[ann.type];
          const sevColor = SEVERITY_COLORS[ann.severity];
          return (
            <Box
              key={ann.id}
              sx={{
                display: 'flex',
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: '#2B2930',
                border: '1px solid',
                borderColor: theme.palette.divider,
                alignItems: 'flex-start',
              }}
            >
              {/* Number badge */}
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  minWidth: 26,
                  borderRadius: '50%',
                  bgcolor: color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 800,
                  fontFamily: 'Manrope, sans-serif',
                  mt: 0.25,
                }}
              >
                {ann.id}
              </Box>

              {/* Content */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                  {React.cloneElement(TYPE_ICONS[ann.type], { sx: { fontSize: 15, color } })}
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color, fontSize: '0.8125rem' }}
                  >
                    {TYPE_LABELS[ann.type]}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                    — {ann.title}
                  </Typography>
                  <Box
                    sx={{
                      ml: 'auto',
                      px: 0.75,
                      py: 0.15,
                      borderRadius: 1,
                      bgcolor: `${sevColor}25`,
                      color: sevColor,
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {SEVERITY_LABELS[ann.severity]}
                  </Box>
                </Box>
                {ann.description && (
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.4 }}
                  >
                    {ann.description}
                  </Typography>
                )}
              </Box>

              {/* Action buttons */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: -0.25 }}>
                <Tooltip title="编辑标注">
                  <IconButton
                    size="small"
                    onClick={() => onEdit(ann.id)}
                    sx={{
                      color: theme.palette.primary.main,
                      '&:hover': { color: theme.palette.primary.dark },
                    }}
                  >
                    <EditOutlinedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="删除标注">
                  <IconButton
                    size="small"
                    onClick={() => onRemove(ann.id)}
                    sx={{
                      color: theme.palette.text.secondary,
                      '&:hover': { color: '#EF5350' },
                    }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
