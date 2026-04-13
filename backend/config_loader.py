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