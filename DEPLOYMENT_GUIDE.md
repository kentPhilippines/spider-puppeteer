# 体育赛事爬虫 - Linux服务器部署指南

## 📖 概述

`comprehensive_deploy.sh` 是一个完整的Linux服务器部署脚本，集成了所有修复方案和冲突解决。支持以下系统：

- ✅ Ubuntu/Debian
- ✅ CentOS/RHEL  
- ✅ 阿里云Linux
- ✅ Fedora

## 🚀 快速部署

### 1. 上传文件到服务器

```bash
# 方法1：使用scp
scp -r /path/to/spider-puppeteer user@server:/tmp/

# 方法2：使用rsync (推荐)
rsync -avz --exclude='node_modules' --exclude='.git' \
    /path/to/spider-puppeteer/ user@server:/tmp/spider-puppeteer/

# 方法3：git clone
ssh user@server
git clone https://github.com/yourusername/spider-puppeteer.git
cd spider-puppeteer
```

### 2. 执行部署脚本

```bash
# SSH登录服务器
ssh user@server

# 进入项目目录
cd /tmp/spider-puppeteer

# 添加执行权限
chmod +x comprehensive_deploy.sh

# 执行部署 (标准部署)
./comprehensive_deploy.sh

# 或者，创建systemd服务
./comprehensive_deploy.sh --systemd
```

## 🔧 部署功能

### 自动检测和修复
- ✅ **系统兼容性检测** - 自动识别Ubuntu/CentOS/阿里云Linux/Fedora
- ✅ **EPEL仓库冲突修复** - 专门解决阿里云服务器的包冲突问题
- ✅ **包名适配** - 自动适配不同系统的包名差异
- ✅ **资源检查** - 内存、磁盘空间检查，自动创建交换文件
- ✅ **权限验证** - 检查用户权限，避免root用户运行

### 依赖安装
- ✅ **Node.js 18.x** - 自动安装和版本检查
- ✅ **系统依赖** - 完整的Puppeteer运行环境
- ✅ **Google Chrome** - 多种安装方式，包含备用方案
- ✅ **PM2进程管理器** - 生产环境进程管理
- ✅ **项目依赖** - npm包自动安装和验证

### 服务配置
- ✅ **项目目录设置** - 标准化部署到 `/var/www/spider-puppeteer`
- ✅ **环境配置** - 自动生成 `.env` 配置文件
- ✅ **防火墙配置** - 自动配置端口3000访问权限
- ✅ **数据库连接测试** - 验证数据库配置
- ✅ **服务启动验证** - 确保服务正常运行

## 📋 部署后管理

部署完成后，脚本会在 `/var/www/spider-puppeteer` 目录创建以下管理脚本：

### 基本管理
```bash
./start.sh      # 启动服务
./stop.sh       # 停止服务  
./restart.sh    # 重启服务
./status.sh     # 查看状态
```

### 日志管理
```bash
./logs.sh pm2      # 查看PM2日志
./logs.sh batch    # 查看批量处理日志
./logs.sh monitor  # 查看监控日志
./logs.sh all      # 查看所有日志
```

### 维护管理
```bash
./update.sh     # 更新代码和依赖
./test.sh       # 运行功能测试
./backup.sh     # 备份数据和配置
```

### PM2直接命令
```bash
pm2 status                    # 查看进程状态
pm2 logs spider-server        # 查看实时日志
pm2 monit                     # 性能监控
pm2 restart spider-server     # 重启服务
```

## 🛠️ 故障排除

### 1. 查看部署日志
```bash
cat /tmp/spider_deploy.log
```

### 2. 常见问题

#### EPEL仓库冲突 (已自动修复)
```bash
# 脚本会自动处理以下问题：
Error: conflicting requests
- package epel-aliyuncs-release conflicts with epel-release
```

#### 包名不匹配 (已自动适配)
```bash
# 脚本会自动适配不同系统的包名：
- google-chrome-stable (标准系统)
- noto-fonts-cjk → google-noto-*-cjk-fonts (阿里云)
- libXss → libXScrnSaver (阿里云)
```

#### Chrome安装失败
```bash
# 脚本提供多种备用方案：
1. 仓库安装 → 2. 直接下载RPM → 3. 安装Chromium → 4. 使用Puppeteer内置浏览器
```

#### 内存不足
```bash
# 脚本会自动创建交换文件
free -h  # 检查内存和交换文件
```

### 3. 手动诊断
```bash
# 进入项目目录
cd /var/www/spider-puppeteer

# 检查服务状态
./status.sh

# 运行测试
./test.sh

# 查看详细日志
./logs.sh pm2
```

## ⚙️ 配置文件

### 环境配置 (.env)
```env
NODE_ENV=production
PORT=3000
HEADLESS=true
REQUEST_DELAY=1000
MAX_RETRIES=3

# 数据库配置 (需要手动修改)
DB_HOST=localhost
DB_USER=spider
DB_PASSWORD=your_password
DB_NAME=sports_data
```

### PM2配置 (ecosystem.config.js)
- 自动重启
- 日志管理
- 内存限制
- 定时重启

## 📊 系统要求

### 最低要求
- **操作系统**: Linux (Ubuntu/CentOS/阿里云Linux/Fedora)
- **内存**: 1GB (建议2GB+)
- **磁盘**: 5GB可用空间
- **网络**: 能访问外网

### 推荐配置
- **内存**: 2GB+
- **CPU**: 2核+
- **磁盘**: 10GB+

## 🔐 安全建议

1. **使用普通用户运行** - 避免使用root用户
2. **配置防火墙** - 脚本会自动配置端口3000
3. **定期更新** - 使用 `./update.sh` 更新代码
4. **备份数据** - 使用 `./backup.sh` 定期备份
5. **监控日志** - 定期查看 `./logs.sh` 监控异常

## 📞 支持

如果遇到问题：

1. 检查部署日志: `/tmp/spider_deploy.log`
2. 运行诊断: `./status.sh` 和 `./test.sh`
3. 查看服务日志: `./logs.sh pm2`
4. 重启服务: `./restart.sh`

---

**🎉 恭喜！** 现在您可以使用 `comprehensive_deploy.sh` 一键部署体育赛事爬虫到任何支持的Linux服务器！ 