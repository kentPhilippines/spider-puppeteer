#!/bin/bash

# 体育赛事爬虫 - 综合部署脚本 (完整版)
# 集成所有修复方案和冲突解决

set -e

echo "🚀 开始部署体育赛事爬虫到Linux服务器..."
echo "📅 部署时间: $(date)"
echo "🖥️  系统信息: $(uname -a)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 全局变量
DEPLOY_START_TIME=$(date +%s)
PROJECT_DIR="/var/www/spider-puppeteer"
INSTALL_LOG="/tmp/spider_deploy.log"

# 日志函数
log_info() {
    local message="[INFO] $1"
    echo -e "${BLUE}${message}${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') ${message}" >> "$INSTALL_LOG"
}

log_success() {
    local message="[SUCCESS] $1"
    echo -e "${GREEN}${message}${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') ${message}" >> "$INSTALL_LOG"
}

log_warning() {
    local message="[WARNING] $1"
    echo -e "${YELLOW}${message}${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') ${message}" >> "$INSTALL_LOG"
}

log_error() {
    local message="[ERROR] $1"
    echo -e "${RED}${message}${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') ${message}" >> "$INSTALL_LOG"
}

# 错误处理
error_exit() {
    log_error "$1"
    log_error "部署失败！查看日志: $INSTALL_LOG"
    exit 1
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
        error_exit "请确保所有必要文件都存在"
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
            error_exit "不支持的Linux发行版"
        fi
    else
        error_exit "不支持的操作系统: $OSTYPE"
    fi
}

# 修复EPEL仓库冲突（专门针对阿里云服务器）
fix_epel_conflict() {
    if [ "$OS" = "aliyun" ] || [ "$OS" = "centos" ]; then
        log_info "检查并修复EPEL仓库冲突..."
        
        # 检查是否存在EPEL冲突
        if yum list installed 2>/dev/null | grep -q epel-aliyuncs-release; then
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
                elif grep -q "release 9" /etc/redhat-release 2>/dev/null; then
                    epel_rpm="https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm"
                fi
                
                if [ -n "$epel_rpm" ]; then
                    if wget -q "$epel_rpm" -O /tmp/epel-release.rpm; then
                        sudo yum localinstall -y /tmp/epel-release.rpm || log_warning "EPEL手动安装也失败，继续部署..."
                    fi
                fi
            fi
            
            log_success "EPEL仓库冲突已修复"
        else
            # 正常安装EPEL
            if ! yum list installed 2>/dev/null | grep -q epel-release; then
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

# 检查系统资源
check_system_resources() {
    log_info "检查系统资源..."
    
    # 检查内存
    local mem_total=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    if [ "$mem_total" -lt 1024 ]; then
        log_warning "系统内存不足1GB (当前: ${mem_total}MB)，可能影响性能"
        log_info "建议创建交换文件..."
        
        # 自动创建交换文件
        if [ ! -f /swapfile ]; then
            log_info "创建2GB交换文件..."
            sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
            sudo chmod 600 /swapfile
            sudo mkswap /swapfile
            sudo swapon /swapfile
            echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
            log_success "交换文件创建完成"
        fi
    else
        log_success "内存检查通过 (${mem_total}MB)"
    fi
    
    # 检查磁盘空间
    local disk_available=$(df / | tail -1 | awk '{print $4}')
    local disk_available_gb=$((disk_available / 1024 / 1024))
    if [ "$disk_available" -lt 2097152 ]; then # 2GB in KB
        log_warning "根目录可用空间不足2GB (当前: ${disk_available_gb}GB)"
    else
        log_success "磁盘空间检查通过 (可用: ${disk_available_gb}GB)"
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
        error_exit "Node.js安装失败"
    fi
    
    if ! command -v npm >/dev/null 2>&1; then
        error_exit "npm安装失败"
    fi
    
    log_success "Node.js验证通过: $(node --version), npm: $(npm --version)"
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
            libpangocairo-1.0-0 \
            libatk1.0-0 \
            libcairo-gobject2
            
    elif [ "$OS" = "centos" ] || [ "$OS" = "aliyun" ] || [ "$OS" = "fedora" ]; then
        sudo $PKG_MANAGER update -y
        
        if [ "$OS" = "centos" ] || [ "$OS" = "aliyun" ]; then
            sudo $PKG_MANAGER groupinstall -y "Development Tools"
            # EPEL已在前面的步骤中处理
        fi
        
        # 基础工具和开发环境
        sudo $PKG_MANAGER install -y \
            git \
            curl \
            wget \
            unzip \
            python3 \
            python3-pip \
            liberation-fonts \
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
            libgcc \
            nss \
            nspr \
            dbus-glib \
            libXtst \
            xorg-x11-server-Xvfb
        
        # 针对阿里云Linux的特殊处理
        if [ "$OS" = "aliyun" ]; then
            log_info "安装阿里云Linux特殊依赖..."
            
            # 安装X11屏保扩展库 (libXss的替代)
            sudo $PKG_MANAGER install -y libXScrnSaver libXScrnSaver-devel || true
            
            # 安装中文字体 (noto-fonts-cjk的替代)
            sudo $PKG_MANAGER install -y \
                google-noto-fonts-common \
                google-noto-sans-cjk-fonts \
                google-noto-serif-cjk-fonts \
                wqy-microhei-fonts \
                wqy-zenhei-fonts || {
                log_warning "中文字体安装失败，使用基础字体"
                sudo $PKG_MANAGER install -y \
                    dejavu-fonts-common \
                    dejavu-sans-fonts \
                    dejavu-serif-fonts || true
            }
            
            # 安装其他Puppeteer依赖
            sudo $PKG_MANAGER install -y \
                libxkbcommon \
                libgbm || true
                
        else
            # 标准CentOS/RHEL包
            sudo $PKG_MANAGER install -y \
                libXss \
                google-noto-cjk-fonts || true
        fi
    fi
    
    # 验证关键依赖
    if ! command -v git >/dev/null 2>&1; then
        error_exit "git安装失败"
    fi
    
    log_success "系统依赖安装完成"
}

# 安装Google Chrome
install_chrome() {
    log_info "安装Google Chrome浏览器..."
    
    if command -v google-chrome >/dev/null 2>&1; then
        log_success "Chrome已安装: $(google-chrome --version 2>/dev/null | head -1 || echo 'Unknown version')"
        return
    fi
    
    if [ "$OS" = "ubuntu" ]; then
        # Ubuntu安装
        wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
        echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
        sudo $PKG_MANAGER update
        sudo $PKG_MANAGER install -y google-chrome-stable
        
    elif [ "$OS" = "centos" ] || [ "$OS" = "aliyun" ] || [ "$OS" = "fedora" ]; then
        # 添加Google Chrome yum仓库
        cat > /tmp/google-chrome.repo << 'EOF'
[google-chrome]
name=google-chrome
baseurl=http://dl.google.com/linux/chrome/rpm/stable/x86_64
enabled=1
gpgcheck=1
gpgkey=https://dl.google.com/linux/linux_signing_key.pub
EOF
        sudo mv /tmp/google-chrome.repo /etc/yum.repos.d/
        
        # 导入GPG密钥
        sudo rpm --import https://dl.google.com/linux/linux_signing_key.pub 2>/dev/null || true
        
        # 尝试从仓库安装
        if sudo $PKG_MANAGER install -y google-chrome-stable; then
            log_success "Chrome从仓库安装成功"
        else
            log_warning "仓库安装失败，尝试直接下载安装..."
            
            # 直接下载RPM包安装
            cd /tmp
            if wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm; then
                if sudo $PKG_MANAGER localinstall -y google-chrome-stable_current_x86_64.rpm; then
                    log_success "Chrome直接安装成功"
                else
                    log_warning "Chrome安装失败，尝试安装Chromium作为替代..."
                    sudo $PKG_MANAGER install -y chromium || log_warning "Chromium安装也失败"
                fi
            else
                log_warning "Chrome下载失败，尝试安装Chromium..."
                sudo $PKG_MANAGER install -y chromium || log_warning "Chromium安装也失败"
            fi
        fi
    fi
    
    # 验证安装结果
    if command -v google-chrome >/dev/null 2>&1; then
        log_success "Chrome安装完成: $(google-chrome --version 2>/dev/null | head -1 || echo 'Unknown version')"
    elif command -v chromium >/dev/null 2>&1; then
        log_success "Chromium安装完成: $(chromium --version 2>/dev/null | head -1 || echo 'Unknown version')"
    elif command -v chromium-browser >/dev/null 2>&1; then
        log_success "Chromium-browser安装完成"
    else
        log_warning "浏览器安装失败，Puppeteer将尝试使用自带的Chromium"
    fi
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
            error_exit "PM2安装失败"
        fi
        
        log_success "PM2安装完成"
    fi
    
    # 设置PM2开机自启 (小心处理)
    log_info "配置PM2开机自启..."
    
    local startup_cmd=$(pm2 startup 2>/dev/null | grep -E '^sudo' | head -1)
    if [ -n "$startup_cmd" ]; then
        eval "$startup_cmd" || log_warning "PM2开机自启配置失败，请稍后手动执行: $startup_cmd"
    fi
}

# 创建项目目录
setup_project() {
    log_info "设置项目目录..."
    
    # 创建项目目录
    if [ ! -d "$PROJECT_DIR" ]; then
        sudo mkdir -p "$PROJECT_DIR"
        sudo chown $USER:$(id -gn $USER) "$PROJECT_DIR"
    fi
    
    # 复制文件到项目目录
    if [ "$PWD" != "$PROJECT_DIR" ]; then
        log_info "复制项目文件到 $PROJECT_DIR"
        
        # 创建临时排除文件列表
        local exclude_dirs=("node_modules" ".git" "logs" "output" "*.log" "*.pid")
        local rsync_excludes=""
        
        for exclude in "${exclude_dirs[@]}"; do
            rsync_excludes="$rsync_excludes --exclude=$exclude"
        done
        
        # 使用rsync复制，避免大文件
        if command -v rsync >/dev/null 2>&1; then
            rsync -av $rsync_excludes . "$PROJECT_DIR/"
        else
            # 手动复制，排除大目录
            find . -maxdepth 1 -type f -exec cp {} "$PROJECT_DIR/" \; 2>/dev/null || true
            for dir in */; do
                if [[ ! "$dir" =~ ^(node_modules|\.git|logs|output)/ ]]; then
                    cp -r "$dir" "$PROJECT_DIR/" 2>/dev/null || true
                fi
            done
        fi
        
        cd "$PROJECT_DIR"
    fi
    
    # 创建必要的目录
    mkdir -p logs output temp
    
    # 设置正确的权限
    chmod 755 "$PROJECT_DIR"
    find "$PROJECT_DIR" -type f -name "*.sh" -exec chmod +x {} \;
    find "$PROJECT_DIR" -type f -name "*.js" -exec chmod +x {} \;
    
    log_success "项目目录设置完成: $PROJECT_DIR"
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

# Puppeteer配置
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
EOF
        log_success "环境配置文件创建完成"
    else
        log_success "环境配置文件已存在"
    fi
}

# 安装项目依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    # 检查package.json
    if [ ! -f "package.json" ]; then
        error_exit "package.json文件不存在"
    fi
    
    # 清理可能的旧依赖
    if [ -d "node_modules" ]; then
        log_info "清理旧的node_modules..."
        rm -rf node_modules
    fi
    
    if [ -f "package-lock.json" ]; then
        rm -f package-lock.json
    fi
    
    # 设置npm配置以提高安装成功率
    npm config set registry https://registry.npmjs.org/
    npm config set timeout 300000
    
    # 安装npm依赖
    log_info "执行npm install..."
    if ! npm install --production --no-audit --no-fund; then
        log_warning "npm install失败，尝试清理缓存后重试..."
        npm cache clean --force
        npm install --production --no-audit --no-fund || error_exit "npm依赖安装失败"
    fi
    
    # 验证关键依赖
    if [ ! -d "node_modules/puppeteer" ]; then
        error_exit "Puppeteer安装失败"
    fi
    
    # 安装Puppeteer的Chromium
    log_info "安装Puppeteer Chrome浏览器..."
    if ! npx puppeteer browsers install chrome; then
        log_warning "Puppeteer Chrome安装失败，将使用系统Chrome"
    fi
    
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
        " 2>/dev/null; then
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
    ls -la logs/ 2>/dev/null || echo "logs目录不存在"
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
    
    # 创建测试脚本
    cat > test.sh << 'EOF'
#!/bin/bash
echo "运行爬虫测试..."
cd /var/www/spider-puppeteer

echo "测试基本功能..."
node scrape.js --inplay false --maxMatches 1 --requestDelay 2000

echo "测试数据库连接..."
node check_database.js 2>/dev/null || echo "数据库连接测试跳过"

echo "测试完成"
EOF
    
    # 创建备份脚本
    cat > backup.sh << 'EOF'
#!/bin/bash
echo "备份爬虫数据..."
cd /var/www/spider-puppeteer

backup_dir="/tmp/spider_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$backup_dir"

# 备份配置文件
cp .env "$backup_dir/" 2>/dev/null || true
cp -r logs "$backup_dir/" 2>/dev/null || true
cp -r output "$backup_dir/" 2>/dev/null || true

# 备份数据库 (如果配置了)
if [ -f "database.js" ]; then
    echo "备份数据库..."
    # 这里可以添加数据库备份逻辑
fi

echo "备份完成: $backup_dir"
EOF
    
    # 设置执行权限
    chmod +x start.sh stop.sh restart.sh status.sh logs.sh update.sh test.sh backup.sh
    
    log_success "管理脚本创建完成"
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
    if ! pm2 start ecosystem.config.js --env production; then
        error_exit "PM2启动失败"
    fi
    
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
        error_exit "服务验证失败"
    fi
    
    # 显示状态
    pm2 status
    echo
    echo "最新日志："
    pm2 logs spider-server --lines 10
}

# 运行部署测试
run_deployment_test() {
    log_info "运行部署测试..."
    
    # 测试Node.js和npm
    log_info "测试Node.js环境..."
    node --version || error_exit "Node.js测试失败"
    npm --version || error_exit "npm测试失败"
    
    # 测试浏览器
    log_info "测试浏览器可用性..."
    if command -v google-chrome >/dev/null 2>&1; then
        google-chrome --version || log_warning "Chrome版本检查失败"
    elif command -v chromium >/dev/null 2>&1; then
        chromium --version || log_warning "Chromium版本检查失败"
    fi
    
    # 测试基本功能
    log_info "测试爬虫基本功能..."
    if timeout 60 node scrape.js --inplay false --maxMatches 1 --requestDelay 2000; then
        log_success "爬虫基本功能测试通过"
    else
        log_warning "爬虫功能测试失败，但部署继续"
    fi
    
    log_success "部署测试完成"
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
WorkingDirectory=$PROJECT_DIR
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

# 显示部署总结
show_deployment_summary() {
    local end_time=$(date +%s)
    local duration=$((end_time - DEPLOY_START_TIME))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    echo ""
    echo "========================================="
    log_success "🎉 部署完成！(耗时: ${minutes}分${seconds}秒)"
    echo "========================================="
    echo ""
    echo "📋 管理命令:"
    echo "  ./start.sh     - 启动服务"
    echo "  ./stop.sh      - 停止服务"
    echo "  ./restart.sh   - 重启服务"
    echo "  ./status.sh    - 查看状态"
    echo "  ./logs.sh      - 查看日志"
    echo "  ./update.sh    - 更新代码"
    echo "  ./test.sh      - 运行测试"
    echo "  ./backup.sh    - 备份数据"
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
    echo "📋 部署日志: $INSTALL_LOG"
    echo ""
    echo "🔗 服务状态检查: ./status.sh"
    echo "📊 监控URL: http://$(hostname -I | awk '{print $1}' 2>/dev/null || echo 'localhost'):3000 (如果启用了Web监控)"
    echo ""
    echo "🔧 故障排除:"
    echo "  - 查看日志: ./logs.sh pm2"
    echo "  - 重启服务: ./restart.sh"
    echo "  - 检查状态: ./status.sh"
    echo "  - 运行测试: ./test.sh"
    echo ""
    echo "✅ 部署成功！服务已启动并运行。"
}

# 主函数
main() {
    echo "========================================="
    echo "🕷️  体育赛事爬虫 - 综合部署脚本 (完整版)"
    echo "========================================="
    
    # 初始化日志
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] 开始部署" > "$INSTALL_LOG"
    
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
    
    # 显示总结
    show_deployment_summary
}

# 错误处理
trap 'error_exit "部署过程中发生未预期的错误"' ERR

# 执行主函数
main "$@" 