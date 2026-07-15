# Flowcraft 流程展示编辑器

一个可直接在浏览器中使用的流程展示编辑器。数据保存在当前浏览器本地，不依赖服务端。

## 功能

- 创建、切换和删除多份流程图
- 流程列横向排列，支持独立主题色和增删改
- 子节点支持多标签、排序和增删改
- 标签库支持自定义标签名、颜色和删除
- 支持版本号、版本快照与回档
- 编辑和预览模式均可自适应列数导出 PNG
- 提供在线版与可转发的单文件离线版

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

浏览器访问 `http://localhost:3000/`。

## 构建

```bash
# 检查应用构建
npm run build

# 生成离线 HTML 与 GitHub Pages 页面
npm run build:standalone
```

离线文件生成到 `export/Flowcraft-流程展示编辑器-离线版.html`，GitHub Pages 页面生成到 `docs/index.html`。

## 数据说明

流程内容、标签库和版本记录使用浏览器 `localStorage` 保存。更换浏览器、清理浏览器数据或换电脑时不会自动同步，请按需导出 PNG 或保留原浏览器数据。
