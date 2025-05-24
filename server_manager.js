const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * 服务器管理器 - 同时运行批量获取和实时监控
 */

class ServerManager {
  constructor() {
    this.processes = new Map();
    this.config = {
      // 批量获取配置
      batch: {
        enabled: true,
        interval: 300000, // 5分钟获取一次
        maxMatches: 50,   // 每次最多获取50场
        inplay: false,    // 获取未开始的比赛
        getAllMarketMatches: true,
        requestDelay: 1000
      },
      
      // 实时监控配置
      monitor: {
        enabled: true,
        interval: 30000,     // 30秒监控一次
        duration: 86400000,  // 24小时持续监控
        autoDiscover: true
      },
      
      // 数据库配置
      database: {
        saveToDatabase: true,
        databaseOnly: true
      },
      
      // 日志配置
      logging: {
        logDir: './logs',
        maxLogSize: 50 * 1024 * 1024, // 50MB
        keepDays: 7
      }
    };
    
    this.setupLogging();
    this.setupSignalHandlers();
  }
  
  /**
   * 设置日志目录
   */
  setupLogging() {
    if (!fs.existsSync(this.config.logging.logDir)) {
      fs.mkdirSync(this.config.logging.logDir, { recursive: true });
    }
  }
  
  /**
   * 设置信号处理器
   */
  setupSignalHandlers() {
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGHUP', () => this.restart());
  }
  
  /**
   * 启动批量获取进程
   */
  startBatchProcess() {
    if (!this.config.batch.enabled) {
      this.log('批量获取已禁用');
      return;
    }
    
    this.log('启动批量获取进程...');
    
    const args = [
      'scrape.js',
      '--batchMode', 'true',
      '--inplay', this.config.batch.inplay.toString(),
      '--getAllMarketMatches', this.config.batch.getAllMarketMatches.toString(),
      '--maxMatches', this.config.batch.maxMatches.toString(),
      '--saveToDatabase', this.config.database.saveToDatabase.toString(),
      '--databaseOnly', this.config.database.databaseOnly.toString(),
      '--requestDelay', this.config.batch.requestDelay.toString()
    ];
    
    const batchProcess = spawn('node', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    // 设置日志
    const batchLogFile = path.join(this.config.logging.logDir, 'batch.log');
    const batchLogStream = fs.createWriteStream(batchLogFile, { flags: 'a' });
    
    batchProcess.stdout.pipe(batchLogStream);
    batchProcess.stderr.pipe(batchLogStream);
    
    batchProcess.on('exit', (code, signal) => {
      this.log(`批量获取进程退出: code=${code}, signal=${signal}`);
      this.processes.delete('batch');
      
      // 如果不是手动停止，则重启
      if (code !== 0 && !this.isShuttingDown) {
        this.log('批量获取进程异常退出，5秒后重启...');
        setTimeout(() => this.startBatchProcess(), 5000);
      }
    });
    
    this.processes.set('batch', batchProcess);
    this.log(`批量获取进程已启动 (PID: ${batchProcess.pid})`);
    
    // 设置定时重启批量获取
    this.setupBatchInterval();
  }
  
  /**
   * 设置批量获取定时器
   */
  setupBatchInterval() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    this.batchTimer = setInterval(() => {
      this.log('定时重启批量获取进程...');
      this.restartBatch();
    }, this.config.batch.interval);
  }
  
  /**
   * 启动监控进程
   */
  startMonitorProcess() {
    if (!this.config.monitor.enabled) {
      this.log('实时监控已禁用');
      return;
    }
    
    this.log('启动实时监控进程...');
    
    const args = [
      'scrape.js',
      '--monitorMode', 'true',
      '--monitorInterval', this.config.monitor.interval.toString(),
      '--monitorDuration', this.config.monitor.duration.toString(),
      '--saveToDatabase', this.config.database.saveToDatabase.toString(),
      '--autoDiscoverMatches', this.config.monitor.autoDiscover.toString()
    ];
    
    const monitorProcess = spawn('node', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    // 设置日志
    const monitorLogFile = path.join(this.config.logging.logDir, 'monitor.log');
    const monitorLogStream = fs.createWriteStream(monitorLogFile, { flags: 'a' });
    
    monitorProcess.stdout.pipe(monitorLogStream);
    monitorProcess.stderr.pipe(monitorLogStream);
    
    monitorProcess.on('exit', (code, signal) => {
      this.log(`实时监控进程退出: code=${code}, signal=${signal}`);
      this.processes.delete('monitor');
      
      // 如果不是手动停止，则重启
      if (code !== 0 && !this.isShuttingDown) {
        this.log('实时监控进程异常退出，5秒后重启...');
        setTimeout(() => this.startMonitorProcess(), 5000);
      }
    });
    
    this.processes.set('monitor', monitorProcess);
    this.log(`实时监控进程已启动 (PID: ${monitorProcess.pid})`);
  }
  
  /**
   * 重启批量获取进程
   */
  restartBatch() {
    const batchProcess = this.processes.get('batch');
    if (batchProcess) {
      this.log('停止批量获取进程...');
      batchProcess.kill('SIGTERM');
      
      // 等待进程退出后重启
      setTimeout(() => {
        if (!this.processes.has('batch')) {
          this.startBatchProcess();
        }
      }, 3000);
    } else {
      this.startBatchProcess();
    }
  }
  
  /**
   * 启动所有服务
   */
  start() {
    this.log('=== 体育赛事爬虫服务启动 ===');
    this.log(`配置信息:`);
    this.log(`- 批量获取: ${this.config.batch.enabled ? '启用' : '禁用'} (间隔: ${this.config.batch.interval/1000}秒)`);
    this.log(`- 实时监控: ${this.config.monitor.enabled ? '启用' : '禁用'} (间隔: ${this.config.monitor.interval/1000}秒)`);
    this.log(`- 数据库保存: ${this.config.database.saveToDatabase ? '启用' : '禁用'}`);
    
    // 启动进程
    if (this.config.batch.enabled) {
      this.startBatchProcess();
    }
    
    if (this.config.monitor.enabled) {
      this.startMonitorProcess();
    }
    
    // 状态监控
    this.startHealthCheck();
  }
  
  /**
   * 启动健康检查
   */
  startHealthCheck() {
    this.healthTimer = setInterval(() => {
      const status = {
        timestamp: new Date().toISOString(),
        processes: {
          batch: this.processes.has('batch') ? 'running' : 'stopped',
          monitor: this.processes.has('monitor') ? 'running' : 'stopped'
        },
        uptime: process.uptime()
      };
      
      // 保存状态到文件
      const statusFile = path.join(this.config.logging.logDir, 'status.json');
      fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
      
    }, 60000); // 每分钟检查一次
  }
  
  /**
   * 关闭所有服务
   */
  async shutdown(signal = 'SIGTERM') {
    this.log(`=== 收到信号 ${signal}，开始关闭服务 ===`);
    this.isShuttingDown = true;
    
    // 清理定时器
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
    }
    
    // 停止所有进程
    const shutdownPromises = [];
    
    for (const [name, process] of this.processes) {
      shutdownPromises.push(new Promise((resolve) => {
        this.log(`停止${name}进程 (PID: ${process.pid})...`);
        
        process.on('exit', () => {
          this.log(`${name}进程已停止`);
          resolve();
        });
        
        process.kill('SIGTERM');
        
        // 强制杀死超时的进程
        setTimeout(() => {
          if (!process.killed) {
            this.log(`强制杀死${name}进程`);
            process.kill('SIGKILL');
            resolve();
          }
        }, 10000);
      }));
    }
    
    await Promise.all(shutdownPromises);
    this.log('=== 所有服务已关闭 ===');
    process.exit(0);
  }
  
  /**
   * 重启所有服务
   */
  async restart() {
    this.log('=== 重启所有服务 ===');
    await this.shutdown('RESTART');
    setTimeout(() => this.start(), 2000);
  }
  
  /**
   * 记录日志
   */
  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} [ServerManager] ${message}`;
    
    console.log(logMessage);
    
    // 写入主日志文件
    const mainLogFile = path.join(this.config.logging.logDir, 'server.log');
    fs.appendFileSync(mainLogFile, logMessage + '\n');
  }
  
  /**
   * 获取状态信息
   */
  getStatus() {
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      processes: {
        batch: {
          running: this.processes.has('batch'),
          pid: this.processes.get('batch')?.pid
        },
        monitor: {
          running: this.processes.has('monitor'),
          pid: this.processes.get('monitor')?.pid
        }
      },
      config: this.config
    };
  }
}

// 启动服务器管理器
if (require.main === module) {
  const manager = new ServerManager();
  
  // 处理命令行参数
  const args = process.argv.slice(2);
  
  if (args.includes('--status')) {
    // 显示状态
    try {
      const statusFile = path.join('./logs', 'status.json');
      const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
      console.log(JSON.stringify(status, null, 2));
    } catch (error) {
      console.log('无法读取状态文件');
    }
    process.exit(0);
  }
  
  if (args.includes('--stop')) {
    // 停止服务
    manager.shutdown('MANUAL');
    process.exit(0);
  }
  
  // 启动服务
  manager.start();
}

module.exports = ServerManager; 