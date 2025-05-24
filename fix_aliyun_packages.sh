#!/bin/bash

# 修复阿里云Linux系统包名问题

echo "🔧 修复阿里云Linux包安装问题..."

# 检测系统
if grep -q "Alibaba Cloud Linux" /etc/os-release || grep -q "Aliyun Linux" /etc/os-release; then
    echo "检测到阿里云Linux系统，开始修复包名问题..."
    
    # 1. 安装Google Chrome
    echo "安装Google Chrome浏览器..."
    if ! command -v google-chrome >/dev/null 2>&1; then
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
        sudo rpm --import https://dl.google.com/linux/linux_signing_key.pub
        
        # 安装Chrome
        sudo yum install -y google-chrome-stable || {
            echo "Chrome仓库安装失败，尝试直接下载安装..."
            cd /tmp
            wget https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
            sudo yum localinstall -y google-chrome-stable_current_x86_64.rpm
        }
    else
        echo "Google Chrome已安装"
    fi
    
    # 2. 安装中文字体 (noto-fonts-cjk的替代)
    echo "安装中文字体..."
    sudo yum install -y \
        google-noto-fonts-common \
        google-noto-sans-cjk-fonts \
        google-noto-serif-cjk-fonts \
        wqy-microhei-fonts \
        wqy-zenhei-fonts || {
        echo "标准中文字体安装失败，尝试基础字体..."
        sudo yum install -y \
            liberation-fonts \
            dejavu-fonts-common \
            dejavu-sans-fonts \
            dejavu-serif-fonts
    }
    
    # 3. 安装libXss (X11屏保扩展库)
    echo "安装X11屏保扩展库..."
    sudo yum install -y \
        libXScrnSaver \
        libXScrnSaver-devel \
        xorg-x11-server-Xvfb || {
        echo "X11扩展库安装失败，继续部署..."
    }
    
    # 4. 安装其他可能缺失的依赖
    echo "安装其他Puppeteer依赖..."
    sudo yum install -y \
        gtk3 \
        libdrm \
        libxkbcommon \
        libXcomposite \
        libXdamage \
        libXrandr \
        libgbm \
        libxss \
        libasound2 || {
        echo "部分依赖安装失败，但继续..."
    }
    
    # 5. 安装Chromium作为备选
    echo "尝试安装Chromium作为备选浏览器..."
    sudo yum install -y chromium || {
        echo "Chromium安装失败，Chrome将作为主要浏览器"
    }
    
    echo "✅ 阿里云Linux包修复完成"
    
    # 验证安装
    echo "验证浏览器安装..."
    if command -v google-chrome >/dev/null 2>&1; then
        echo "✅ Google Chrome: $(google-chrome --version)"
    elif command -v chromium-browser >/dev/null 2>&1; then
        echo "✅ Chromium: $(chromium-browser --version)"
    elif command -v chromium >/dev/null 2>&1; then
        echo "✅ Chromium: $(chromium --version)"
    else
        echo "⚠️  警告：没有找到可用的浏览器"
    fi
    
else
    echo "非阿里云Linux系统，跳过特殊修复"
fi

echo "🎉 包修复完成！" 