#!/bin/bash

# 体育赛事爬虫 - Linux服务器部署脚本

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
            log_success "检测到Ubuntu/Debian系统"
        elif command -v yum >/dev/null 2>&1; then
            OS="centos"
            log_success "检测到CentOS/RHEL系统"
        else
            log_error "不支持的Linux发行版"
            exit 1
        fi
    else
        log_error "不支持的操作系统: $OSTYPE"
        exit 1
    fi
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
}

install_nodejs_force() {
    if [ "$OS" = "ubuntu" ]; then
        # Ubuntu/Debian安装
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [ "$OS" = "centos" ]; then
        # CentOS/RHEL安装
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    fi
    
    log_success "Node.js安装完成: $(node --version)"
}

# 安装系统依赖
install_system_deps() {
    log_info "安装系统依赖..."
    
    if [ "$OS" = "ubuntu" ]; then
        sudo apt-get update
        sudo apt-get install -y \
            git \
            curl \
            wget \
            unzip \
            build-essential \
            python3 \
            python3-pip \
            chromium-browser \
            fonts-liberation \
            libasound2 \
            libatk-bridge2.0-0 \
            libdrm2 \
            libxcomposite1 \
            libxdamage1 \
            libxrandr2 \
            libgbm1 \
            libxss1 \
            libnss3
    elif [ "$OS" = "centos" ]; then
        sudo yum update -y
        sudo yum groupinstall -y "Development Tools"
        sudo yum install -y \
            git \
            curl \
            wget \
            unzip \
            python3 \
            python3-pip \
            chromium \
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
            libXss \
            libgcc \
            nss \
            nspr
    fi
    
    log_success "系统依赖安装完成"
}

# 安装PM2
install_pm2() {
    log_info "检查PM2安装..."
    
    if command -v pm2 >/dev/null 2>&1; then
        log_success "PM2已安装: $(pm2 --version)"
    else
        log_info "安装PM2..."
        npm install -g pm2
        log_success "PM2安装完成"
    fi
    
    # 设置PM2开机自启
    pm2 startup | grep -E '^sudo' | bash || true
}

# 创建项目目录
setup_project() {
    log_info "设置项目目录..."
    
    PROJECT_DIR="/var/www/spider-puppeteer"
    
    # 创建项目目录
    if [ ! -d "$PROJECT_DIR" ]; then
        sudo mkdir -p "$PROJECT_DIR"
        sudo chown $USER:$USER "$PROJECT_DIR"
    fi
    
    # 复制文件到项目目录
    if [ "$PWD" != "$PROJECT_DIR" ]; then
        log_info "复制项目文件到 $PROJECT_DIR"
        cp -r . "$PROJECT_DIR/"
        cd "$PROJECT_DIR"
    fi
    
    # 创建必要的目录
    mkdir -p logs
    mkdir -p output
    
    log_success "项目目录设置完成: $PROJECT_DIR"
}

# 安装项目依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    # 安装npm依赖
    npm install
    
    # 安装Puppeteer的Chromium
    npx puppeteer browsers install chrome
    
    log_success "项目依赖安装完成"
}

# 配置数据库
configure_database() {
    log_info "配置数据库连接..."
    
    # 检查是否有数据库配置文件
    if [ -f "database.js" ]; then
        log_success "数据库配置文件已存在"
    else
        log_warning "数据库配置文件不存在，请手动配置"
    fi
    
    # 测试数据库连接
    log_info "测试数据库连接..."
    if node -e "const db = require('./database'); db.connectDatabase().then(() => { console.log('数据库连接成功'); process.exit(0); }).catch((err) => { console.error('数据库连接失败:', err.message); process.exit(1); })"; then
        log_success "数据库连接测试通过"
    else
        log_error "数据库连接测试失败，请检查配置"
        return 1
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
    else
        log_warning "未检测到防火墙，请手动配置端口3000"
    fi
}

# 启动服务
start_service() {
    log_info "启动爬虫服务..."
    
    # 停止现有进程
    pm2 delete spider-server 2>/dev/null || true
    
    # 启动新进程
    pm2 start ecosystem.config.js --env production
    
    # 保存PM2配置
    pm2 save
    
    log_success "服务启动完成"
    
    # 显示状态
    pm2 status
    pm2 logs spider-server --lines 20
}

# 创建管理脚本
create_management_scripts() {
    log_info "创建管理脚本..."
    
    # 创建启动脚本
    cat > start.sh << 'EOF'
#!/bin/bash
echo "启动爬虫服务..."
pm2 start ecosystem.config.js --env production
pm2 save
EOF
    
    # 创建停止脚本
    cat > stop.sh << 'EOF'
#!/bin/bash
echo "停止爬虫服务..."
pm2 stop spider-server
EOF
    
    # 创建重启脚本
    cat > restart.sh << 'EOF'
#!/bin/bash
echo "重启爬虫服务..."
pm2 restart spider-server
EOF
    
    # 创建状态查看脚本
    cat > status.sh << 'EOF'
#!/bin/bash
echo "=== PM2 状态 ==="
pm2 status
echo ""
echo "=== 服务状态 ==="
node server_manager.js --status
echo ""
echo "=== 最近日志 ==="
pm2 logs spider-server --lines 20
EOF
    
    # 创建日志查看脚本
    cat > logs.sh << 'EOF'
#!/bin/bash
if [ "$1" = "batch" ]; then
    tail -f logs/batch.log
elif [ "$1" = "monitor" ]; then
    tail -f logs/monitor.log
elif [ "$1" = "server" ]; then
    tail -f logs/server.log
else
    echo "使用方法: ./logs.sh [batch|monitor|server]"
    echo "或查看PM2日志: pm2 logs spider-server"
fi
EOF
    
    # 设置执行权限
    chmod +x start.sh stop.sh restart.sh status.sh logs.sh
    
    log_success "管理脚本创建完成"
}

# 主函数
main() {
    echo "========================================="
    echo "🕷️  体育赛事爬虫 - Linux服务器部署"
    echo "========================================="
    
    check_root
    check_os
    install_nodejs
    install_system_deps
    install_pm2
    setup_project
    install_dependencies
    
    # 配置数据库（可选，如果失败继续）
    configure_database || log_warning "数据库配置跳过，请稍后手动配置"
    
    configure_firewall
    create_management_scripts
    start_service
    
    echo ""
    echo "========================================="
    log_success "🎉 部署完成！"
    echo "========================================="
    echo ""
    echo "📋 管理命令:"
    echo "  ./start.sh     - 启动服务"
    echo "  ./stop.sh      - 停止服务"
    echo "  ./restart.sh   - 重启服务"
    echo "  ./status.sh    - 查看状态"
    echo "  ./logs.sh      - 查看日志"
    echo ""
    echo "📊 PM2 命令:"
    echo "  pm2 status                    - 查看进程状态"
    echo "  pm2 logs spider-server        - 查看实时日志"
    echo "  pm2 monit                     - 进程监控"
    echo "  pm2 restart spider-server     - 重启服务"
    echo ""
    echo "📁 项目目录: $PROJECT_DIR"
    echo "📝 日志目录: $PROJECT_DIR/logs"
    echo ""
    echo "🔗 监控URL: http://your-server-ip:3000 (如果启用了Web监控)"
}

# 执行主函数
main "$@" 