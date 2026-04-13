# 手机端使用指南 | Mobile Guide

## 📱 手机访问方式

### 方法一：同 WiFi 访问（推荐）

1. **获取电脑 IP 地址**
   ```bash
   # macOS
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # 或
   ipconfig getifaddr en0
   ```

2. **手机浏览器访问**
   ```
   http://[电脑IP]:10007
   
   例如：http://192.168.1.100:10007
   ```

### 方法二：安装为 PWA 应用

**iOS Safari：**
1. 打开网页 → 点击分享按钮 → "添加到主屏幕"
2. 可以像原生 App 一样使用

**Android Chrome：**
1. 打开网页 → 菜单 → "安装应用"
2. 或点击地址栏出现的"安装"提示

---

## 🔧 环境配置

### 1. 基础配置（必须）

编辑 `backend/.env`：

```env
# 允许手机访问的 IP 范围（支持整个局域网段）
CORS_ORIGINS=http://localhost:10007,https://localhost:10007,http://127.0.0.1:10007,https://127.0.0.1:10007,http://192.168.*:10007,http://10.*.*.*:10007

# 如需限制特定 IP，可改为：
# CORS_ORIGINS=http://localhost:10007,https://localhost:10007,http://127.0.0.1:10007,https://127.0.0.1:10007,http://192.168.*:10007,http://10.*.*.*:10007
```

### 2. HTTPS 配置（可选但推荐）

生成 SSL 证书：
```bash
cd backend
./generate-ssl.sh
```

启用 HTTPS：
```env
USE_HTTPS=true
```

---

## ⚠️ 常见问题

### 问题 1：手机无法访问

**现象：** 手机浏览器显示 "无法连接"

**排查步骤：**
1. 确认电脑和手机在同一 WiFi
2. 检查防火墙是否放行端口 10007
3. 检查 `vite.config.ts` 中的 `host: true`
4. 尝试用 `0.0.0.0` 代替 `localhost`

**解决：**
```typescript
// vite.config.ts
server: {
  host: '0.0.0.0',
  port: 10007,
  // ...
}
```

---

### 问题 2：CORS 错误

**现象：** 控制台显示 "CORS policy: No 'Access-Control-Allow-Origin'"

**解决：**
在 `backend/.env` 中添加手机的 IP：
```env
CORS_ORIGINS=http://localhost:10007,https://localhost:10007,http://127.0.0.1:10007,https://127.0.0.1:10007,http://192.168.*:10007,http://10.*.*.*:10007
```

重启后端服务

---

### 问题 3：PWA 安装后白屏

**现象：** 添加到主屏幕后打开是白屏

**原因：** Service Worker 缓存问题或路径错误

**解决：**
1. 清除 Safari 缓存（设置 → Safari → 清除历史记录和网站数据）
2. 删除主屏幕图标，重新添加
3. 确保 `manifest.json` 中的 `start_url` 正确

---

### 问题 4：HTTPS 证书错误

**现象：** 浏览器显示 "您的连接不是私密连接"

**原因：** 自签名证书不被信任

**解决（iOS）：**
1. 访问 `https://[你的IP]:8643`
2. 点击 "显示详细信息" → "访问此网站"
3. 或安装证书：
   ```bash
   # 在 Mac 上信任证书
   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain backend/certs/cert.pem
   ```

**解决（Android）：**
1. 下载证书文件
2. 设置 → 安全 → 从存储安装证书

---

### 问题 5：热重载在手机上不工作

**现象：** 修改代码后手机端不自动刷新

**解决：**
Vite 的热重载（HMR）在局域网可能不稳定，可以：
1. 手动刷新浏览器
2. 使用 `?t=123` 强制刷新
3. 或使用 Chrome 的远程调试功能

---

## 📊 性能优化建议

### 网络优化
- 使用 HTTP/2（已自动支持）
- 启用 Gzip 压缩（已自动支持）
- 使用 CDN 托管静态资源（生产环境）

### 缓存策略
- Service Worker 缓存静态资源
- 图片懒加载
- 代码分割（Code Splitting）

### 移动端优化
- 使用 CSS `will-change` 优化动画
- 避免 300ms 点击延迟（已用 FastClick）
- 虚拟列表（如果会话列表很长）

---

## 🆘 获取帮助

如果遇到其他问题：

1. **查看日志**
   ```bash
   # 后端日志
   tail -f backend/logs/bridge.log
   
   # 浏览器控制台
   # F12 → Console
   ```

2. **检查网络**
   ```bash
   # 测试后端是否可访问
   curl http://localhost:8643/api/health
   
   # 从手机测试
   curl http://[电脑IP]:8643/api/health
   ```

3. **提交 Issue**
   - GitHub: https://github.com/monaleesa77/hermes-dashboard/issues
   - Gitee: https://gitee.com/monaleesa77/hermes-dashboard/issues

---

## 🎉 附录：快速检查清单

手机访问前请确认：

- [ ] 电脑和手机在同一 WiFi
- [ ] 知道电脑的 IP 地址
- [ ] 前端已启动 (`npm run dev` 或 `./start.sh`)
- [ ] 后端已启动
- [ ] CORS 已配置正确的 IP
- [ ] 防火墙已放行端口 10007 和 8643

全部确认后，手机应该可以正常访问！
