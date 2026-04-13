# 手机端快速开始指南

## 🎯 三步手机访问

### 第 1 步：获取电脑 IP

在电脑上运行：
```bash
# macOS
ipconfig getifaddr en0

# 输出示例：192.168.1.100
```

### 第 2 步：确保服务运行

```bash
# 在项目根目录
./start.sh
```

### 第 3 步：手机访问

在手机上打开浏览器，输入：
```
http://[你的IP]:10007
```

例如：`http://192.168.1.100:10007`

---

## 📲 安装为 App

### iOS
1. Safari 打开网页
2. 点击底部分享按钮 ⬆️
3. 选择"添加到主屏幕"
4. 完成！像原生 App 一样使用

### Android
1. Chrome 打开网页
2. 点击菜单（三个点）
3. 选择"安装应用"或"添加到主屏幕"
4. 完成！

---

## 🔒 HTTPS 安全访问（推荐）

### 启用 HTTPS：

```bash
# 1. 进入后端目录
cd backend

# 2. 生成 SSL 证书
./generate-ssl.sh

# 3. 编辑 .env，设置 USE_HTTPS=true
echo "USE_HTTPS=true" >> .env

# 4. 重启服务
./start.sh
```

### 手机访问 HTTPS：
```
https://[你的IP]:10007
```

---

## ❓ 常见问题

### 1. 手机无法访问

**检查清单：**
- [ ] 手机和电脑在同一 WiFi
- [ ] 防火墙已放行端口 10007
- [ ] `./start.sh` 已正常运行

**解决方法：**
```bash
# 检查服务状态
curl http://localhost:10007

# 检查端口是否开放
lsof -i :10007
```

### 2. 显示 CORS 错误

**解决：** 编辑 `backend/.env`，确保包含局域网段：
```env
CORS_ORIGINS=http://localhost:10007,https://localhost:10007,http://127.0.0.1:10007,https://127.0.0.1:10007,http://192.168.*:10007,http://10.*.*.*:10007
```

### 3. PWA 安装后白屏

**解决：**
1. 删除主屏幕图标
2. 清除 Safari/Chrome 缓存
3. 重新访问网页
4. 重新添加到主屏幕

---

## 📞 获取帮助

遇到问题？

1. 查看完整指南：[README_MOBILE.md](README_MOBILE.md)
2. 提交 Issue：
   - GitHub: https://github.com/monaleesa77/hermes-dashboard/issues
   - Gitee: https://gitee.com/monaleesa77/hermes-dashboard/issues

---

**享受在手机上使用 Hermes Dashboard！🎉**
