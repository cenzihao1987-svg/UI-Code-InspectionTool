import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Typography, useTheme } from '@mui/material';
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined';
import SwipeOutlinedIcon from '@mui/icons-material/SwipeOutlined';
import { CompareMode } from '../types';

interface ModeSwitcherProps {
  mode: CompareMode;
  onChange: (mode: CompareMode) => void;
  disabled?: boolean;
}

const modes: { value: CompareMode; label: string; icon: React.ReactElement }[] = [
  { value: 'side-by-side', label: '并排对比', icon: <ViewSidebarOutlinedIcon /> },
  { value: 'slider', label: '滑块对比', icon: <SwipeOutlinedIcon /> },
];

export default function ModeSwitcher({ mode, onChange, disabled }: ModeSwitcherProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1.5,
        px: 0.5,
        flexWrap: 'wrap',
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{ color: 'text.secondary', fontWeight: 500, whiteSpace: 'nowrap' }}
      >
        对比模式
      </Typography>
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={(_, newMode) => {
          if (newMode !== null) onChange(newMode);
        }}
        size="small"
        disabled={disabled}
        sx={{
          gap: 0.5,
          '& .MuiToggleButtonGroup-grouped': {
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '8px !important',
            mx: 0,
            px: 1.5,
            py: 0.75,
            gap: 0.75,
            fontSize: '0.8125rem',
            '&:not(:first-of-type)': {
              borderLeft: `1px solid ${theme.palette.divider}`,
            },
          },
        }}
      >
        {modes.map((m) => (
          <ToggleButton key={m.value} value={m.value}>
            {React.cloneElement(m.icon, { sx: { fontSize: 18 } })}
            {m.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
