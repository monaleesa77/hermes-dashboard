# Hermes Dashboard — OpenClaw 对齐升级方案

**日期**: 2026-04-13
**状态**: P0/P1 规划完成，Phase 1 待启动
**参考**: OpenClaw UI (`/Users/mona/Downloads/openclaw-main/ui/src/ui/`)

---

## 一、目标

使 Hermes Dashboard 在 UX 上更接近 OpenClaw Control UI，保留 Hermes 自身架构（React + FastAPI Bridge），选择性借鉴 OpenClaw 的优秀交互设计。

---

## 二、升级路线图

### 🔴 P0 — 消息分组（Message Grouping）

**目标**: 连续同角色消息合并为一个 bubble，头像/名字/时间只显示一次

**OpenClaw 实现**:
- 文件: `chat/grouped-render.ts`
- 函数: `renderMessageGroup()` — 将连续同 role 消息合并为 `MessageGroup`
- 每组底部有 footer: 名字 + 时间 + token 用量 + TTS按钮 + 删除按钮

**当前 Hermes 问题**:
- `Chat.tsx` 已有 `groupMessages()`，但只合并连续 user 消息
- assistant 消息每条都单独渲染，重复头像和时间戳
- 需要: 让 `renderMessageGroup` 真正按 OpenClaw 方式渲染

**改动文件**:
- `Chat.tsx` — 重构 `groupMessages()`，改为 `MessageGroup[]` 结构
- `ChatMessage.tsx` — 支持传入 `MessageGroup[]` 而非单个消息

---

### 🔴 P0 — Token 用量显示

**目标**: 每条 assistant 消息底部显示 token 消耗、费用、模型名、上下文占比

**OpenClaw 实现**:
- 文件: `chat/grouped-render.ts`，函数 `renderMessageMeta()`
- 显示格式: `↑12k ↓3k R2k W1k $0.04 78% ctx`
  - ↑input tokens, ↓output tokens
  - R = cacheRead, W = cacheWrite
  - $ = 费用
  - 78% ctx = 上下文窗口占用百分比

**当前 Hermes 问题**:
- 完全没有用量显示

**需要**:
1. `backend/models.py` — `ChatMessage` 接口加 `usage` 字段
2. `backend/session_store.py` — 解析 session 文件中的 usage 数据
3. `backend/hermes_client.py` — chat_completion 响应中提取 usage
4. `frontend/src/types/index.ts` — 添加 `usage` 类型
5. `ChatMessage.tsx` — 渲染 token 用量 footer

**接口设计**:
```typescript
interface MessageUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  cost?: number;
}
```

---

### 🟡 P1 — 删除消息确认

**目标**: 每条消息增加删除按钮 + 确认弹窗 + "不再询问"选项

**OpenClaw 实现**:
- 文件: `chat/grouped-render.ts`，函数 `renderDeleteButton()`
- 弹窗出现在删除按钮旁，支持"不再询问"记住选择

**当前 Hermes 问题**:
- 无删除功能

**改动文件**:
- `ChatMessage.tsx` — 增加删除按钮（hover 时显示）
- `App.tsx` — 添加 `deleteMessage` handler
- `backend/main.py` — 添加 `DELETE /api/sessions/{id}/messages/{msgId}` 接口

---

### 🟡 P1 — Thinking 折叠行为优化

**目标**: Tool calls 默认折叠，只显示工具名和状态Badge

**OpenClaw 实现**:
- 文件: `chat/tool-cards.ts`
- 工具卡片默认 collapsed，hover 展开
- 有 "Raw Output" toggle 切换原始/格式化输出

**当前 Hermes 问题**:
- 全局 toggle 显示/隐藏，但每个 tool call 都有完整展开状态
- Tool Results 独立 toggle，与 tool calls 分离

**改动文件**:
- `ChatMessage.tsx` — tool call 默认折叠，只显示头部（工具名+状态）
- 点击工具名展开详情（Arguments + Result）

---

### 🟡 P1 — 消息朗读（TTS）

**目标**: assistant 消息有朗读按钮

**OpenClaw 实现**:
- 文件: `chat/grouped-render.ts`，函数 `renderTtsButton()`
- 使用 Web Speech API (`speech.ts`)

**当前 Hermes 问题**:
- 无 TTS

**改动文件**:
- `ChatMessage.tsx` — 增加 🔊 按钮（hover 时显示）
- 复用 Web Speech API

---

### 🟢 P2 — 草稿/队列消息

**OpenClaw**: 发送前显示队列中的消息，有排队管理

**当前 Hermes**: 没有队列概念

---

### 🟢 P2 — Canvas 嵌入

**OpenClaw**: 工具输出如果是 Canvas 类型，渲染为可交互 iframe

**当前 Hermes**: 无此功能

---

## 三、实施顺序建议

```
Phase 1 (P0):
  1. Token 用量显示（价值最高，审计视角）
  2. 消息分组优化（视觉改进明显）

Phase 2 (P1):
  3. 删除消息确认
  4. Thinking/Tool 折叠行为
  5. TTS 朗读

Phase 3 (P2):
  6. 草稿/队列（可选）
  7. Canvas 嵌入（可选）
```

---

## 四、技术债务注意

1. **后端 session 格式**: Hermes session 格式与 OpenClaw 不同，`usage` 字段需要确认后端是否已记录
2. **WebSocket 流式**: 流式响应中的 usage 信息如何传递（OpenClaw 是 SSE，Hermes 是 WebSocket）
3. **移动端适配**: OpenClaw 无移动端，Hermes 有 MobileNav，需要确保新功能移动端兼容

---

## 五、已完成的升级

- ✅ UI Overhaul 激进方案：全局 visibility toggle（v2.0.0 tag）
- ✅ 模型配置开源化：从 config_loader.py 读取默认模型
- ✅ 移动端文档整理：docs/ 目录结构
