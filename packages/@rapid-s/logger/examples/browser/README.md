# @x/logger Browser Example

一个使用 Bun + React + Tailwind CSS 构建的 @x/logger 浏览器演示项目。

## 功能特性

- 📊 实时日志展示面板
- 🎨 彩色日志输出(匹配终端样式)
- 🔍 日志级别过滤
- 📝 上下文数据展示
- ⏱️ 时间戳显示
- 🏷️ 命名空间支持
- 🧪 多种测试场景

## 安装依赖

```bash
bun install
```

## 开发模式

```bash
bun dev
```

然后在浏览器中打开 http://localhost:3000

## 生产模式

```bash
bun start
```

## 构建

```bash
bun run build
```

## 使用说明

1. **日志级别**: 点击顶部的级别按钮(TRACE/DEBUG/INFO/WARN/ERROR/FATAL/SILENT)切换日志过滤级别
2. **测试按钮**: 
   - 测试基础日志 - 输出所有级别的日志
   - 测试带上下文 - 展示如何记录结构化数据
   - 测试命名空间 - 展示子 logger 功能
   - 测试嵌套命名空间 - 展示多层命名空间
   - 测试性能计时 - 展示计时功能
3. **显示选项**: 切换时间戳和上下文数据的显示/隐藏
4. **清空日志**: 清除所有日志记录

## 技术栈

- Bun - JavaScript 运行时和打包工具
- React 19 - UI 框架
- Tailwind CSS 4 - 样式框架
- @x/logger - 日志库

---

本项目基于 Bun React Template 创建。
