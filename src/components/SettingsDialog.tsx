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
  IconButton,
  Tooltip,
  Alert,
  Link,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const FIGMA_TOKEN_KEY = 'figma_access_token';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [figmaToken, setFigmaToken] = useState('');
  const [saved, setSaved] = useState(false);

  // 加载已保存的 token
  useEffect(() => {
    if (open) {
      const savedToken = localStorage.getItem(FIGMA_TOKEN_KEY) || '';
      setFigmaToken(savedToken);
      setSaved(false);
    }
  }, [open]);

  const handleSave = () => {
    localStorage.setItem(FIGMA_TOKEN_KEY, figmaToken.trim());
    setSaved(true);
    setTimeout(() => onClose(), 1000);
  };

  const handleClear = () => {
    setFigmaToken('');
    localStorage.removeItem(FIGMA_TOKEN_KEY);
    setSaved(true);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <SettingsIcon />
          <Typography variant="h6" component="span">
            设置
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            配置 API Token 以支持设计稿导出功能
          </Alert>

          {/* Figma Token */}
          <Box sx={{ mb: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Typography variant="subtitle2">Figma Access Token</Typography>
              <Tooltip title="点击查看如何获取 Figma Token">
                <IconButton
                  size="small"
                  onClick={() =>
                    window.open('https://www.figma.com/developers/api#access-tokens', '_blank')
                  }
                >
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <TextField
              fullWidth
              type="password"
              placeholder="输入 Figma Access Token..."
              value={figmaToken}
              onChange={(e) => setFigmaToken(e.target.value)}
              helperText={
                <span>
                  获取方式：登录 Figma → 右上角头像 → Settings → Account → Personal access tokens →
                  <Link
                    href="https://www.figma.com/developers/api#access-tokens"
                    target="_blank"
                    rel="noopener"
                  >
                    查看详细教程
                  </Link>
                </span>
              }
              sx={{ mb: 1 }}
            />

            <Box display="flex" gap={1}>
              <Button onClick={handleClear} size="small" color="error">
                清除 Token
              </Button>
            </Box>
          </Box>

          {/* 使用说明 */}
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              ⚠️ 注意事项
            </Typography>
            <Typography variant="body2" component="div">
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>Figma Token 仅保存在浏览器本地，不会上传到服务器</li>
                <li>使用 Token 可以从 Figma 导出设计稿图片用于报告导出</li>
                <li>如果没有 Token，导出报告时 Figma 设计稿将无法显示</li>
              </ul>
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>取消</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={saved}
        >
          {saved ? '已保存' : '保存设置'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * 获取保存的 Figma Token
 */
export function getFigmaToken(): string | null {
  return localStorage.getItem(FIGMA_TOKEN_KEY);
}

/**
 * 检查是否有保存的 Figma Token
 */
export function hasFigmaToken(): boolean {
  return !!localStorage.getItem(FIGMA_TOKEN_KEY);
}
