# Hermes Dashboard — 完成升级归档

**归档日期**: 2026-04-13
**当前版本**: v1.0.2

---

## v1.0.2 — 2026-04-13

### 后端升级

#### ✅ 模型配置开源化
**文件**: `backend/config_loader.py`（新增）
- 从 `~/.hermes/config.yaml` 读取默认模型配置
- 移除了硬编码的 `claude-sonnet-4-6` 模型

**文件**: `backend/hermes_client.py`
- `create_run()` 默认模型改为从 config 读取
- `chat_completion()` 默认模型改为从 config 读取
- `get_models()` 从 `/v1/models` 真实调用（401/404 时返回空数组，不返回假数据）

#### ✅ 多模态图片支持
**文件**: `backend/main.py`
- WebSocket `websocket_chat` 支持 `request.images` 多图传入
- 消息内容格式改为 OpenAI 多模态格式:
  ```python
  [
    {"type": "text", "text": "..."},
    {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}
  ]
  ```

#### ✅ Tool Result 模型
**文件**: `backend/models.py`
- 新增 `ToolResult` 模型（id, tool_call_id, content, timestamp）
- `ChatMessage` 增加 `tool_results: List[ToolResult]` 字段

#### ✅ Tool Result 聚合
**文件**: `backend/session_store.py`
- 解析 session 文件时将独立的 `role=tool` 消息收集
- 通过 `_attach_tool_results()` 将 tool results 附加到父 assistant 消息
- 解决 tool result 无法在 UI 展示的问题

#### ✅ 移动端文档整理
**文件**: `docs/MOBILE_*.md`（从根目录迁移）
- `docs/README_MOBILE.md` — 完整移动端访问指南
- `docs/MOBILE_QUICKSTART.md` — 快速配置指南
- `docs/MOBILE_TROUBLESHOOTING.md` — 问题排查

---

## v2.0.0 — 2026-04-13（UI Overhaul）

> 此版本为 tag `v2.0.0`，代码在 `upgrade/openclaw-message-grouping` 分支

### 前端 UI 激进方案（已合并到 main）

#### ✅ 全局 Visibility Toggle
**目标**: 移除每条消息内的展开/折叠按钮，改用 Header 全局控制

**文件**: `frontend/src/App.tsx`
- 新增 `showThinking`, `showTools`, `showToolResults` 三个 state
- localStorage 持久化（`hermes-visibility-*`）
- 透传给 `Header` 和 `Chat`

**文件**: `frontend/src/components/Layout/Header.tsx`
- 新增三个 toggle 按钮（Brain / Wrench / FileText 图标）
- 位置: Settings 按钮左侧
- 样式: 开启时 accent color + 轻微背景高亮，关闭时 muted + line-through（仅 thinking）

**文件**: `frontend/src/components/Chat/Chat.tsx`
- Props 增加 `showThinking`, `showTools`, `showToolResults`
- 透传给 `ChatMessage`

**文件**: `frontend/src/components/Chat/ChatMessage.tsx`
- 移除本地 `expandedThinking` / `expandedTools` state
- Thinking 块: `showThinking && message.thinking &&`
- Tool Calls: `showTools && message.tool_calls?.length > 0 &&`
- Tool Results: `showToolResults &&`

**文件**: `frontend/src/types/index.ts`
- `ChatMessage` 类型增加 `tool_results` 字段

---

## v1.0.0 — 2026-04-11

### 初始发布
- React + TypeScript + Vite 前端
- FastAPI Bridge Server
- WebSocket 实时聊天
- 三主题支持（Dark/Light/OLED）+ 6 种 accent colors
- 会话管理（拖拽排序、自动恢复上次会话）
- 移动端适配
- Token 用量进度条
