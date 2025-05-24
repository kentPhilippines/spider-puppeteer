#!/bin/bash

# 修复阿里云服务器EPEL仓库冲突问题

echo "🔧 修复EPEL仓库冲突..."

# 检测系统类型
if grep -q "Alibaba Cloud Linux" /etc/os-release || grep -q "Aliyun Linux" /etc/os-release; then
    echo "检测到阿里云Linux系统"
    
    # 方法1：移除冲突的包并重新安装
    echo "移除冲突的EPEL包..."
    sudo yum remove -y epel-aliyuncs-release epel-release 2>/dev/null || true
    
    # 清理yum缓存
    sudo yum clean all
    
    # 重新安装EPEL
    echo "重新安装EPEL仓库..."
    sudo yum install -y epel-release --allowerasing
    
elif command -v yum >/dev/null 2>&1; then
    # 标准CentOS/RHEL系统
    echo "检测到CentOS/RHEL系统"
    
    # 尝试使用--allowerasing参数
    sudo yum install -y epel-release --allowerasing
    
elif command -v dnf >/dev/null 2>&1; then
    # Fedora系统
    echo "检测到Fedora系统，无需安装EPEL"
    
else
    echo "未检测到yum或dnf包管理器"
    exit 1
fi

echo "✅ EPEL仓库冲突已修复"

# 验证EPEL仓库
echo "验证EPEL仓库状态..."
if command -v yum >/dev/null 2>&1; then
    yum repolist | grep epel || echo "警告：EPEL仓库可能未正确配置"
elif command -v dnf >/dev/null 2>&1; then
    dnf repolist | grep epel || echo "警告：EPEL仓库可能未正确配置"
fi

echo "🎉 修复完成！现在可以继续部署了" 