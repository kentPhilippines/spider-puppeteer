#!/bin/bash

# 体育赛事爬虫 - Linux服务器部署脚本 (修复版)

set -e

echo "🚀 开始部署体育赛事爬虫到Linux服务器..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要文件
check_required_files() {
    log_info "检查必要文件..."
    
    local required_files=(
        "package.json"
        "scrape.js"
        "server_manager.js"
        "ecosystem.config.js"
        "database.js"
    )
    
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        log_error "缺少必要文件："
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        exit 1
    fi
    
    log_success "所有必要文件检查通过"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "检测到root用户，建议使用普通用户运行"
        read -p "是否继续? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 检查操作系统
check_os() {
    log_info "检查操作系统..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get >/dev/null 2>&1; then
            OS="ubuntu"
            PKG_MANAGER="apt-get"
            CHROMIUM_PKG="chromium-browser"
            log_success "检测到Ubuntu/Debian系统"
        elif command -v yum >/dev/null 2>&1; then
            # 检查是否为阿里云系统
            if grep -q "Alibaba Cloud Linux" /etc/os-release 2>/dev/null || grep -q "Aliyun Linux" /etc/os-release 2>/dev/null; then
                OS="aliyun"
                PKG_MANAGER="yum"
                CHROMIUM_PKG="chromium"
                log_success "检测到阿里云Linux系统"
            else
                OS="centos"
                PKG_MANAGER="yum"
                CHROMIUM_PKG="chromium"
                log_success "检测到CentOS/RHEL系统"
            fi
        elif command -v dnf >/dev/null 2>&1; then
            OS="fedora"
            PKG_MANAGER="dnf"
            CHROMIUM_PKG="chromium"
            log_success "检测到Fedora系统"
        else
            log_error "不支持的Linux发行版"
            exit 1
        fi
    else
        log_error "不支持的操作系统: $OSTYPE"
        exit 1
    fi
}

# 检查系统资源
check_system_resources() {
    log_info "检查系统资源..."
    
    # 检查内存
    local mem_total=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    if [ "$mem_total" -lt 1024 ]; then
        log_warning "系统内存不足1GB，可能影响性能"
    fi
    
    # 检查磁盘空间
    local disk_available=$(df / | tail -1 | awk '{print $4}')
    if [ "$disk_available" -lt 2097152 ]; then # 2GB in KB
        log_warning "根目录可用空间不足2GB"
    fi
    
    log_success "系统资源检查完成"
}

# 安装Node.js
install_nodejs() {
    log_info "检查Node.js安装..."
    
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        log_success "Node.js已安装: $NODE_VERSION"
        
        # 检查版本是否满足要求（需要v16+）
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -lt 16 ]; then
            log_warning "Node.js版本过低，需要v16+，开始升级..."
            install_nodejs_force
        fi
    else
        log_info "Node.js未安装，开始安装..."
        install_nodejs_force
    fi
    
    # 验证安装
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js安装失败"
        exit 1
    fi
    
    if ! command -v npm >/dev/null 2>&1; then
        log_error "npm安装失败"
        exit 1
    fi
}

install_nodejs_force() {
    if [ "$OS" = "ubuntu" ]; then
        # Ubuntu/Debian安装
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo $PKG_MANAGER install -y nodejs
    elif [ "$OS" = "centos" ] || [ "$OS" = "aliyun" ]; then
        # CentOS/RHEL/阿里云安装
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo $PKG_MANAGER install -y nodejs npm
    elif [ "$OS" = "fedora" ]; then
        # Fedora安装
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo $PKG_MANAGER install -y nodejs npm
    fi
    
    log_success "Node.js安装完成: $(node --version)"
}

# 安装系统依赖
install_system_deps() {
    log_info "安装系统依赖..."
    
    if [ "$OS" = "ubuntu" ]; then
        sudo $PKG_MANAGER update
        sudo $PKG_MANAGER install -y \
            git \
            curl \
            wget \
            unzip \
            build-essential \
            python3 \
            python3-pip \
            $CHROMIUM_PKG \
            fonts-liberation \
            fonts-noto-cjk \
            libasound2 \
            libatk-bridge2.0-0 \
            libdrm2 \
            libxcomposite1 \
            libxdamage1 \
            libxrandr2 \
            libgbm1 \
            libxss1 \
            libnss3 \
            libgconf-2-4 \
            libxfixes3 \
            libxinerama1 \
            libgtk-3-0 \
            libgdk-pixbuf2.0-0 \
            libglib2.0-0 \
            libpango-1.0-0 \
            libcairo2 \
            libdbus-1-3 \
            libxtst6 \
            libxrandr2 \
            libasound2 \
            libpangocairo-1.0-0 \
            libatk1.0-0 \
            libcairo-gobject2 \
            libgtk-3-0 \
            libgdk-pixbuf2.0-0
            
    elif [ "$OS" = "centos" ] || [ "$OS" = "aliyun" ] || [ "$OS" = "fedora" ]; then
        sudo $PKG_MANAGER update -y
        
        if [ "$OS" = "centos" ] || [ "$OS" = "aliyun" ]; then
            sudo $PKG_MANAGER groupinstall -y "Development Tools"
            # EPEL已在前面的步骤中处理
        fi
        
        sudo $PKG_MANAGER install -y \
            git \
            curl \
            wget \
            unzip \
            python3 \
            python3-pip \
            google-chrome-stable \
            liberation-fonts \
            noto-fonts-cjk \
            alsa-lib \
            atk \
            cups-libs \
            gtk3 \
            libdrm \
            libX11 \
            libXcomposite \
            libXdamage \
            libXext \
            libXfixes \
            libXrandr \
            libXss \
            libgcc \
            nss \
            nspr \
            dbus-glib \
            libXtst \
            xorg-x11-server-Xvfb
    fi
    
    # 验证关键依赖
    if ! command -v git >/dev/null 2>&1; then
        log_error "git安装失败"
        exit 1
    fi
    
    log_success "系统依赖安装完成"
}

# 安装Google Chrome (如果需要)
install_chrome() {
    log_info "检查Chrome浏览器..."
    
    if command -v google-chrome >/dev/null 2>&1; then
        log_success "Chrome已安装"
        return
    fi
    
    log_info "安装Google Chrome..."
    
    if [ "$OS" = "ubuntu" ]; then
        wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
        echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
        sudo $PKG_MANAGER update
        sudo $PKG_MANAGER install -y google-chrome-stable
    elif [ "$OS" = "centos" ] || [ "$OS" = "aliyun" ] || [ "$OS" = "fedora" ]; then
        cat > /tmp/google-chrome.repo << 'EOF'
[google-chrome]
name=google-chrome
baseurl=http://dl.google.com/linux/chrome/rpm/stable/x86_64
enabled=1
gpgcheck=1
gpgkey=https://dl.google.com/linux/linux_signing_key.pub
EOF
        sudo mv /tmp/google-chrome.repo /etc/yum.repos.d/
        sudo $PKG_MANAGER install -y google-chrome-stable
    fi
    
    log_success "Chrome安装完成"
}

# 安装PM2
install_pm2() {
    log_info "检查PM2安装..."
    
    if command -v pm2 >/dev/null 2>&1; then
        log_success "PM2已安装: $(pm2 --version)"
    else
        log_info "安装PM2..."
        npm install -g pm2
        
        # 验证安装
        if ! command -v pm2 >/dev/null 2>&1; then
            log_error "PM2安装失败"
            exit 1
        fi
        
        log_success "PM2安装完成"
    fi
    
    # 设置PM2开机自启 (小心处理)
    log_info "配置PM2开机自启..."
    
    local startup_cmd=$(pm2 startup | grep -E '^sudo' | head -1)
    if [ -n "$startup_cmd" ]; then
        eval "$startup_cmd" || log_warning "PM2开机自启配置失败，请手动执行: $startup_cmd"
    fi
}

# 创建项目目录
setup_project() {
    log_info "设置项目目录..."
    
    PROJECT_DIR="/var/www/spider-puppeteer"
    
    # 创建项目目录
    if [ ! -d "$PROJECT_DIR" ]; then
        sudo mkdir -p "$PROJECT_DIR"
        sudo chown $USER:$(id -gn $USER) "$PROJECT_DIR"
    fi
    
    # 复制文件到项目目录
    if [ "$PWD" != "$PROJECT_DIR" ]; then
        log_info "复制项目文件到 $PROJECT_DIR"
        
        # 创建临时排除文件列表
        local exclude_dirs=("node_modules" ".git" "logs" "output" "*.log")
        local rsync_excludes=""
        
        for exclude in "${exclude_dirs[@]}"; do
            rsync_excludes="$rsync_excludes --exclude=$exclude"
        done
        
        # 使用rsync复制，避免大文件
        if command -v rsync >/dev/null 2>&1; then
            rsync -av $rsync_excludes . "$PROJECT_DIR/"
        else
            cp -r . "$PROJECT_DIR/"
        fi
        
        cd "$PROJECT_DIR"
    fi
    
    # 创建必要的目录
    mkdir -p logs
    mkdir -p output
    mkdir -p temp
    
    # 设置正确的权限
    chmod 755 "$PROJECT_DIR"
    chmod -R 644 "$PROJECT_DIR"/*
    chmod +x "$PROJECT_DIR"/*.sh
    chmod +x "$PROJECT_DIR"/*.js
    
    log_success "项目目录设置完成: $PROJECT_DIR"
}

# 安装项目依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    # 检查package.json
    if [ ! -f "package.json" ]; then
        log_error "package.json文件不存在"
        exit 1
    fi
    
    # 清理可能的旧依赖
    if [ -d "node_modules" ]; then
        log_info "清理旧的node_modules..."
        rm -rf node_modules
    fi
    
    if [ -f "package-lock.json" ]; then
        rm -f package-lock.json
    fi
    
    # 安装npm依赖
    log_info "执行npm install..."
    npm install --production
    
    # 验证关键依赖
    if [ ! -d "node_modules/puppeteer" ]; then
        log_error "Puppeteer安装失败"
        exit 1
    fi
    
    # 安装Puppeteer的Chromium
    log_info "安装Puppeteer Chrome浏览器..."
    npx puppeteer browsers install chrome
    
    log_success "项目依赖安装完成"
}

# 配置数据库
configure_database() {
    log_info "配置数据库连接..."
    
    # 检查是否有数据库配置文件
    if [ -f "database.js" ]; then
        log_success "数据库配置文件已存在"
        
        # 测试数据库连接
        log_info "测试数据库连接..."
        if timeout 30 node -e "
            const db = require('./database'); 
            db.connectDatabase()
                .then(() => { 
                    console.log('数据库连接成功'); 
                    process.exit(0); 
                })
                .catch((err) => { 
                    console.error('数据库连接失败:', err.message); 
                    process.exit(1); 
                })
        "; then
            log_success "数据库连接测试通过"
        else
            log_warning "数据库连接测试失败，服务仍将启动"
            return 0
        fi
    else
        log_warning "数据库配置文件不存在，请手动配置"
        return 0
    fi
}

# 配置防火墙
configure_firewall() {
    log_info "配置防火墙..."
    
    if command -v ufw >/dev/null 2>&1; then
        # Ubuntu防火墙
        sudo ufw allow ssh
        sudo ufw allow 3000/tcp
        log_success "防火墙配置完成 (ufw)"
    elif command -v firewall-cmd >/dev/null 2>&1; then
        # CentOS防火墙
        sudo firewall-cmd --permanent --add-port=3000/tcp
        sudo firewall-cmd --reload
        log_success "防火墙配置完成 (firewalld)"
    elif command -v iptables >/dev/null 2>&1; then
        # 基本iptables配置
        sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
        log_success "防火墙配置完成 (iptables)"
    else
        log_warning "未检测到防火墙，请手动配置端口3000"
    fi
}

# 创建环境配置文件
create_env_config() {
    log_info "创建环境配置文件..."
    
    if [ ! -f ".env" ]; then
        cat > .env << 'EOF'
# 生产环境配置
NODE_ENV=production
PORT=3000

# 爬虫配置
HEADLESS=true
REQUEST_DELAY=1000
MAX_RETRIES=3

# 数据库配置 (请根据实际情况修改)
DB_HOST=localhost
DB_USER=spider
DB_PASSWORD=your_password
DB_NAME=sports_data

# 日志配置
LOG_LEVEL=info
LOG_MAX_SIZE=50MB
LOG_MAX_FILES=7

# API配置
API_TIMEOUT=30000
EOF
        log_success "环境配置文件创建完成"
    else
        log_success "环境配置文件已存在"
    fi
}

# 启动服务
start_service() {
    log_info "启动爬虫服务..."
    
    # 停止现有进程
    pm2 delete spider-server 2>/dev/null || true
    pm2 kill 2>/dev/null || true
    
    # 等待进程完全停止
    sleep 3
    
    # 启动新进程
    log_info "启动PM2进程..."
    pm2 start ecosystem.config.js --env production
    
    # 等待服务启动
    sleep 5
    
    # 保存PM2配置
    pm2 save
    
    # 验证服务状态
    if pm2 list | grep -q "spider-server.*online"; then
        log_success "服务启动完成"
    else
        log_error "服务启动失败"
        pm2 logs spider-server --lines 20
        exit 1
    fi
    
    # 显示状态
    pm2 status
    echo
    echo "最新日志："
    pm2 logs spider-server --lines 10
}

# 创建管理脚本
create_management_scripts() {
    log_info "创建管理脚本..."
    
    # 创建启动脚本
    cat > start.sh << 'EOF'
#!/bin/bash
echo "启动爬虫服务..."
cd /var/www/spider-puppeteer
pm2 start ecosystem.config.js --env production
pm2 save
pm2 status
EOF
    
    # 创建停止脚本
    cat > stop.sh << 'EOF'
#!/bin/bash
echo "停止爬虫服务..."
cd /var/www/spider-puppeteer
pm2 stop spider-server
EOF
    
    # 创建重启脚本
    cat > restart.sh << 'EOF'
#!/bin/bash
echo "重启爬虫服务..."
cd /var/www/spider-puppeteer
pm2 restart spider-server
pm2 status
EOF
    
    # 创建状态查看脚本
    cat > status.sh << 'EOF'
#!/bin/bash
cd /var/www/spider-puppeteer
echo "=== PM2 状态 ==="
pm2 status
echo ""
echo "=== 系统资源 ==="
echo "内存使用:"
free -h
echo ""
echo "磁盘使用:"
df -h /var/www/spider-puppeteer
echo ""
echo "=== 服务状态 ==="
if [ -f "logs/status.json" ]; then
    cat logs/status.json | jq '.' 2>/dev/null || cat logs/status.json
else
    echo "状态文件不存在"
fi
echo ""
echo "=== 最近日志 ==="
pm2 logs spider-server --lines 20
EOF
    
    # 创建日志查看脚本
    cat > logs.sh << 'EOF'
#!/bin/bash
cd /var/www/spider-puppeteer

if [ "$1" = "batch" ]; then
    tail -f logs/batch.log
elif [ "$1" = "monitor" ]; then
    tail -f logs/monitor.log
elif [ "$1" = "server" ]; then
    tail -f logs/server.log
elif [ "$1" = "pm2" ]; then
    pm2 logs spider-server
elif [ "$1" = "all" ]; then
    tail -f logs/*.log
else
    echo "使用方法: ./logs.sh [batch|monitor|server|pm2|all]"
    echo ""
    echo "可用日志文件:"
    ls -la logs/
fi
EOF
    
    # 创建更新脚本
    cat > update.sh << 'EOF'
#!/bin/bash
echo "更新爬虫代码..."
cd /var/www/spider-puppeteer

# 备份当前配置
cp .env .env.backup 2>/dev/null || true

# 拉取最新代码 (如果是git仓库)
if [ -d ".git" ]; then
    git pull origin main
fi

# 更新依赖
npm install --production

# 重启服务
pm2 restart spider-server

echo "更新完成"
EOF
    
    # 设置执行权限
    chmod +x start.sh stop.sh restart.sh status.sh logs.sh update.sh
    
    log_success "管理脚本创建完成"
}

# 创建系统服务 (可选)
create_systemd_service() {
    if [ "$1" = "--systemd" ]; then
        log_info "创建systemd服务..."
        
        sudo tee /etc/systemd/system/spider-puppeteer.service > /dev/null << EOF
[Unit]
Description=Spider Puppeteer Service
After=network.target

[Service]
Type=forking
User=$USER
WorkingDirectory=/var/www/spider-puppeteer
ExecStart=/usr/bin/pm2 start ecosystem.config.js --env production
ExecReload=/usr/bin/pm2 restart spider-server
ExecStop=/usr/bin/pm2 stop spider-server
PIDFile=/home/$USER/.pm2/pm2.pid
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
        
        sudo systemctl daemon-reload
        sudo systemctl enable spider-puppeteer
        
        log_success "systemd服务创建完成"
    fi
}

# 运行部署测试
run_deployment_test() {
    log_info "运行部署测试..."
    
    # 测试基本功能
    log_info "测试爬虫基本功能..."
    
    if timeout 60 node scrape.js --inplay false --maxMatches 1 --requestDelay 2000; then
        log_success "爬虫基本功能测试通过"
    else
        log_warning "爬虫功能测试失败，但部署继续"
    fi
}

# 修复EPEL仓库冲突（专门针对阿里云服务器）
fix_epel_conflict() {
    if [ "$OS" = "aliyun" ] || [ "$OS" = "centos" ]; then
        log_info "检查并修复EPEL仓库冲突..."
        
        # 检查是否存在EPEL冲突
        if yum list installed | grep -q epel-aliyuncs-release; then
            log_warning "检测到阿里云EPEL包冲突，正在修复..."
            
            # 移除冲突的包
            sudo yum remove -y epel-aliyuncs-release epel-release 2>/dev/null || true
            
            # 清理缓存
            sudo yum clean all
            
            # 重新安装EPEL
            log_info "重新安装EPEL仓库..."
            if ! sudo yum install -y epel-release --allowerasing; then
                log_warning "标准EPEL安装失败，尝试手动安装..."
                
                # 手动下载安装EPEL
                local epel_rpm=""
                if grep -q "release 8" /etc/redhat-release 2>/dev/null; then
                    epel_rpm="https://dl.fedoraproject.org/pub/epel/epel-release-latest-8.noarch.rpm"
                elif grep -q "release 7" /etc/redhat-release 2>/dev/null; then
                    epel_rpm="https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm"
                fi
                
                if [ -n "$epel_rpm" ]; then
                    sudo yum install -y "$epel_rpm" || log_warning "EPEL手动安装也失败，继续部署..."
                fi
            fi
            
            log_success "EPEL仓库冲突已修复"
        else
            # 正常安装EPEL
            if ! yum list installed | grep -q epel-release; then
                log_info "安装EPEL仓库..."
                sudo yum install -y epel-release --allowerasing || log_warning "EPEL安装失败，继续部署..."
            else
                log_success "EPEL仓库已安装"
            fi
        fi
        
        # 验证EPEL仓库
        if yum repolist 2>/dev/null | grep -q epel; then
            log_success "EPEL仓库验证通过"
        else
            log_warning "EPEL仓库验证失败，但继续部署"
        fi
    fi
}

# 主函数
main() {
    local start_time=$(date +%s)
    
    echo "========================================="
    echo "🕷️  体育赛事爬虫 - Linux服务器部署 (修复版)"
    echo "========================================="
    
    # 检查和准备
    check_required_files
    check_root
    check_os
    
    # 修复EPEL仓库冲突（在安装依赖前）
    fix_epel_conflict
    
    check_system_resources
    
    # 安装依赖
    install_nodejs
    install_system_deps
    install_chrome
    install_pm2
    
    # 设置项目
    setup_project
    create_env_config
    install_dependencies
    
    # 配置服务
    configure_database
    configure_firewall
    create_management_scripts
    
    # 创建systemd服务 (如果指定)
    create_systemd_service "$@"
    
    # 启动服务
    start_service
    
    # 运行测试
    run_deployment_test
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    echo "========================================="
    log_success "🎉 部署完成！(耗时: ${duration}秒)"
    echo "========================================="
    echo ""
    echo "📋 管理命令:"
    echo "  ./start.sh     - 启动服务"
    echo "  ./stop.sh      - 停止服务"
    echo "  ./restart.sh   - 重启服务"
    echo "  ./status.sh    - 查看状态"
    echo "  ./logs.sh      - 查看日志"
    echo "  ./update.sh    - 更新代码"
    echo ""
    echo "📊 PM2 命令:"
    echo "  pm2 status                    - 查看进程状态"
    echo "  pm2 logs spider-server        - 查看实时日志"
    echo "  pm2 monit                     - 进程监控"
    echo "  pm2 restart spider-server     - 重启服务"
    echo ""
    echo "📁 项目目录: $PROJECT_DIR"
    echo "📝 日志目录: $PROJECT_DIR/logs"
    echo "⚙️  环境配置: $PROJECT_DIR/.env"
    echo ""
    echo "🔗 服务状态检查: ./status.sh"
    echo "📊 监控URL: http://$(hostname -I | awk '{print $1}'):3000 (如果启用了Web监控)"
    echo ""
    echo "🔧 故障排除:"
    echo "  - 查看日志: ./logs.sh pm2"
    echo "  - 重启服务: ./restart.sh"
    echo "  - 检查状态: ./status.sh"
}

# 执行主函数
main "$@" 