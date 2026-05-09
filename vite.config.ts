import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // 允许内网访问
    open: false,
    proxy: {
      // 代理 Figma API 请求，解决 CORS 问题
      '/api/figma': {
        target: 'https://api.figma.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/figma/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[Figma Proxy]', proxyReq.method, proxyReq.path);
          });
        },
      },
    },
  },
  preview: {
    port: 4173,
    host: '0.0.0.0',
  },
})
