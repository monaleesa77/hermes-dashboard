#!/usr/bin/env python3
"""Test loading settings from .env file"""

import os
import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from pydantic_settings import BaseSettings

class TestSettings(BaseSettings):
    use_https: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

if __name__ == "__main__":
    print("Testing .env file loading...")
    print(f"Current directory: {os.getcwd()}")
    print(f".env file exists: {Path('.env').exists()}")

    if Path('.env').exists():
        print("\n.env file contents (first 20 lines):")
        with open('.env', 'r') as f:
            for i, line in enumerate(f):
                if i >= 20:
                    break
                print(f"  {i+1}: {line.rstrip()}")

    print("\nTrying to load settings...")
    try:
        settings = TestSettings()
        print(f"✓ Settings loaded successfully!")
        print(f"  use_https: {settings.use_https}")
    except Exception as e:
        print(f"✗ Error loading settings: {e}")
        import traceback
        traceback.print_exc()
