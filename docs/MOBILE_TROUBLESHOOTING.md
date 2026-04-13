# 手机端常见问题排查指南

> 基于实际用户反馈整理的故障排除文档

## 🔍 快速诊断流程

遇到手机无法访问时，按以下顺序排查：

```
1. 检查服务状态 → 2. 检查网络连接 → 3. 检查CORS配置 → 4. 检查防火墙
```

---

## ❌ 问题1：手机无法访问页面

### 症状
- 手机浏览器显示 "无法连接" 或 "此网站无法访问"
- 页面一直加载中

### 排查步骤

#### 步骤1：确认服务运行状态

在电脑上执行：
```bash
# 检查前端服务
curl http://localhost:10007

# 检查后端API
curl http://localhost:8643/api/health

# 查看端口占用
lsof -i :10007
lsof -i :8643
```

**预期结果：**
- 前端返回HTML内容
- 后端返回 `{"status":"healthy",...}`
- 端口显示有进程监听

#### 步骤2：获取正确的IP地址

```bash
# macOS获取IP
ipconfig getifaddr en0

# Linux获取IP
ip addr show | grep "inet " | grep -v 127.0.0.1

# 或者使用通用命令
ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1
```

**常见误区：**
- ❌ 不要使用 `127.0.0.1` 或 `localhost`（这是电脑自己）
- ❌ 不要使用 `0.0.0.0`（这是监听地址，不是访问地址）
- ✅ 使用类似 `192.168.x.x` 的局域网IP

#### 步骤3：测试网络连通性

在手机上：
```
1. 打开浏览器
2. 访问 http://[电脑IP]:10007
   例如：http://192.168.1.100:10007
```

如果无法访问，继续排查：

**A. 检查防火墙（macOS）**
```bash
# 查看防火墙状态
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# 临时关闭防火墙测试（记得重新开启）
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off

# 或者添加允许的应用
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add $(which node)
```

**B. 检查WiFi网络**
```bash
# 确认手机和电脑在同一网络
# 电脑IP应该是 192.168.x.x 或 10.x.x.x

# 从手机ping电脑（如果有终端工具）
ping 192.168.1.100
```

---

## ❌ 问题2：CORS跨域错误

### 症状
浏览器控制台显示：
```
Access to fetch at 'http://...' from origin 'http://...' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

或后端日志显示：
```
WARNING:cors:Invalid CORS origin: http://192.168.1.xxx:10007
```

### 解决方案

编辑 `backend/.env`：

```env
# 在 CORS_ORIGINS 中添加你的手机访问IP（支持整个局域网段）
# 原来可能是：
CORS_ORIGINS=http://localhost:10007

# 修改为支持整个局域网段：
CORS_ORIGINS=http://localhost:10007,https://localhost:10007,http://127.0.0.1:10007,https://127.0.0.1:10007,http://192.168.*:10007,http://10.*.*.*:10007
```

**获取你的IP：**
```bash
ipconfig getifaddr en0
# 输出示例：192.168.1.100
```

**重启服务：**
```bash
# 停止当前服务
Ctrl+C

# 重新启动
./start.sh
```

---

## ❌ 问题3：HTTPS证书警告

### 症状
浏览器显示：
- "您的连接不是私密连接"
- "NET::ERR_CERT_AUTHORITY_INVALID"
- "不安全"警告

### 原因
自签名证书不被浏览器默认信任

### 解决方案

#### 方案A：信任证书（推荐长期使用）

**macOS系统信任：**
```bash
# 信任证书（需要管理员密码）
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  /Users/mona/hermes-dashboard/backend/certs/cert.pem

# 验证是否成功
security find-certificate -c "Hermes" -Z /Library/Keychains/System.keychain
```

**iOS设备信任：**
1. 通过AirDrop或邮件将 `cert.pem` 发送到iPhone
2. 在iPhone上点击证书文件
3. 进入 设置 → 通用 → 关于本机 → 证书信任设置
4. 启用 Hermes 证书

**Android设备信任：**
1. 将 `cert.pem` 复制到手机
2. 设置 → 安全 → 从存储安装
3. 选择证书文件，命名为 "Hermes"

#### 方案B：继续访问（快速测试）

在浏览器警告页面：
1. 点击 "高级" 或 "详细信息"
2. 点击 "继续前往 [IP]（不安全）"
3. 可以正常访问（每次都需要这样操作）

#### 方案C：禁用HTTPS（开发环境）

如果不需要HTTPS，可以禁用它：

```bash
# 编辑 backend/.env
USE_HTTPS=false

# 重启服务
./start.sh

# 然后使用 HTTP 访问
http://192.168.1.100:10007
```

---

## ❌ 问题4：PWA安装后白屏

### 症状
- 添加到主屏幕后打开是白屏
- 或者显示 "无法加载此网页"

### 排查步骤

#### 步骤1：清除缓存并重新安装

**iOS Safari：**
```
1. 删除主屏幕上的应用图标（长按 → 移除）
2. 设置 → Safari → 清除历史记录和网站数据
3. 重新打开 Safari 访问网页
4. 再次添加到主屏幕
```

**Android Chrome：**
```
1. 删除主屏幕上的应用
2. Chrome → 设置 → 隐私 → 清除浏览数据
3. 选择 "缓存的图像和文件" 和 "Cookie"
4. 清除后重新访问网页并安装
```

#### 步骤2：检查Service Worker

在电脑浏览器中：
```javascript
// 打开开发者工具 → Console
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  console.log('Service Workers:', registrations);
});

// 如果有问题，可以注销所有SW
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for(let registration of registrations) {
    registration.unregister();
    console.log('Unregistered:', registration);
  }
});
```

#### 步骤3：验证manifest.json

在浏览器访问：
```
http://[IP]:10007/manifest.json
```

确保返回正确的JSON内容，包含：
- name, short_name
- start_url
- display: standalone
- icons 数组

#### 步骤4：检查控制台错误

在手机上：
1. iOS：Safari → 高级 → Web检查器（需要在Mac上查看）
2. Android：Chrome → chrome://inspect

常见错误：
- `Failed to load resource: net::ERR_CONNECTION_REFUSED` - 服务未运行
- `Manifest: property 'start_url' ignored` - manifest格式错误
- `Uncaught SyntaxError` - 代码错误

---

## ❌ 问题5：热重载在手机上不工作

### 症状
- 修改代码后手机端不自动刷新
- 必须手动刷新才能看到更新

### 原因
Vite 的热重载（HMR）使用 WebSocket，在局域网环境下可能不稳定或被防火墙阻止。

### 解决方案

#### 方案A：手动刷新（最简单）
在手机上直接下拉刷新页面。

#### 方案B：使用Chrome远程调试（推荐开发时使用）

**步骤：**
1. 用USB线连接手机和电脑
2. 在手机上：设置 → 开发者选项 → 启用USB调试
3. 在电脑Chrome地址栏输入：`chrome://inspect`
4. 找到你的手机设备，点击 "Inspect"
5. 现在可以在电脑DevTools中调试手机页面
6. 修改代码后，在DevTools控制台输入 `location.reload()` 刷新

#### 方案C：禁用缓存（开发时）

修改 `frontend/index.html`，在 `<head>` 中添加：
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
```

#### 方案D：使用Live Reload替代HMR

修改 `vite.config.ts`：
```typescript
export default defineConfig({
  // ...其他配置
  server: {
    hmr: false, // 禁用HMR
    watch: {
      usePolling: true, // 使用轮询代替WebSocket
      interval: 1000,
    },
  },
})
```

---

## 🛠️ 常用调试命令

### 检查服务状态
```bash
# 检查所有服务端口
lsof -i :10007,8642,8643

# 检查网络连接
netstat -an | grep LISTEN | grep -E "10007|8642|8643"
```

### 测试API连通性
```bash
# 本地测试
curl http://localhost:8643/api/health

# 从其他设备测试（替换为你的IP）
curl http://192.168.1.100:8643/api/health
```

### 清除缓存重新开始
```bash
# 停止所有服务
pkill -f "python main.py"
pkill -f "vite"

# 清除前端缓存
rm -rf frontend/node_modules/.vite
rm -rf frontend/dist

# 清除Service Worker（Chrome）
# 打开 chrome://serviceworker-internals/ 并注销

# 重新构建并启动
cd frontend && npm run build
cd ..
./start.sh
```

---

## 📱 移动端调试技巧

### iOS Safari调试

**使用Mac远程调试：**
1. iPhone：设置 → Safari → 高级 → 开启"Web检查器"
2. Mac Safari：偏好设置 → 高级 → 开启"在菜单栏中显示开发菜单"
3. 用USB连接iPhone到Mac
4. Mac Safari：开发菜单 → 选择你的iPhone → 选择网页

### Android Chrome调试

1. 手机：设置 → 开发者选项 → 开启"USB调试"
2. 用USB连接手机到电脑
3. 电脑Chrome访问：`chrome://inspect`
4. 找到你的设备，点击"Inspect"

### 查看手机控制台日志

如果没有电脑，可以在手机浏览器地址栏输入：
```javascript
javascript:console.log = function(...args) { alert(args.join(' ')); };
```

---

## 🆘 获取帮助

如果按照本指南仍无法解决问题：

1. **收集信息**：
   - 错误截图
   - 浏览器控制台日志
   - 后端日志 (`backend/logs/`)
   - 网络环境（是否同一WiFi）

2. **提交Issue**：
   - GitHub: https://github.com/monaleesa77/hermes-dashboard/issues
   - Gitee: https://gitee.com/monaleesa77/hermes-dashboard/issues

3. **提供详细信息**：
   ```markdown
   ## 问题描述
   手机无法访问，显示"无法连接"

   ## 环境信息
   - 电脑系统: macOS 14.x
   - 手机系统: iOS 17.x
   - 网络: 同一WiFi（确认）
   - 电脑IP: 192.168.1.100

   ## 已尝试的解决方法
   - 已添加IP到CORS_ORIGINS
   - 已关闭防火墙测试
   - 服务确认已启动

   ## 错误日志
   [粘贴相关日志]
   ```

---

**祝使用愉快！如果遇到本指南未覆盖的问题，欢迎提交反馈帮助完善文档。** 🚀