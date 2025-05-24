#!/bin/bash

# 恢复部署脚本 - 处理防火墙配置错误后的继续部署
# 用于从comprehensive_deploy.sh中断后继续完成部署

set -e

echo "🔄 恢复部署中断的体育赛事爬虫部署..."
echo "📅 恢复时间: $(date)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 配置防火墙（修复版本）
configure_firewall_safe() {
    log_info "安全配置防火墙..."
    
    local firewall_configured=false
    
    if command -v ufw >/dev/null 2>&1; then
        log_info "检测到UFW防火墙，配置中..."
        
        # 检查UFW状态
        if sudo ufw status 2>/dev/null | grep -q "Status: active"; then
            log_info "UFW已启用，添加规则..."
            if sudo ufw allow ssh 2>/dev/null && sudo ufw allow 3000/tcp 2>/dev/null; then
                log_success "防火墙配置完成 (ufw)"
                firewall_configured=true
            else
                log_warning "UFW规则添加失败，可能权限不足"
            fi
        else
            log_warning "UFW未启用，跳过防火墙配置"
            log_warning "如需启用UFW，请手动执行: sudo ufw enable"
            log_warning "然后添加规则: sudo ufw allow 3000/tcp"
        fi
        
    elif command -v firewall-cmd >/dev/null 2>&1; then
        log_info "检测到firewalld防火墙，配置中..."
        
        # 检查firewalld状态
        if sudo systemctl is-active firewalld >/dev/null 2>&1; then
            log_info "firewalld已启用，添加规则..."
            if sudo firewall-cmd --permanent --add-port=3000/tcp 2>/dev/null && sudo firewall-cmd --reload 2>/dev/null; then
                log_success "防火墙配置完成 (firewalld)"
                firewall_configured=true
            else
                log_warning "firewalld规则添加失败"
            fi
        else
            log_warning "firewalld未运行，跳过防火墙配置"
            log_warning "如需启用firewalld，请手动执行: sudo systemctl start firewalld"
            log_warning "然后添加规则: sudo firewall-cmd --permanent --add-port=3000/tcp && sudo firewall-cmd --reload"
        fi
        
    elif command -v iptables >/dev/null 2>&1; then
        log_info "检测到iptables，配置中..."
        
        # 检查当前规则是否已存在
        if ! sudo iptables -C INPUT -p tcp --dport 3000 -j ACCEPT 2>/dev/null; then
            if sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT 2>/dev/null; then
                log_success "防火墙配置完成 (iptables)"
                log_warning "注意: iptables规则重启后会丢失，如需持久化请配置iptables-persistent"
                firewall_configured=true
            else
                log_warning "iptables规则添加失败"
            fi
        else
            log_success "iptables规则已存在"
            firewall_configured=true
        fi
    fi
    
    if [ "$firewall_configured" = false ]; then
        log_warning "未检测到活跃的防火墙或配置失败"
        log_warning "请手动确保端口3000可访问："
        echo "  Ubuntu/Debian (UFW):  sudo ufw allow 3000/tcp"
        echo "  CentOS/RHEL (firewalld): sudo firewall-cmd --permanent --add-port=3000/tcp && sudo firewall-cmd --reload"
        echo "  通用 (iptables): sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT"
    fi
    
    log_success "防火墙配置检查完成"
}

# 创建管理脚本
create_management_scripts() {
    log_info "创建管理脚本..."
    
    cd "$PROJECT_DIR"
    
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
echo "=== 最近日志 ==="
pm2 logs spider-server --lines 20
EOF
    
    # 创建日志查看脚本
    cat > logs.sh << 'EOF'
#!/bin/bash
cd /var/www/spider-puppeteer

if [ "$1" = "pm2" ]; then
    pm2 logs spider-server
elif [ "$1" = "all" ]; then
    tail -f logs/*.log
else
    echo "使用方法: ./logs.sh [pm2|all]"
    echo ""
    echo "可用日志文件:"
    ls -la logs/ 2>/dev/null || echo "logs目录不存在"
fi
EOF
    
    # 设置执行权限
    chmod +x start.sh stop.sh restart.sh status.sh logs.sh
    
    log_success "管理脚本创建完成"
}

# 启动服务
start_service() {
    log_info "启动爬虫服务..."
    
    cd "$PROJECT_DIR"
    
    # 停止现有进程
    pm2 delete spider-server 2>/dev/null || true
    pm2 kill 2>/dev/null || true
    
    # 等待进程完全停止
    sleep 3
    
    # 启动新进程
    log_info "启动PM2进程..."
    if ! pm2 start ecosystem.config.js --env production; then
        log_error "PM2启动失败，检查配置文件..."
        if [ -f "ecosystem.config.js" ]; then
            log_info "ecosystem.config.js文件存在，显示内容："
            head -10 ecosystem.config.js
        else
            log_error "ecosystem.config.js文件不存在，创建基本配置..."
            cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'spider-server',
    script: 'server_manager.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    log_file: 'logs/combined.log',
    out_file: 'logs/out.log',
    error_file: 'logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    max_memory_restart: '1G'
  }]
};
EOF
            log_info "重新尝试启动..."
            pm2 start ecosystem.config.js --env production
        fi
    fi
    
    # 等待服务启动
    sleep 5
    
    # 保存PM2配置
    pm2 save
    
    # 验证服务状态
    local retry_count=0
    local max_retries=3
    
    while [ $retry_count -lt $max_retries ]; do
        if pm2 list 2>/dev/null | grep -q "spider-server.*online"; then
            log_success "服务启动完成"
            break
        else
            retry_count=$((retry_count + 1))
            log_info "等待服务启动... (尝试 $retry_count/$max_retries)"
            sleep 3
        fi
    done
    
    if [ $retry_count -eq $max_retries ]; then
        log_warning "服务可能启动失败，查看详细信息..."
        pm2 logs spider-server --lines 10 2>/dev/null || true
        pm2 describe spider-server 2>/dev/null || true
    fi
    
    # 显示状态
    pm2 status
}

# 运行基本测试
run_basic_test() {
    log_info "运行基本测试..."
    
    cd "$PROJECT_DIR"
    
    # 测试Node.js环境
    log_info "测试Node.js环境..."
    node --version || log_warning "Node.js版本检查失败"
    npm --version || log_warning "npm版本检查失败"
    
    # 检查关键文件
    if [ -f "scrape.js" ]; then
        log_success "爬虫脚本存在"
        
        # 简单功能测试
        log_info "测试爬虫基本功能..."
        if timeout 30 node scrape.js --help 2>/dev/null; then
            log_success "爬虫脚本运行正常"
        else
            log_warning "爬虫脚本测试失败"
        fi
    else
        log_warning "爬虫脚本不存在"
    fi
    
    log_success "基本测试完成"
}

# 显示恢复部署总结
show_resume_summary() {
    echo ""
    echo "========================================="
    log_success "🎉 恢复部署完成！"
    echo "========================================="
    echo ""
    echo "📋 管理命令:"
    echo "  ./start.sh     - 启动服务"
    echo "  ./stop.sh      - 停止服务"
    echo "  ./restart.sh   - 重启服务"
    echo "  ./status.sh    - 查看状态"
    echo "  ./logs.sh pm2  - 查看PM2日志"
    echo ""
    echo "📊 PM2 命令:"
    echo "  pm2 status                    - 查看进程状态"
    echo "  pm2 logs spider-server        - 查看实时日志"
    echo "  pm2 restart spider-server     - 重启服务"
    echo ""
    echo "📁 项目目录: $PROJECT_DIR"
    echo "📝 部署日志: $INSTALL_LOG"
    echo ""
    echo "🔧 下一步:"
    echo "  1. 检查服务状态: ./status.sh"
    echo "  2. 测试功能: cd $PROJECT_DIR && node scrape.js --help"
    echo "  3. 启动爬虫: cd $PROJECT_DIR && node scrape.js"
    echo ""
    echo "✅ 恢复部署成功！"
}

# 主函数
main() {
    echo "========================================="
    echo "🔄 体育赛事爬虫 - 恢复部署脚本"
    echo "========================================="
    
    # 检查项目目录是否存在
    if [ ! -d "$PROJECT_DIR" ]; then
        log_error "项目目录不存在: $PROJECT_DIR"
        log_error "请先运行完整的comprehensive_deploy.sh脚本"
        exit 1
    fi
    
    # 检查是否有基本文件
    if [ ! -f "$PROJECT_DIR/package.json" ]; then
        log_error "项目文件不完整，请重新运行完整部署脚本"
        exit 1
    fi
    
    log_info "项目目录存在，开始恢复部署..."
    
    # 跳过防火墙配置（用户不需要）
    # configure_firewall_safe
    
    # 创建管理脚本
    create_management_scripts
    
    # 启动服务
    start_service
    
    # 运行基本测试
    run_basic_test
    
    # 显示总结
    show_resume_summary
}

# 执行主函数
main "$@" 