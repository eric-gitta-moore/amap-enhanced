# 贡献指南

感谢您对 amap-enhanced 项目感兴趣！我们欢迎任何形式的贡献。

## 开发环境配置

1. 克隆项目到本地
```bash
git clone https://github.com/eric-gitta-moore/amap-enhanced.git
cd amap-enhanced
```

2. 安装 Tampermonkey 浏览器扩展
3. 在 Tampermonkey 中创建新脚本，将 `src/amap.js` 的内容复制进去

## 开发规范

### 代码风格

- 使用 2 空格缩进
- 使用分号结束语句
- 使用单引号作为字符串引号
- 变量和函数使用驼峰命名法
- 保持代码简洁，添加必要的注释

### 功能开发

1. 地图绘制功能
   - 新增绘制工具时，在 `draw()` 函数中添加对应的 case
   - 确保新工具支持拖拽功能
   - 添加必要的样式和交互效果

2. 收藏功能
   - 收藏相关的模板修改在 `favListTpl` 和 `favInfoWindowTpl`
   - 图片预览功能使用 ViewerJS 实现
   - 保持收藏列表的样式统一

### Git 提交规范

提交信息格式：
```
<type>(<scope>): <subject>

<body>

<footer>
```

- type: feat, fix, docs, style, refactor, test, chore
- scope: 可选，表示修改的范围
- subject: 简短描述
- body: 详细描述
- footer: 可选，用于关联 Issue

## 提交 Pull Request

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/xxx`
3. 提交代码：`git commit -m "feat: add xxx"`
4. 推送到远程：`git push origin feature/xxx`
5. 提交 Pull Request

## 提交 Issue

如果您发现了 bug 或有新功能建议，欢迎提交 Issue。请确保：

1. 搜索现有的 Issue，避免重复
2. 使用清晰的标题
3. 详细描述问题或建议
4. 如果是 bug，请提供：
   - 复现步骤
   - 期望行为
   - 实际行为
   - 环境信息（浏览器版本等）

## 测试

在提交代码前，请确保：

1. 新功能或修复可以正常工作
2. 不影响现有功能
3. 在不同浏览器中测试兼容性
4. 代码符合项目规范

## 许可证

本项目基于 MIT 协议开源，详见 [LICENSE](./LICENSE) 文件。