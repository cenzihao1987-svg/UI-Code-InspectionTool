# UI 走查工具 (UI Inspection Tool)

一个强大的 UI 走查工具,帮助设计师和开发者快速对比界面截图与设计稿,标记差异点,并生成专业的走查报告。

![UI Inspection Tool](./docs/screenshot.png)

## ✨ 特性

- 📸 **截图对比** - 上传界面截图和设计稿,进行像素级对比
- 🎯 **差异标注** - 在截图上标记 UI 差异,支持多种类型(尺寸、间距、颜色、对齐、文字等)
- 🎚️ **滑块对比** - 独特的滑块视图,拖动滑块实时对比截图和设计稿
- 📊 **严重程度** - 为每个标注标记严重程度(轻微/中等/严重)
- 📄 **导出报告** - 一键导出精美的走查报告图片
- 🎨 **Figma 集成** - 支持直接输入 Figma 设计稿链接
- 🌐 **网页截图** - 自动截图设计稿网页(需要启动后端服务)
- 💜 **紫色主题** - 精美的 Material Design 3 风格界面

## 🚀 快速开始

### 安装依赖

```bash
cd ui-inspection-tool
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5173` 即可使用。

### 构建生产版本

```bash
npm run build
```

构建产物在 `dist/` 目录下。

### 预览生产版本

```bash
npm run preview
```

## 📖 使用指南

### 1. 上传截图和设计稿

- 点击"上传界面截图"按钮,选择界面截图
- 点击"加载 Figma 设计稿"按钮,可以:
  - 直接粘贴 Figma 链接(需要配置 Token)
  - 上传设计稿图片(PNG/JPG)

### 2. 添加标注

- 在"左右对比"或"滑块对比"模式下,**双击图片**添加标注
- 选择差异类型:尺寸、间距、颜色、对齐、文字、其他
- 设置严重程度:轻微、中等、严重
- 添加标题和详细描述

### 3. 导出报告

- 点击"导出完整报告图片"按钮
- 自动生成包含对比视图和标注清单的专业报告
- 下载 PNG 格式的报告图片

## 🛠️ 高级功能

### Figma 集成

1. 获取 Figma Access Token:
   - 访问 Figma 设置页面
   - 创建个人访问令牌(Personal access token)
   
2. 配置 Token:
   - 点击界面左上角的"设置"按钮
   - 输入 Figma Access Token
   - 保存后自动生效

3. 使用 Figma 链接:
   - 粘贴 Figma 设计稿链接
   - 工具会自动通过 Figma API 导出设计稿图片

### 网页截图服务(可选)

如果需要截图设计稿网页(如蓝湖、MasterGo 等),需要启动后端服务:

```bash
cd server
npm install
node server.js
```

服务将在 `http://localhost:3001` 启动。

## 📂 项目结构

```
ui-inspection-tool/
├── src/
│   ├── components/
│   │   ├── ComparisonView.tsx   # 对比视图(左右对比+滑块对比)
│   │   ├── ExportReportButton.tsx # 导出报告按钮
│   │   ├── ImageUploader.tsx     # 图片上传组件
│   │   ├── ModeSwitcher.tsx     # 模式切换器
│   │   └── SettingsDialog.tsx   # 设置对话框
│   ├── services/
│   │   ├── figmaService.ts      # Figma API 服务
│   │   └── imageComparisonService.ts # 图片对比服务
│   ├── types.ts                 # TypeScript 类型定义
│   ├── App.tsx                  # 主应用组件
│   ├── main.tsx                 # 入口文件
│   └── index.css                # 全局样式
├── server/                      # 后端截图服务
│   ├── server.js                # Express + Puppeteer 服务器
│   └── package.json
├── dist/                        # 构建产物
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🎨 技术栈

- **前端框架**: React 18 + TypeScript
- **UI 组件库**: Material-UI (MUI) v5
- **构建工具**: Vite
- **截图功能**: html2canvas
- **Figma 集成**: Figma API
- **后端服务**(可选): Express + Puppeteer

## 🔧 配置说明

### Vite 配置

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
```

### TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

## 📝 标注类型说明

| 类型 | 颜色 | 说明 |
|------|------|------|
| 尺寸 | 🔴 红色 | 元素尺寸不符合设计稿 |
| 间距 | 🟢 绿色 | 元素间距不符合设计稿 |
| 颜色 | 🟡 黄色 | 颜色不符合设计稿 |
| 对齐 | 🔵 蓝色 | 元素对齐不符合设计稿 |
| 文字 | 🟣 紫色 | 字体、字号、行高不符合设计稿 |
| 其他 | ⚪ 灰色 | 其他差异 |

## 🎯 最佳实践

1. **截图准备**
   - 使用一致的屏幕尺寸截图
   - 确保截图清晰,分辨率足够高
   - 尽量截取完整页面

2. **设计稿准备**
   - 优先上传设计稿图片(PNG/JPG)
   - 如果使用 Figma,确保 Token 配置正确
   - 设计稿尺寸尽量与截图一致

3. **标注技巧**
   - 先标注严重问题,再标注轻微问题
   - 描述要清晰具体,便于开发人员理解
   - 使用准确的差异类型分类

4. **报告导出**
   - 导出前检查所有标注是否完整
   - 预览报告,确保图片清晰
   - 发送给相关人员时,附上说明

## 🐛 常见问题

### 1. Figma 设计稿无法加载?

**解决方案**:
- 检查 Figma Access Token 是否正确
- 确保 Figma 链接格式正确(包含文件 ID 和节点 ID)
- 检查网络连接,确保可以访问 Figma API

### 2. 导出报告时图片不显示?

**解决方案**:
- 如果使用设计稿网页链接,需要启动后端截图服务
- 优先上传设计稿图片,避免跨域问题
- 检查浏览器控制台,查看详细错误信息

### 3. 滑块对比时图片不对齐?

**解决方案**:
- 确保截图和设计稿尺寸一致
- 工具会自动缩放到相同宽度,但高度可能不同
- 可以手动调整浏览器缩放比例

### 4. 标注无法添加?

**解决方案**:
- 确保已上传截图和设计稿
- 使用**双击**(不是单击)添加标注
- 检查是否处于正确的对比模式

## 🤝 贡献指南

欢迎贡献代码、提出建议或报告问题!

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Material-UI](https://mui.com/) - 优秀的 React UI 组件库
- [Vite](https://vitejs.dev/) - 极速的前端构建工具
- [Figma](https://www.figma.com/) - 强大的设计工具
- [html2canvas](https://html2canvas.hertzen.com/) - 网页截图库

## 📧 联系方式

如有问题或建议,欢迎通过以下方式联系:

- 提交 GitHub Issue
- 发送邮件至: [277821759@qq.com]

---

⭐ 如果这个项目对您有帮助,请给它一个 Star!
