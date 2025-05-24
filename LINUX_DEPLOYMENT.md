# 🐧 Linux服务器部署指南

本指南将帮助你在Linux服务器上部署体育赛事爬虫，实现**批量获取**和**实时监控**的同时运行。

## 📋 系统要求

### 操作系统支持
- **Ubuntu/Debian** 18.04+ ✅
- **CentOS/RHEL** 7+ ✅
- **其他Linux发行版** 需要手动安装依赖

### 硬件要求
- **CPU**: 2核+ (推荐4核)
- **内存**: 4GB+ (推荐8GB)
- **磁盘**: 20GB+ 可用空间
- **网络**: 稳定的外网连接

### 软件依赖
- Node.js 16+
- PM2 进程管理器
- Chrome/Chromium 浏览器
- MySQL客户端库

## 🚀 一键部署

### 方法1: 自动部署脚本

```bash
# 1. 下载项目代码
git clone https://github.com/kentPhilippines/spider-puppeteer.git
cd spider-puppeteer

# 2. 设置执行权限
chmod +x deploy.sh

# 3. 运行部署脚本
./deploy.sh
```

### 方法2: 手动部署

如果自动部署失败，请按以下步骤手动部署：

#### 步骤1: 安装Node.js 18

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

#### 步骤2: 安装系统依赖

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y git curl wget unzip build-essential python3 \
    chromium-browser fonts-liberation libasound2 libatk-bridge2.0-0 \
    libdrm2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxss1 libnss3

# CentOS/RHEL
sudo yum update -y
sudo yum groupinstall -y "Development Tools"
sudo yum install -y git curl wget unzip python3 chromium \
    liberation-fonts alsa-lib atk cups-libs gtk3 libdrm libX11 \
    libXcomposite libXdamage libXext libXfixes libXrandr libXss nss
```

#### 步骤3: 安装PM2

```bash
sudo npm install -g pm2
pm2 startup
```

#### 步骤4: 部署项目

```bash
# 创建项目目录
sudo mkdir -p /var/www/spider-puppeteer
sudo chown $USER:$USER /var/www/spider-puppeteer

# 复制项目文件
cp -r . /var/www/spider-puppeteer/
cd /var/www/spider-puppeteer

# 安装依赖
npm install
npx puppeteer browsers install chrome

# 创建日志目录
mkdir -p logs output
```

#### 步骤5: 配置数据库

确保数据库配置正确：

```javascript
// database.js 中的配置
const config = {
  host: 'rm-3nsaxs0kq75fk89n5ko.mysql.rds.aliyuncs.com',
  port: 3306,
  user: 'seo_spider_data', 
  password: 'rDeHT0MOUigKAMNJtkn3',
  database: 'sports_api'
};
```

测试数据库连接：
```bash
node check_database.js
```

#### 步骤6: 启动服务

```bash
# 使用PM2启动
pm2 start ecosystem.config.js --env production
pm2 save

# 查看状态
pm2 status
pm2 logs spider-server
```

## 🎛️ 服务管理

### 基本管理命令

```bash
# 启动服务
./start.sh
# 或者
pm2 start spider-server

# 停止服务
./stop.sh
# 或者  
pm2 stop spider-server

# 重启服务
./restart.sh
# 或者
pm2 restart spider-server

# 查看状态
./status.sh
# 或者
pm2 status
```

### 日志管理

```bash
# 查看实时日志
./logs.sh batch     # 批量获取日志
./logs.sh monitor   # 实时监控日志
./logs.sh server    # 服务器管理日志

# PM2日志
pm2 logs spider-server       # 查看实时日志
pm2 logs spider-server --lines 100  # 查看最近100行
```

### 进程监控

```bash
# PM2监控界面
pm2 monit

# 查看详细状态
pm2 show spider-server

# 重载配置
pm2 reload spider-server
```

## ⚙️ 配置说明

### 服务器管理器配置

在 `server_manager.js` 中可以配置：

```javascript
const config = {
  // 批量获取配置
  batch: {
    enabled: true,           // 是否启用批量获取
    interval: 300000,        // 获取间隔(5分钟)
    maxMatches: 50,          // 每次最大获取数量
    inplay: false,           // 获取未开始的比赛
    getAllMarketMatches: true, // 获取所有有市场数据的比赛
    requestDelay: 1000       // 请求延迟
  },
  
  // 实时监控配置
  monitor: {
    enabled: true,           // 是否启用实时监控
    interval: 30000,         // 监控间隔(30秒)
    duration: 86400000,      // 持续时间(24小时)
    autoDiscover: true       // 自动发现比赛
  },
  
  // 数据库配置
  database: {
    saveToDatabase: true,    // 保存到数据库
    databaseOnly: true       // 仅保存到数据库
  }
};
```

### PM2配置

在 `ecosystem.config.js` 中配置：

```javascript
module.exports = {
  apps: [{
    name: 'spider-server',
    script: 'server_manager.js',
    instances: 1,
    max_memory_restart: '1G',
    cron_restart: '0 2 * * *',  // 每天凌晨2点重启
    // ... 其他配置
  }]
};
```

## 🔧 故障排除

### 常见问题

#### 1. Puppeteer启动失败

```bash
# 检查Chrome安装
which google-chrome || which chromium-browser

# 手动安装Chrome
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
sudo apt-get update
sudo apt-get install google-chrome-stable
```

#### 2. 数据库连接失败

```bash
# 测试数据库连接
node -e "const db = require('./database'); db.connectDatabase().then(() => console.log('连接成功')).catch(err => console.error('连接失败:', err.message))"

# 检查网络连接
ping rm-3nsaxs0kq75fk89n5ko.mysql.rds.aliyuncs.com
```

#### 3. 端口被占用

```bash
# 查看端口占用
sudo netstat -tulpn | grep :3000

# 修改端口配置
# 在ecosystem.config.js中添加:
env: {
  PORT: 3001  // 使用其他端口
}
```

#### 4. 内存不足

```bash
# 查看内存使用
free -h
pm2 monit

# 优化内存使用
# 在ecosystem.config.js中设置:
max_memory_restart: '512M'  // 降低内存限制
```

### 日志分析

```bash
# 查看错误日志
tail -f logs/pm2-error.log

# 查看批量获取日志
tail -f logs/batch.log | grep "ERROR\|WARN"

# 查看监控日志
tail -f logs/monitor.log | grep "变化检测"
```

## 📊 性能优化

### 1. 系统优化

```bash
# 增加文件描述符限制
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# 优化网络参数
echo "net.core.somaxconn = 65535" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 2. 应用优化

```bash
# 调整请求延迟
# 在server_manager.js中:
requestDelay: 2000  // 增加延迟避免被限制

# 调整批量大小
maxMatches: 30  // 减少单次获取数量
```

### 3. 数据库优化

- 定期清理旧数据
- 优化查询索引
- 使用连接池

## 🔐 安全配置

### 1. 防火墙设置

```bash
# Ubuntu
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 3000/tcp

# CentOS
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 2. SSL证书 (可选)

如果需要HTTPS访问，可以使用Let's Encrypt：

```bash
sudo apt-get install certbot
sudo certbot --nginx -d your-domain.com
```

### 3. 进程权限

创建专用用户：

```bash
sudo useradd -r -s /bin/false spider
sudo chown -R spider:spider /var/www/spider-puppeteer
```

## 📈 监控和报警

### 1. 系统监控

```bash
# 安装监控工具
sudo apt-get install htop iotop nethogs

# 实时监控
htop          # CPU和内存
iotop         # 磁盘IO  
nethogs       # 网络使用
```

### 2. 应用监控

```bash
# PM2监控
pm2 monit

# 自定义监控脚本
cat > monitor.sh << 'EOF'
#!/bin/bash
while true; do
  echo "=== $(date) ==="
  pm2 status
  echo "内存使用: $(free -m | grep Mem | awk '{print $3"/"$2" MB"}')"
  echo "磁盘使用: $(df -h /var/www | tail -1 | awk '{print $5}')"
  echo "数据库连接: $(node -e "const db=require('./database'); db.connectDatabase().then(()=>console.log('OK')).catch(()=>console.log('FAIL'))")"
  sleep 60
done
EOF
chmod +x monitor.sh
```

## 🔄 备份和恢复

### 1. 代码备份

```bash
# 创建备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /backup/spider-puppeteer-$DATE.tar.gz \
  --exclude=node_modules \
  --exclude=logs \
  --exclude=output \
  /var/www/spider-puppeteer
EOF
```

### 2. 数据库备份

```bash
# 备份数据库
mysqldump -h rm-3nsaxs0kq75fk89n5ko.mysql.rds.aliyuncs.com \
  -u seo_spider_data -p sports_api > backup_$(date +%Y%m%d).sql
```

## 📞 技术支持

如果遇到问题，请提供以下信息：

1. **系统信息**: `uname -a`
2. **Node版本**: `node --version`
3. **PM2状态**: `pm2 status`
4. **错误日志**: `pm2 logs spider-server --lines 50`
5. **系统资源**: `free -m && df -h`

---

## 🎉 部署完成检查清单

- [ ] ✅ Node.js 18+ 已安装
- [ ] ✅ PM2 已安装并配置开机自启
- [ ] ✅ Chrome/Chromium 已安装
- [ ] ✅ 数据库连接测试通过
- [ ] ✅ 项目依赖安装完成
- [ ] ✅ 服务正常启动
- [ ] ✅ 批量获取功能正常
- [ ] ✅ 实时监控功能正常
- [ ] ✅ 日志输出正常
- [ ] ✅ 防火墙配置完成
- [ ] ✅ 管理脚本创建完成

🎊 **恭喜！体育赛事爬虫已成功部署到Linux服务器！** 