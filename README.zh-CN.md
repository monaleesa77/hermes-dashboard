# Hermes Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)

一个优雅、现代的 [Hermes AI Agent](https://github.com/hermes-ai) 网页仪表盘。

> **设计灵感**: 本项目深受 [PinchChat](https://github.com/MarlBurroW/pinchchat)（OpenClaw 的聊天界面）的启发。UI/UX 设计、布局概念和视觉样式借鉴了 PinchChat 的优秀作品，而实现是原创的，专门为 Hermes 生态系统构建。
>
> 这是 **非官方** 的 PinchChat 或 Hermes 项目。

![仪表盘预览](./assets/01-main-dashboard.png)

## ✨ 功能特性

- 🎨 **多种主题** — 暗黑、亮色和 OLED 模式，支持 6 种强调色
- 💬 **实时聊天** — 基于 WebSocket 的流式响应
- 🔧 **工具可视化** — 可折叠的工具调用，带状态徽章
- 🤔 **思考块** — 可折叠的推理展示，带耗时统计
- 📜 **会话管理** — 拖拽排序、Token 使用量进度条
- 🎯 **平台图标** — 支持 Discord、Telegram、QQ、微信、API、Cron
- 📊 **Token 使用** — 每个会话的可视化进度条
- 🖼️ **图片支持** — 内联图片，点击预览
- 📱 **响应式设计** — 适配不同屏幕尺寸
- ⚡ **快速轻量** — 使用 Vite 和 FastAPI 构建

## 🚀 快速开始

### 环境要求

- Python 3.9+
- Node.js 18+
- Hermes Gateway 运行在 8642 端口

### 一键启动（推荐）

```bash
cd /Users/mona/hermes-dashboard
./start.sh
```

然后打开 http://localhost:10007

### 手动启动

**1. 启动 Hermes Gateway**

```bash
hermes gateway run
```

**2. 启动桥接服务器**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

**3. 启动前端**

```bash
cd frontend
npm install
npm run dev
```

**4. 打开仪表盘**

访问 http://localhost:10007

## 🏗️ 架构

```
┌─────────────────┐      WebSocket      ┌─────────────────┐
│   React 应用     │ ◄─────────────────► │   桥接服务器    │
│  (端口 10007)    │                     │  (端口 8643)    │
└─────────────────┘                     └────────┬────────┘
                           │                      │
                           │ HTTP + SSE           │ 读取会话
                    ┌──────▼──────┐              │
                    │  Hermes API │              │
                    │ (端口 8642) │              │
                    └──────┬──────┘              │
                           │                     │
                    ┌──────▼──────┐              │
                    │ ~/.hermes   │◄─────────────┘
                    │ /sessions/* │    (jsonl 文件)
                    └─────────────┘
```

## ⚙️ 配置

编辑 `backend/.env` 来自定义：

```env
# 桥接服务器
BRIDGE_HOST=0.0.0.0
BRIDGE_PORT=8643

# Hermes API
HERMES_API_URL=http://localhost:8642
HERMES_API_KEY=any

# 会话文件位置
HERMES_HOME=/Users/mona/.hermes

# CORS 来源
CORS_ORIGINS=http://localhost:10007
```

## 🎨 自定义

### 主题

- **暗黑**（默认）— 基于 Zinc 的深色主题
- **亮色** — 简洁的浅色主题
- **OLED** — 纯黑色，适合 OLED 屏幕

### 强调色

- 青色（默认）
- 紫罗兰
- 翠绿
- 琥珀
- 玫瑰
- 蓝色

点击头部的设置图标（⚙️）来自定义。

## 📁 项目结构

```
hermes-dashboard/
├── backend/                  # Python FastAPI 桥接服务器
│   ├── main.py              # FastAPI 应用
│   ├── models.py            # Pydantic 模型
│   ├── session_store.py     # 会话文件解析器
│   ├── hermes_client.py     # Hermes API 客户端
│   └── requirements.txt     # Python 依赖
├── frontend/                 # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/      # React 组件
│   │   │   ├── Chat/        # 聊天 UI 组件
│   │   │   ├── Sidebar/     # 会话列表
│   │   │   └── Layout/      # 头部等
│   │   ├── services/        # API 和 WebSocket
│   │   ├── types/           # TypeScript 类型
│   │   ├── App.tsx          # 主应用
│   │   └── index.css        # 全局样式
│   ├── package.json
│   └── vite.config.ts
├── start.sh                 # 一键启动脚本
├── README.md
├── LICENSE                  # MIT 许可证
└── CONTRIBUTING.md          # 贡献指南
```

## 🔌 API 接口

### REST 接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/sessions` | GET | 列出所有会话 |
| `/api/sessions` | POST | 创建新会话 |
| `/api/sessions/{id}` | GET | 获取会话详情 |
| `/api/sessions/{id}` | DELETE | 删除会话 |
| `/api/models` | GET | 列出可用模型 |
| `/api/gateway/status` | GET | Hermes 网关状态 |

### WebSocket 接口

| 接口 | 描述 |
|------|------|
| `/ws/chat` | 实时聊天流 |

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解指南。

## 📜 许可证

MIT 许可证 — 详见 [LICENSE](./LICENSE)。

## 🙏 致谢

- 灵感来自 [PinchChat](https://github.com/MarlBurroW/pinchchat)（OpenClaw）
- 为 [Hermes AI Agent](https://github.com/hermes-ai) 构建

## 🐛 故障排除

### Hermes Gateway 未运行

```bash
curl http://localhost:8642/health
hermes gateway run
```

### 桥接服务器无法启动

```bash
lsof -i :8643
# 杀死现有进程或更改 backend/.env 中的端口
```

### 前端无法连接

```bash
curl http://localhost:8643/api/health
# 检查 vite.config.ts 代理设置
```

## 📱 手机端访问

从手机访问 Hermes Dashboard：

### 快速设置

1. **确保手机和电脑在同一 WiFi 网络**

2. **获取电脑的 IP 地址：**
   ```bash
   # macOS
   ipconfig getifaddr en0
   ```

3. **从手机访问：**
   ```
   http://[电脑IP]:10007
   # 例如：http://192.168.1.100:10007
   ```

### 安装为 PWA 应用

**iOS Safari：**
1. 打开网页 → 点击分享按钮 → "添加到主屏幕"

**Android Chrome：**
1. 打开网页 → 菜单 → "安装应用"

### 详细指南

查看 [README_MOBILE.md](README_MOBILE.md) 获取完整的手机端使用指南。

---

## 📸 截图

![主界面](./assets/01-main-dashboard.png)
*主界面 - 暗黑主题*

![设置面板](./assets/02-settings-panel.png)
*设置面板 - 支持字体大小、页面缩放、主题切换*

![亮色主题](./assets/03-light-theme.png)
*亮色主题*

![OLED 主题](./assets/04-oled-theme.png)
*OLED 纯黑主题*

---

用 ❤️ 为 Hermes 社区制作
