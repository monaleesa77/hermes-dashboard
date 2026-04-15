# Hermes Dashboard 架构摸底报告

**日期**：2026-04-13
**参与者**：mona + momo
**主题**：Hermes/OpenClaw 架构理解 vs Dashboard 修复方案评估

---

## 一、架构现状

### 1.1 两个方案的提出

| 方案 | 文件 | 核心思路 |
|------|------|----------|
| v0.2（修复透传） | ACTION_PLAN.md | 修复 main.py bridge 的三个已知 bug，不重建 |
| lexical-sniffing-cray（独立集成） | ~/.claude/plans/lexical-sniffing-cray.md | 新建 agent_server.py，直接调用 hermes-agent AIAgent |

两个方案思路完全不同，需验证关键前提。

### 1.2 hermes-agent 安装状态（关键发现）

```
hermes-agent 源代码：~/.hermes/hermes-agent/（非 pip install）
没有顶层 __init__.py，不能直接 import hermes_agent
没有 pth 文件，从未执行过 pip install -e
```

**结论**：lexical-sniffing-cray 方案的"通过 `pip install -e` 方式调用 AIAgent"前提**目前不成立**。

### 1.3 现有架构图

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React :3000)  ──HTTP/WSS──>  Bridge (:8643)     │
│                                           main.py (FastAPI)  │
│                                           hermes_client.py  │
│                                           session_store.py  │
└─────────────────────────────────────────────────────────────┘
                                                        │
                                                    HTTP
                                                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Hermes Gateway (:8642) ←─────────────── bridge 透传       │
│  Python / FastAPI (hermes-agent)                          │
│  ✅ health: {"status":"ok"}                               │
│  ✅ POST /v1/chat/completions (流式/非流式均正常)           │
│  ❌ GET /v1/models → 401 (认证不同)                        │
│  ❌ GET /api/* → 404 (未实现)                             │
│                                                             │
│  SessionStore: ~/.hermes/hermes_state/ (独立 SQLite)     │
└─────────────────────────────────────────────────────────────┘
```

### 1.4 关键进程

```
Python 21124 mona  LISTEN  localhost:8642  ← Hermes Gateway（hermes-agent）
```

---

## 二、Phase 0 摸底验证结果

### 2.1 8642 Gateway 实测

```bash
# health
curl http://localhost:8642/health
→ {"status": "ok", "platform": "hermes-agent"}  ✅

# 非流式 chat completions（实测成功）
curl -X POST http://localhost:8642/v1/chat/completions \
  -H "Authorization: Bearer any" \
  -d '{"model":"MiniMax-M2.7","messages":[{"role":"user","content":"hi"}],"stream":false}'
→ 正常返回中文回复  ✅

# 流式（未实测，预计正常）

# models endpoint
curl http://localhost:8642/v1/models -H "Authorization: Bearer any"
→ 401 Invalid API key  ❌
```

### 2.2 bridge (8643) → gateway (8642) 通信链路

```
hermes_client.py 认证头：Authorization: Bearer any  ✅ 可通行
health_check() → /health  ✅
chat_completion() → /v1/chat/completions  ✅
get_models() → /v1/models  ❌ 401
```

### 2.3 config.yaml 模型配置

```yaml
model:
  default: MiniMax-M2.7
  provider: minimax-cn
```

但 `hermes_client.py:23` 硬编码 `model: str = "claude-sonnet-4-6"`，与实际配置不匹配。

---

## 三、确认的问题（已验证，非猜测）

### 问题 1：图片消息被完全忽略 ⚠️ 高优先级

**位置**：`main.py:218`

```python
# 现状：完全不看 request.images
messages = [{"role": "user", "content": request.message}]

# 正确做法（参考 hermes_client.py:74-78）：
if request.images:
    message_content = [
        {"type": "text", "text": request.message},
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img}"}}
    ]
else:
    message_content = request.message
```

**影响**：用户发图片，图片被丢弃，后端只收到文字。

---

### 问题 2：model 硬编码错误 ⚠️ 中优先级

**位置**：`hermes_client.py:23`

```python
# 现状
model: str = "claude-sonnet-4-6"

# config.yaml 实际配置
model.default: MiniMax-M2.7
```

**影响**：bridge 发送请求时 model 参数与实际希望使用的不一致。

---

### 问题 3：get_models() 认证失败 ⚠️ 低优先级

**位置**：`hermes_client.py:90-98`

```python
# Bearer any 认证对 /v1/models 无效
# gateway/platforms/api_server.py 对此 endpoint 有独立验证
```

**影响**：Dashboard 的"选择模型"下拉框无法获取真实模型列表。

---

## 四、方案对比

| | v0.2（修复透传） | lexical-sniffing-cray（独立集成） |
|---|---|---|
| 依赖 | 外部 Hermes Gateway (8642) | hermes-agent 可 import |
| 当前前提 | ✅ 已满足 | ❌ 不满足（未安装） |
| 代码改动 | 3 个文件，修复 3 处 | 新建 agent_server.py + 前端改造 |
| 预计耗时 | ~1 小时 | ~1-2 天（含踩坑） |
| 风险 | 低 | 高 |
| 收益 | 修复已知问题，保留现有架构 | 完全独立，但引入大量新复杂度 |

---

## 五、推荐路径

**立即执行：v0.2 修复**（三处修改）

1. `main.py:218` — 修复图片多模态构建
2. `hermes_client.py:23` — model 默认值改为从 config 读取或移除硬编码
3. `hermes_client.py:90-98` — get_models() 绕过或修复认证

**之后如需完全独立，再执行 lexical-sniffing-cray 方案**，但需先解决 hermes-agent 安装问题。

---

## 六、待修文件清单

```
backend/main.py         → 图片多模态逻辑
backend/hermes_client.py → model 默认值 + get_models 认证
```
