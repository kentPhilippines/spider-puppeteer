#!/bin/bash

# 快速修复当前的包安装问题

echo "🔧 快速修复阿里云Linux包问题..."

# 1. 先安装Google Chrome
echo "正在安装Google Chrome..."
cat > /tmp/google-chrome.repo << 'EOF'
[google-chrome]
name=google-chrome
baseurl=http://dl.google.com/linux/chrome/rpm/stable/x86_64
enabled=1
gpgcheck=1
gpgkey=https://dl.google.com/linux/linux_signing_key.pub
EOF

sudo mv /tmp/google-chrome.repo /etc/yum.repos.d/
sudo rpm --import https://dl.google.com/linux/linux_signing_key.pub 2>/dev/null || true

if sudo yum install -y google-chrome-stable; then
    echo "✅ Chrome安装成功"
else
    echo "尝试直接下载Chrome..."
    cd /tmp
    wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
    sudo yum localinstall -y google-chrome-stable_current_x86_64.rpm || {
        echo "Chrome安装失败，安装Chromium作为替代..."
        sudo yum install -y chromium
    }
fi

# 2. 安装字体包
echo "正在安装字体包..."
sudo yum install -y \
    google-noto-fonts-common \
    wqy-microhei-fonts \
    dejavu-fonts-common \
    dejavu-sans-fonts || echo "部分字体安装失败，继续..."

# 3. 安装X11库
echo "正在安装X11库..."
sudo yum install -y libXScrnSaver libXScrnSaver-devel || echo "X11库安装失败，继续..."

echo "✅ 快速修复完成！现在可以继续运行部署脚本"

# 验证
echo "验证安装结果..."
if command -v google-chrome >/dev/null 2>&1; then
    echo "✅ Chrome: $(google-chrome --version)"
elif command -v chromium >/dev/null 2>&1; then
    echo "✅ Chromium: $(chromium --version)"
else
    echo "⚠️  浏览器未安装，但Puppeteer可以使用自带的Chromium"
fi

echo "🎉 修复完成！请继续运行: ./deploy_fixed.sh" 