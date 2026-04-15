# Hermes Dashboard — 模型配置开源化设计

**日期**: 2026-04-13
**阶段**: Step 2
**状态**: 设计稿，待实施

---

## 一、问题本质

当前设计把"模型"这个外部依赖信息硬编码在 bridge 的 Python 代码里。这对于开源项目是错误的：

1. **用户不知道要改代码** — 新建开发者 clone 后发现模型不对，不知道要去 `hermes_client.py` 里改
2. **模型列表维护成本高** — 每次换模型都要改两处（default + get_models 列表）
3. **gateway 已有的信息 bridge 又重复定义** — `/v1/models` 才是权威来源

---

## 二、设计原则

1. **单一信任源**：模型列表来自 gateway `/v1/models`，bridge 不自己编
2. **配置即代码**：默认模型写入 `~/.hermes/config.yaml`，代码读取，不硬编码
3. **优雅降级**：gateway 挂了时，从配置文件读取默认模型，不返回假数据

---

## 三、文件结构变更

```
~/.hermes/
├── config.yaml              ← 存放默认模型（用户/部署者编辑）
├── hermes_state/
│   └── sessions.json        ← session 存储（已有）
└── ...

hermes-dashboard/
├── backend/
│   ├── hermes_client.py     ← 移除硬编码模型列表
│   ├── config_loader.py     ← 新增：从 config.yaml 读取配置
│   └── main.py              ← 通过 config_loader 初始化
```

---

## 四、config.yaml 结构

```yaml
# ~/.hermes/config.yaml
model:
  default: MiniMax-M2.7
  provider: minimax-cn

# 其他已有配置...
```

> 注：完整的可用模型列表**不在这里维护**，由 gateway 动态提供。

---

## 五、config_loader.py 新模块

```python
"""从 ~/.hermes/config.yaml 读取配置，兼容旧版本（无配置文件时用默认值）。"""
import yaml
from pathlib import Path
from typing import Optional

HERMES_HOME = Path.home() / ".hermes"
CONFIG_FILE = HERMES_HOME / "config.yaml"

class HermesConfig:
    def __init__(self):
        self.default_model = "MiniMax-M2.7"
        self.provider = "minimax-cn"
        self._load()

    def _load(self):
        if not CONFIG_FILE.exists():
            return  # 用默认值

        try:
            with open(CONFIG_FILE) as f:
                data = yaml.safe_load(f) or {}

            model_conf = data.get("model", {})
            self.default_model = model_conf.get("default", self.default_model)
            self.provider = model_conf.get("provider", self.provider)
        except Exception:
            pass  # 配置损坏时降级到默认值

_config: Optional[HermesConfig] = None

def get_config() -> HermesConfig:
    global _config
    if _config is None:
        _config = HermesConfig()
    return _config
```

---

## 六、hermes_client.py 改动

### Before（有问题）

```python
class HermesClient:
    def __init__(self, base_url: str = "http://localhost:8642", api_key: str = "any"):
        self.base_url = base_url
        self.api_key = api_key
        self.headers = {...}

    async def chat_completion(self, messages, model: str = "MiniMax-M2.7", ...):
        ...

    async def get_models(self) -> list:
        # 硬编码，脱离了真实来源
        return [
            {"id": "MiniMax-M2.7", ...},
            {"id": "claude-sonnet-4-6", ...},  # 根本不存在！
        ]
```

### After（开源友好）

```python
from config_loader import get_config

class HermesClient:
    def __init__(self, base_url: str = "http://localhost:8642", api_key: str = "any"):
        self.base_url = base_url
        self.api_key = api_key
        self.headers = {...}
        self._config = get_config()

    def _default_model(self) -> str:
        return self._config.default_model

    async def chat_completion(
        self,
        messages: list,
        model: Optional[str] = None,  # None = 用默认
        stream: bool = True,
        session_id: Optional[str] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        model = model or self._default_model()
        payload = {
            "model": model,
            "messages": messages,
            "stream": stream,
        }
        ...

    async def get_models(self) -> list:
        """从 gateway 获取真实模型列表，失败时返回空列表（前端显示"无可用模型"）。"""
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
                    # 401/404/其他 → 降级：不返回假数据
                    return []
        except Exception:
            return []

    async def create_run(
        self,
        messages: list,
        model: Optional[str] = None,
    ) -> str:
        model = model or self._default_model()
        ...
```

---

## 七、main.py 改动

```python
# main.py
hermes_client = HermesClient(
    base_url=settings.hermes_api_url,
    api_key=settings.hermes_api_key,
)
# 无需传 default_model — 从 config.yaml 自动读取
```

---

## 八、前端影响

| 场景 | 行为 |
|------|------|
| gateway 正常 | `/api/models` → gateway 模型列表 → 前端下拉框正常填充 |
| gateway 挂了 | `/api/models` → 返回 `[]` → 前端下拉框显示空，提示用户检查连接 |
| 新建 session | 默认模型从 `config.yaml` 读取，通过 `/api/models` 传给前端 |

> 不再有"假模型列表导致用户选了不存在的模型"问题。

---

## 九、实施步骤

### Step 2.1：创建 `config_loader.py`

- 读取 `~/.hermes/config.yaml`
- 无文件时降级到默认值
- 单例模式

### Step 2.2：修改 `hermes_client.py`

- `__init__` 注入 `HermesConfig`
- `chat_completion()` 默认模型改为 `None → 读配置`
- `create_run()` 同上
- `get_models()` 改为真实请求，失败返回空列表
- **删除所有硬编码模型字符串**（`"claude-sonnet-4-6"` 之类）

### Step 2.3：修改 `main.py`

- 引入 `config_loader`
- `HermesClient()` 初始化不再传 default_model 参数

### Step 2.4：验证

- [ ] `curl http://localhost:8643/api/models` 返回真实 gateway 数据
- [ ] `curl http://localhost:8643/api/models` 在 gateway 挂掉时返回 `[]`
- [ ] 发消息时模型参数来自 `config.yaml` 而非代码硬编码

---

## 十、风险

1. **config.yaml 不存在** → config_loader 已处理，降级到 MiniMax-M2.7
2. **config.yaml 格式错误** → 同上
3. **gateway /v1/models 一直 401** → 说明该 endpoint 本身有问题，需单独修 gateway，但这超出本项目范围

---

## 十一、不纳入范围

- gateway 端 `/v1/models` 的修复（另一个项目）
- 前端模型选择器的 UI 改进
- 多 provider（OpenAI兼容 / Anthropic）模型列表聚合
