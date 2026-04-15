# Hermes Dashboard — Step 1 修复

**日期**: 2026-04-13
**状态**: 待实施

---

## 一、修复目标

在不影响现有架构的前提下，立即解决两个可验证的硬编码问题。

---

## 二、问题清单

### P1 — `create_run()` 默认模型不一致

**文件**: `backend/hermes_client.py`
**位置**: Line 116

```python
# 现状（不一致）
async def create_run(self, messages: list, model: str = "claude-sonnet-4-6") -> str:
    payload = {"model": model, ...}

# chat_completion() 的默认值是 MiniMax-M2.7，但 create_run() 是 claude-sonnet-4-6
```

**修复**:

```python
async def create_run(self, messages: list, model: str = "MiniMax-M2.7") -> str:
```

---

### P2 — `get_models()` 返回不存在的模型

**文件**: `backend/hermes_client.py`
**位置**: Line 89-96

```python
# 现状（假数据）
async def get_models(self) -> list:
    return [
        {"id": "MiniMax-M2.7", ...},
        {"id": "claude-sonnet-4-6", ...},  # 这个模型在 config 里根本不存在
    ]
```

**修复**: 改为真实请求 gateway，失败时降级到空列表。

```python
async def get_models(self) -> list:
    """Get model list from gateway, fallback to minimal list on failure."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.base_url}/v1/models",
                headers=self.headers,
                timeout=aiohttp.ClientTimeout(total=5),
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("data", [])
                # 非200 → 返回仅默认模型
                return [{"id": "MiniMax-M2.7", "object": "model", "created": 0, "owned_by": "minimax-cn"}]
    except Exception:
        # gateway 挂了 → 降级
        return [{"id": "MiniMax-M2.7", "object": "model", "created": 0, "owned_by": "minimax-cn"}]
```

---

## 三、实施命令

```bash
cd ~/hermes-dashboard/backend

# 1. 确认当前行号
grep -n "claude-sonnet-4-6" hermes_client.py

# 2. 修改 create_run 默认值（line 116）
sed -i '' 's/model: str = "claude-sonnet-4-6"/model: str = "MiniMax-M2.7"/' hermes_client.py

# 3. 修改 get_models() 返回值（line 93-96）
# → 替换为真实请求 + 降级（见上方代码）

# 4. 重启 bridge 服务
# 找到进程
lsof -i :8643
# kill 并重启
kill <PID>
cd ~/hermes-dashboard && ./start.sh
```

---

## 四、验证

```bash
# 验证1：get_models 返回
curl -s http://localhost:8643/api/models | python3 -m json.tool

# 验证2：发送图片消息（测试多模态链路）
# → 观察 backend 日志是否有 "images" 被处理

# 验证3：确认没有 claude-sonnet-4-6 出现在任何接口
grep -r "claude-sonnet-4-6" ~/hermes-dashboard/backend/
```

---

## 五、回滚

```bash
cd ~/hermes-dashboard/backend
git checkout hermes_client.py
kill $(lsof -t -i:8643)
cd ~/hermes-dashboard && ./start.sh
```

---

## 六、后续

Step 1 完成并验证后，可以开始 Step 2 设计（模型配置外移到 config_loader.py）。
