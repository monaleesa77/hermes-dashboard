# Hermes Dashboard UI Overhaul — 激进方案

**日期**: 2026-04-13
**方案**: 激进方案（OpenClaw 风格）
**状态**: ✅ 已完成（2026-04-13）

---

## 实施记录

### Step 5: 验证 ✅
- [x] `npm run build` — TypeScript 编译通过，无 error
- [x] 三个 toggle 按钮出现在 Header 右侧
- [x] 点击切换即时生效，全局统一
- [x] 刷新页面保持上次 toggle 状态
- [x] 每条消息内不再有独立的折叠控件
- [x] 消息气泡只保留头像+名字+时间+内容+工具（受 toggle 控制）

---

## 一、目标

将散布在每条消息气泡内的展开/折叠控件（Thinking、Tools、Tool Results）收到全局 Header 区，实现：
- 消息气泡只保留核心内容（头像、名字、时间、文字）
- 全局 toggle 一处控制，全局生效
- 彻底消除 CollapseContext vs 本地 state 冲突

---

## 二、现状分析

### 2.1 当前问题

每条 `ChatMessage` 组件内部都有独立的折叠 state：

```tsx
// ChatMessage.tsx 第37-38行
const [expandedThinking, setExpandedThinking] = useState(true);
const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
```

导致：
- 每条消息都有重复的折叠按钮 → 界面拥挤
- 折叠状态不统一，用户无法一眼掌握全局
- 消息数量多了之后 Controls 视觉上非常杂乱

### 2.2 现状 UI 布局

```
┌─────────────────────────────────────────────────────────┐
│ Header: Logo | Session名 | 连接状态 | Export | 主题 | 设置  │
├──────────┬──────────────────────────────────────────────┤
│ Sidebar  │  Chat 区域                                    │
│          │  ┌──────────────────────────────────────┐    │
│          │  │ [Bot] Hermes  14:32                  │    │
│          │  │ ▼ Thinking [~2s]  ← 每个消息都有     │    │
│          │  │   <thinking content>                  │    │
│          │  │ ▼ tool_name [completed]  ← 每个消息都有│   │
│          │  │   Arguments: {...}                   │    │
│          │  │   Result: {...}                      │    │
│          │  │ 文字内容...                            │    │
│          │  └──────────────────────────────────────┘    │
│          │                                              │
│          │  ┌──────────────────────────────────────┐    │
│          │  │ [User] You  14:33                   │    │
│          │  │ 文字内容...                           │    │
│          │  └──────────────────────────────────────┘    │
│          │                                              │
│          │  [ 输入框 Fixed Bottom ]                     │
└──────────┴──────────────────────────────────────────────┘
```

---

## 三、目标 UI 布局（激进方案）

```
┌─────────────────────────────────────────────────────────┐
│ Header: Logo | Session名 | 连接状态 │ [🤔] [🔧] [📄] │ 设置 │
├──────────┬──────────────────────────────────────────────┤
│ Sidebar  │  Chat 区域                                    │
│          │  ┌──────────────────────────────────────┐    │
│          │  │ [Bot] Hermes  14:32                  │    │
│          │  │ 文字内容...        ← Thinking/Tools/结果  │   │
│          │  │                      由 Header 三个按钮    │   │
│          │  └──────────────────────────────────────┘    │
│          │                                              │
│          │  [ 输入框 Fixed Bottom ]                     │
└──────────┴──────────────────────────────────────────────┘
```

**Header 新增三个图标按钮**（右上角，设置按钮左侧）：

| 按钮 | 图标(lucide) | 含义 | 开启时 | 关闭时 |
|------|-------------|------|--------|--------|
| 思考 | `Brain` | 显示/隐藏 Thinking 块 | accent color | muted color + line-through |
| 工具 | `Wrench` | 显示/隐藏工具调用块 | accent color | muted color |
| 结果 | `FileText` | 显示/隐藏工具结果 | accent color | muted color |

---

## 四、架构设计

### 4.1 状态管理

在 `App.tsx` 添加三个 visibility state，通过 props 层层传递：

```tsx
// App.tsx
const [showThinking, setShowThinking] = useState(() => {
  const saved = localStorage.getItem('hermes-visibility-thinking');
  return saved !== 'false';  // 默认 true
});
const [showTools, setShowTools] = useState(() => {
  const saved = localStorage.getItem('hermes-visibility-tools');
  return saved !== 'false';  // 默认 true
});
const [showToolResults, setShowToolResults] = useState(() => {
  const saved = localStorage.getItem('hermes-visibility-tool-results');
  return saved !== 'false';  // 默认 true
});
```

Props 传递路径：
```
App.tsx
  └── Header.tsx (三个 toggle button，onChange 更新 state)
  └── Chat.tsx
        └── ChatMessage.tsx (接收三个 visibility props，移除本地 state)
```

### 4.2 文件改动清单

| 文件 | 改动内容 |
|------|---------|
| `App.tsx` | 添加 3 个 visibility state + localStorage 持久化；传给 Header 和 Chat |
| `Header.tsx` | 添加 VisibilityToggles 组件（3个图标按钮）；放在 settings 按钮左侧 |
| `Chat.tsx` | Props 接口加 3 个 visibility bool；透传给 ChatMessage |
| `ChatMessage.tsx` | 移除 `expandedThinking` / `expandedTools` 本地 state；根据 props 条件渲染 |

### 4.3 组件接口变更

**Chat.tsx 新增 props:**
```tsx
interface ChatProps {
  // ... 现有 props
  showThinking?: boolean;      // 新增
  showTools?: boolean;          // 新增
  showToolResults?: boolean;    // 新增
}
```

**ChatMessage.tsx 新增 props:**
```tsx
interface ChatMessageProps {
  // ... 现有 props
  showThinking?: boolean;       // 新增
  showTools?: boolean;          // 新增
  showToolResults?: boolean;    // 新增
}
```

### 4.4 ChatMessage 渲染逻辑变更

**Before（基于本地 state）:**
```tsx
{/* Thinking - 本地 state 控制 */}
{expandedThinking && message.thinking && (
  <ThinkingBlock content={message.thinking} />
)}

{/* Tool Calls - 本地 state 控制 */}
{isExpanded && (
  <ToolCallBlock tool={tool} result={toolResult} />
)}
```

**After（基于全局 props）:**
```tsx
{/* Thinking - 全局 props 控制 */}
{showThinking && message.thinking && (
  <ThinkingBlock content={message.thinking} />
)}

{/* Tool Calls - 全局 props 控制 */}
{showTools && message.tool_calls?.length > 0 && (
  message.tool_calls.map(tool => (
    <ToolCallBlock
      key={tool.id}
      tool={tool}
      showResult={showToolResults}
      result={tool.results}
    />
  ))
)}
```

---

## 五、Header 按钮详细设计

### 5.1 位置

在 `Header.tsx` 的按钮组中，设置按钮左侧：

```
[ 连接状态 ]  [ Export ]  [ 🤔 ]  [ 🔧 ]  [ 📄 ]  [ 主题 ]  [ 设置 ]
                                         ↑ 三个新按钮
```

### 5.2 按钮样式

每个按钮：
- 尺寸：32×32px（p-2，lucide w-5 h-5）
- 圆角：rounded-lg
- 颜色逻辑：
  - 开启（true）：`color: var(--accent)` + 轻微背景高亮
  - 关闭（false）：`color: var(--text-muted)` + `text-decoration: line-through`（仅 thinking）
- hover：背景变为 `var(--bg-tertiary)`
- Tooltip：hover 时显示如 "Hide Thinking" / "Show Thinking"

### 5.3 按钮图标

```tsx
import { Brain, Wrench, FileText } from 'lucide-react';

// Thinking toggle
<button
  className="p-2 rounded-lg transition-all duration-150"
  style={{ color: showThinking ? 'var(--accent)' : 'var(--text-muted)' }}
  onClick={() => setShowThinking(!showThinking)}
  title={showThinking ? 'Hide Thinking' : 'Show Thinking'}
>
  <Brain className="w-5 h-5" />
</button>

// Tools toggle
<button ... style={{ color: showTools ? 'var(--accent)' : 'var(--text-muted)' }}>
  <Wrench className="w-5 h-5" />
</button>

// Tool Results toggle
<button ... style={{ color: showToolResults ? 'var(--accent)' : 'var(--text-muted)' }}>
  <FileText className="w-5 h-5" />
</button>
```

---

## 六、实现步骤

### Step 1: App.tsx — 添加 state 和持久化 ✅
- 添加 `showThinking`, `showTools`, `showToolResults` state（带 localStorage 读取）
- 透传给 Header 和 Chat

### Step 2: Header.tsx — 添加 VisibilityToggles ✅
- 在 settings 按钮左侧加入三个 toggle button
- 从 props 接收 `showThinking`, `showTools`, `showToolResults` + 三个 setter
- Button onClick 调用对应 setter
- Tooltip 动态显示当前状态

### Step 3: Chat.tsx — 透传 visibility props ✅
- Props 接口添加三个 bool
- 透传给 ChatMessage

### Step 4: ChatMessage.tsx — 移除本地 state，改为 props 控制 ✅
- 删除 `expandedThinking` state（第37行）
- 删除 `expandedTools` state（第38行）
- 删除 `toggleTool` 函数
- Thinking 块：`showThinking && message.thinking && ...`
- Tool Calls 块：`showTools && message.tool_calls?.length > 0 && ...`
- Tool Results：根据 `showToolResults` 条件渲染（嵌在 ToolCallBlock 内）
- 折叠按钮全部移除

### Step 5: 验证
- 三个按钮开关正常
- 刷新页面 localStorage 恢复状态
- 移动端显示正常
- 无 console error

---

## 七、暂不纳入的范围

以下内容不在本方案内，保持现状：
- 消息气泡的 avatar / header 样式改造
- 输入框区域改造
- Sidebar 改造
- Backend / WebSocket 改动

---

## 八、风险与注意事项

1. **向后兼容**：已有 session 的消息结构不变，只改渲染层逻辑
2. **工具结果独立控制**：`showToolResults` 控制的是工具结果区（嵌在工具块内部），需要内联到 ToolCallBlock 渲染逻辑中
3. **流式输出**：streaming message 期间的 thinking/tool 状态应正常跟随全局 toggle
4. **无消息时**：三个 toggle 始终可见，即使当前 session 无 thinking/无 tools

---

## 九、验收标准

- [ ] 三个 toggle 按钮出现在 Header 右侧
- [ ] 点击切换即时生效，全局统一
- [ ] 刷新页面保持上次 toggle 状态
- [ ] 每条消息内不再有独立的折叠控件
- [ ] 消息气泡只保留头像+名字+时间+内容+工具（受 toggle 控制）
