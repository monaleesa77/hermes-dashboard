# 给 Hermes AI 搭了个专属控制中心！✨ 颜值和功能都在线

姐妹们！用 Hermes AI Agent 的看过来！👋

给 Hermes 写了个超好看的 Web 仪表盘，再也不用对着命令行或者简陋界面聊天了～

---

## 🤖 什么是 Hermes？

Hermes 是一个超灵活的 AI Agent 框架，可以接入 QQ、微信、Discord、Telegram 各种平台，还能定时任务、调用工具...

但原来没有一个好看的界面来管理它，所以我动手写了一个！💪

---

## ✨ 这个仪表盘能做什么？

🎨 **多主题切换**
暗黑 / 亮色 / OLED 纯黑模式 + 6 种强调色（ cyan / violet / emerald / amber / rose / blue ）
每天换个配色，心情都不一样～

💬 **多平台会话统一管理**
QQ 群聊、微信私聊、Discord 频道、Telegram、API 调用...所有会话一个界面搞定！
还能拖拽排序，重要的会话放上面 👆

🧠 **思考过程可视化**
Hermes 的推理过程不再是一堆日志，而是可折叠的思考块，还有耗时统计！
看 AI 怎么"脑暴"的，超有意思 🤯

🔧 **工具调用一目了然**
调用了什么工具、什么参数、成功还是失败，都有状态徽章显示
调试起来方便多了！

📊 **Token 使用量实时看**
每个会话用了多少 Token，进度条直接显示，再也不怕额度爆表 💸

⚡ **WebSocket 实时流式响应**
AI 回复是一个字一个字蹦出来的，不是干等半天，体验感拉满！

🎛️ **个性化设置**
- 字体大小滑块调节（拯救近视眼 👓）
- 页面整体缩放
- 聊天记录一键导出 JSON
- 图片点击放大预览

---

## 🛠️ 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **后端**: Python FastAPI（Bridge Server 模式）
- **通信**: WebSocket 实时聊天 + HTTP API
- **文件**: 直接读取 Hermes 的 ~/.hermes/sessions/*.jsonl 文件

---

## 📦 如何体验？

**一键启动（推荐）**
```bash
cd hermes-dashboard
./start.sh
```
然后打开 http://localhost:10007

**前提**: 需要 Hermes Gateway 运行在 8642 端口

---

## 🔗 开源地址

🌐 **GitHub**: monaleesa77/hermes-dashboard
🇨🇳 **Gitee**: monaleesa77/hermes-dashboard（国内访问更快）

MIT 协议开源，欢迎 Star ⭐ 提 Issue 和 PR！

---

## 💡 设计灵感

UI/UX 设计参考了 PinchChat（OpenClaw 的聊天界面），但代码是完全原创的，专门为 Hermes 生态系统打造～

---

用 Hermes 的姐妹们，快来试试这个仪表盘！
比原生命令行好用太多了 😭

有问题评论区问我 👇

---

#Hermes #HermesAI #AIAgent #开源项目 #AI工具 #程序员工 #前端开发 #React #FastAPI #WebSocket #聊天机器人 #QQ机器人 #微信机器人 #DiscordBot #效率工具 #GitHub #Gitee
