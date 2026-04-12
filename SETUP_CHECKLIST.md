# Hermes Dashboard 配置检查清单

## ✅ 环境配置状态

### 后端配置 (`backend/.env`)

| 配置项 | 状态 | 值 |
|--------|------|-----|
| BRIDGE_HOST | ✅ | 0.0.0.0 |
| BRIDGE_PORT | ✅ | 8643 |
| USE_HTTPS | ✅ | true (已启用) |
| SSL_KEY_FILE | ✅ | certs/key.pem |
| SSL_CERT_FILE | ✅ | certs/cert.pem |
| HERMES_API_URL | ✅ | http://localhost:8642 |
| HERMES_HOME | ✅ | /Users/mona/.hermes |
| CORS_ORIGINS | ✅ | 已配置多IP访问 |

### SSL 证书状态

```bash
✅ certs/key.pem   - 私钥文件存在
✅ certs/cert.pem  - 证书文件存在
```

### 前端配置

| 配置项 | 状态 | 说明 |
|--------|------|------|
| PWA Manifest | ✅ | manifest.json 已配置 |
| Service Worker | ✅ | sw.js 已配置 |
| Icons | ✅ | 8种尺寸图标已生成 |
| Splash Screens | ✅ | 7种iOS启动屏已生成 |
| Mobile Responsive | ✅ | 移动端适配已完成 |

---

## 📱 手机访问测试

### 测试步骤

1. **获取本机 IP**
   ```bash
   ipconfig getifaddr en0
   # 结果示例: 192.168.1.100
   ```

2. **测试本地访问**
   ```bash
   curl http://localhost:10007
   # 期望: 返回HTML内容
   ```

3. **测试局域网访问**
   ```bash
   curl http://192.168.1.100:10007
   # 期望: 返回HTML内容
   ```

4. **HTTPS测试**
   ```bash
   curl -k https://localhost:8643/api/health
   # 期望: 返回JSON健康状态
   ```

---

## 🔧 启动服务

### 一键启动
```bash
./start.sh
```

### 手动启动
```bash
# 1. 启动前端
cd frontend && npm run dev

# 2. 启动后端
cd backend
source venv/bin/activate
python main.py
```

---

## 📋 常见问题快速排查

| 问题 | 检查命令 | 解决方案 |
|------|---------|---------|
| 服务未启动 | `lsof -i :10007` | 运行 `./start.sh` |
| 端口被占用 | `lsof -i :10007` | 关闭占用程序或修改端口 |
| CORS错误 | 检查 `backend/.env` | 添加手机IP到CORS_ORIGINS |
| 证书错误 | 检查 `certs/` 目录 | 运行 `./generate-ssl.sh` |
| 无法连接 | `ping [手机IP]` | 检查WiFi/防火墙设置 |

---

## ✅ 最终确认清单

部署前请确认：

- [ ] 后端服务可以启动 (`python main.py`)
- [ ] 前端可以访问 (`curl http://localhost:10007`)
- [ ] HTTPS证书已生成 (`ls backend/certs/`)
- [ ] `.env` 已配置正确的 `CORS_ORIGINS`
- [ ] 手机和电脑在同一WiFi
- [ ] 防火墙已放行端口 10007 和 8643
- [ ] PWA 资源已生成 (`ls frontend/public/*.png`)

全部确认后，手机应该可以正常访问！

---

**需要帮助？**
- 查看完整文档：[README_MOBILE.md](README_MOBILE.md)
- 快速开始：[MOBILE_QUICKSTART.md](MOBILE_QUICKSTART.md)
- 提交 Issue：https://github.com/monaleesa77/hermes-dashboard/issues
