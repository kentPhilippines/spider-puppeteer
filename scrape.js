const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const database = require('./database');
const dataStorage = require('./dataStorage');

// 定义可配置的参数 (默认值)
const config = {
  // API 参数
  sid: process.env.SID || 1,
  inplay: process.env.INPLAY === 'true' || false,
  date: process.env.DATE || '24h',
  language: process.env.LANGUAGE || 'zh-cn',
  matchId: process.env.MATCH_ID || '', // 比赛ID，用于获取特定比赛详情
  apiType: process.env.API_TYPE || 'auto', // API类型: auto, inplay, upcoming, match-detail, batch, monitor
  
  // 数据库配置
  saveToDatabase: process.env.SAVE_TO_DATABASE === 'true' || false, // 是否保存到数据库
  databaseOnly: process.env.DATABASE_ONLY === 'true' || false, // 仅保存到数据库，不保存文件
  
  // 批量处理配置
  batchMode: process.env.BATCH_MODE === 'true' || false, // 是否启用批量模式
  maxMatches: parseInt(process.env.MAX_MATCHES || 10), // 最大处理比赛数量
  getAllMarketMatches: process.env.GET_ALL_MARKET_MATCHES === 'true' || true, // 是否获取所有有市场信息的比赛
  requestDelay: parseInt(process.env.REQUEST_DELAY || 1000), // 请求间隔(毫秒)
  saveToFile: process.env.SAVE_TO_FILE === 'true' || true, // 是否保存到文件
  outputDir: process.env.OUTPUT_DIR || './output', // 输出目录
  
  // 实时监控配置
  monitorMode: process.env.MONITOR_MODE === 'true' || false, // 是否启用监控模式
  monitorInterval: parseInt(process.env.MONITOR_INTERVAL || 30000), // 监控间隔(毫秒)，默认30秒
  monitorDuration: parseInt(process.env.MONITOR_DURATION || 7200000), // 监控持续时间(毫秒)，默认2小时
  monitorMatches: process.env.MONITOR_MATCHES ? process.env.MONITOR_MATCHES.split(',') : [], // 监控的比赛ID列表
  autoDiscoverMatches: process.env.AUTO_DISCOVER_MATCHES === 'true' || true, // 自动发现进行中的比赛
  
  // 浏览器配置
  headless: process.env.HEADLESS !== 'false',
  userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  
  // 网站配置
  mainSite: process.env.MAIN_SITE || 'https://hg22984.com',
  apiBaseUrl: process.env.API_BASE_URL || 'https://0036jdpm96ugqo29-api.qdzjdlev30201.app',
  
  // 超时配置
  pageTimeout: parseInt(process.env.PAGE_TIMEOUT || 60000),
  cfTimeout: parseInt(process.env.CF_TIMEOUT || 5000)
};

// API常量
const API_ENDPOINTS = {
  INPLAY_URL: '/product/business/sport/tournament/info',
  UPCOMING_URL: '/product/business/sport/tournament/info',
  MATCH_DETAIL_URL: '/product/business/sport/inplay/match',
  PREMATCH_DETAIL_URL: '/product/business/sport/prematch/match'
};

// 解析命令行参数
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace(/^--/, '');
  const value = args[i + 1];
  
  if (key && value !== undefined && config.hasOwnProperty(key)) {
    // 根据参数类型进行转换
    if (typeof config[key] === 'boolean') {
      config[key] = value === 'true';
    } else if (typeof config[key] === 'number') {
      config[key] = parseInt(value);
    } else if (key === 'monitorMatches') {
      config[key] = value.split(',');
    } else {
      config[key] = value;
    }
  }
}

// 如果指定了batch作为apiType，自动启用批量模式
if (config.apiType === 'batch') {
  config.batchMode = true;
}

// 如果指定了monitor作为apiType，自动启用监控模式
if (config.apiType === 'monitor') {
  config.monitorMode = true;
  config.inplay = true; // 监控模式只关注进行中的比赛
}

// 如果启用了数据库保存但设置了databaseOnly，禁用文件保存
if (config.databaseOnly) {
  config.saveToFile = false;
  config.saveToDatabase = true;
}

/**
 * 统一的API调用函数
 * @param {Object} page - Puppeteer页面对象
 * @param {string} apiType - API类型
 * @param {Object} customParams - 自定义参数
 * @returns {Promise<Object>} - API响应数据
 */
async function callSportAPI(page, apiType, customParams = {}) {
  return await page.evaluate(async (params) => {
    let endpoint = '';
    let queryParams = {};
    
    // 根据API类型选择端点和参数
    switch (params.apiType) {
      case 'inplay':
        endpoint = params.endpoints.INPLAY_URL;
        queryParams = {
          sid: params.sid,
          inplay: true,
          date: params.date,
          language: params.language
        };
        break;
        
      case 'upcoming':
        endpoint = params.endpoints.UPCOMING_URL;
        queryParams = {
          sid: params.sid,
          inplay: false,
          date: params.date,
          language: params.language
        };
        break;
        
      case 'match-detail-inplay':
        endpoint = params.endpoints.MATCH_DETAIL_URL;
        queryParams = {
          sid: params.sid,
          iid: params.matchId,
          language: params.language
        };
        break;
        
      case 'match-detail-prematch':
        endpoint = params.endpoints.PREMATCH_DETAIL_URL;
        queryParams = {
          sid: params.sid,
          iid: params.matchId,
          language: params.language
        };
        break;
        
      default: // auto 或 tournament
        endpoint = params.endpoints.UPCOMING_URL;
        queryParams = {
          sid: params.sid,
          inplay: params.inplay,
          date: params.date,
          language: params.language
        };
    }
    
    // 合并自定义参数
    Object.assign(queryParams, params.customParams);
    
    // 构建API URL
    const urlParams = new URLSearchParams();
    Object.keys(queryParams).forEach(key => {
      if (queryParams[key] !== null && queryParams[key] !== '' && queryParams[key] !== undefined) {
        urlParams.append(key, queryParams[key]);
      }
    });
    
    const apiUrl = `${params.apiBaseUrl}${endpoint}?${urlParams.toString()}`;
    console.log(`正在请求: ${apiUrl}`);
    
    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'apptype': '2',
        'browser': 'Safari 16.6',
        'currency': 'CNY',
        'device': 'mobile',
        'devicemode': 'iPhone',
        'origin': params.mainSite,
        'os': 'iOS',
        'referer': `${params.mainSite}/`,
        'screen': '430x932',
        'time-zone': 'GMT+08:00',
      }
    });
    return await res.json();
  }, {
    apiType: apiType,
    sid: config.sid,
    inplay: config.inplay,
    date: config.date,
    language: config.language,
    matchId: config.matchId,
    apiBaseUrl: config.apiBaseUrl,
    mainSite: config.mainSite,
    endpoints: API_ENDPOINTS,
    customParams: customParams
  });
}

/**
 * 从比赛列表中提取比赛信息
 * @param {Object} tournamentData - 比赛列表数据
 * @returns {Array} - 比赛信息数组
 */
function extractMatchesFromTournaments(tournamentData) {
  const matches = [];
  
  if (tournamentData.data && tournamentData.data.tournaments) {
    for (const tournament of tournamentData.data.tournaments) {
      if (tournament.matches && Array.isArray(tournament.matches)) {
        for (const match of tournament.matches) {
          matches.push({
            iid: match.iid,
            sid: match.sid,
            tid: match.tid,
            cid: match.cid,
            inplay: match.inplay,
            name: match.name,
            tournamentName: tournament.name,
            kickoffTime: match.kickoffTime,
            home: match.home,
            away: match.away,
            countdown: match.countdown
          });
        }
      }
    }
  }
  
  return matches;
}

/**
 * 延时函数
 * @param {number} ms - 延时毫秒数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 保存数据到文件
 * @param {Object} data - 要保存的数据
 * @param {string} filename - 文件名
 */
function saveDataToFile(data, filename) {
  if (!config.saveToFile) return;
  
  // 确保输出目录存在
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
  
  const filepath = path.join(config.outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`📁 数据已保存到: ${filepath}`);
}

/**
 * 批量获取比赛详情
 * @param {Object} page - Puppeteer页面对象
 * @param {Array} matches - 比赛列表
 * @returns {Promise<Array>} - 比赛详情数组
 */
async function batchGetMatchDetails(page, matches) {
  const matchDetails = [];
  let targetMatches = [];
  
  if (config.getAllMarketMatches) {
    // 获取所有比赛的详情，然后筛选有市场数据的
    targetMatches = matches;
    console.log(`🔍 将获取所有 ${targetMatches.length} 场比赛的详情，筛选有市场数据的比赛...`);
  } else {
    // 使用传统的限制数量方式
    targetMatches = matches.slice(0, config.maxMatches);
    console.log(`🔍 按配置限制获取前 ${targetMatches.length} 场比赛详情...`);
  }
  
  const totalMatches = targetMatches.length;
  
  if (totalMatches === 0) {
    console.log(`⚠️ 没有找到符合条件的比赛`);
    return matchDetails;
  }
  
  console.log(`🔄 开始批量获取 ${totalMatches} 场比赛的详细信息...`);
  let processedCount = 0;
  let marketMatchCount = 0;
  
  for (let i = 0; i < totalMatches; i++) {
    const match = targetMatches[i];
    const progress = `[${i + 1}/${totalMatches}]`;
    
    try {
      console.log(`${progress} 获取比赛详情: ${match.name} (ID: ${match.iid})`);
      
      // 根据比赛状态选择API类型
      const detailApiType = match.inplay ? 'match-detail-inplay' : 'match-detail-prematch';
      
      // 临时设置matchId
      const originalMatchId = config.matchId;
      config.matchId = match.iid;
      
      const detailResult = await callSportAPI(page, detailApiType);
      
      // 恢复原始matchId
      config.matchId = originalMatchId;
      
      if (detailResult.code === 0 && detailResult.data) {
        // 检查是否有实际的市场数据
        const actualMatchData = detailResult.data.data || detailResult.data;
        const hasActualMarket = actualMatchData.market && Object.keys(actualMatchData.market).length > 0;
        
        if (hasActualMarket || !config.getAllMarketMatches) {
          // 如果有市场数据，或者不是getAllMarketMatches模式，则保存
          const matchDetail = {
            basicInfo: match,
            detailInfo: detailResult.data,
            fetchTime: new Date().toISOString()
          };
          
          matchDetails.push(matchDetail);
          
          if (hasActualMarket) {
            const marketCount = Object.keys(actualMatchData.market).length;
            console.log(`${progress} ✅ 有市场数据 - ${marketCount} 个市场类型`);
            marketMatchCount++;
          } else {
            console.log(`${progress} ✅ 获取成功 - 无市场数据`);
          }
          
          // 保存到数据库（如果启用）
          if (config.saveToDatabase) {
            try {
              await dataStorage.saveCompleteMatchData(match.iid, detailResult.data);
              console.log(`${progress} 💾 完整数据已保存到数据库`);
            } catch (dbError) {
              console.error(`${progress} ⚠️ 数据库保存失败: ${dbError.message}`);
            }
          }
          
          // 保存单个比赛详情文件（如果启用）
          if (config.saveToFile) {
            const filename = `match_${match.iid}_detail.json`;
            saveDataToFile(matchDetail, filename);
          }
        } else {
          console.log(`${progress} ⏭️ 跳过 - 无市场数据`);
        }
        
        processedCount++;
        
      } else {
        console.log(`${progress} ⚠️ 获取失败: ${detailResult.msg || '未知错误'}`);
        if (!config.getAllMarketMatches) {
          matchDetails.push({
            basicInfo: match,
            detailInfo: null,
            error: detailResult.msg || '获取详情失败',
            fetchTime: new Date().toISOString()
          });
        }
      }
      
      // 添加延时避免请求过于频繁
      if (i < totalMatches - 1) {
        await delay(config.requestDelay);
      }
      
      // 显示进度统计
      if ((i + 1) % 10 === 0 || i === totalMatches - 1) {
        console.log(`📊 进度统计: 已处理 ${i + 1}/${totalMatches}, 有市场数据: ${marketMatchCount}`);
      }
      
    } catch (error) {
      console.error(`${progress} ❌ 发生错误:`, error.message);
      if (!config.getAllMarketMatches) {
        matchDetails.push({
          basicInfo: match,
          detailInfo: null,
          error: error.message,
          fetchTime: new Date().toISOString()
        });
      }
    }
  }
  
  console.log(`\n📈 批量获取完成统计:`);
  console.log(`- 总比赛数: ${totalMatches}`);
  console.log(`- 成功获取详情: ${processedCount}`);
  console.log(`- 有市场数据: ${marketMatchCount}`);
  console.log(`- 保存的比赛: ${matchDetails.length}`);
  
  return matchDetails;
}

/**
 * 比较两个比赛状态的差异
 * @param {Object} oldMatch - 旧的比赛数据
 * @param {Object} newMatch - 新的比赛数据
 * @returns {Object} - 变化详情
 */
function compareMatchStates(oldMatch, newMatch) {
  const changes = {
    hasChanges: false,
    scoreChanged: false,
    timeChanged: false,
    periodChanged: false,
    bookingChanged: false,
    detailChanges: {}
  };
  
  if (!oldMatch || !newMatch) return changes;
  
  // 监控模式中detailInfo直接是API返回的data，需要读取data.detail
  const oldDetail = oldMatch.detailInfo?.data?.detail || {};
  const newDetail = newMatch.detailInfo?.data?.detail || {};
  
  // 检查比分变化
  if (oldDetail.score !== newDetail.score) {
    changes.hasChanges = true;
    changes.scoreChanged = true;
    changes.detailChanges.score = {
      from: oldDetail.score,
      to: newDetail.score
    };
  }
  
  // 检查时间变化
  if (oldDetail.time !== newDetail.time) {
    changes.hasChanges = true;
    changes.timeChanged = true;
    changes.detailChanges.time = {
      from: oldDetail.time,
      to: newDetail.time
    };
  }
  
  // 检查阶段变化
  if (oldDetail.period !== newDetail.period) {
    changes.hasChanges = true;
    changes.periodChanged = true;
    changes.detailChanges.period = {
      from: oldDetail.period,
      to: newDetail.period
    };
  }
  
  // 检查红黄牌变化
  if (oldDetail.booking !== newDetail.booking) {
    changes.hasChanges = true;
    changes.bookingChanged = true;
    changes.detailChanges.booking = {
      from: oldDetail.booking,
      to: newDetail.booking
    };
  }
  
  return changes;
}

/**
 * 实时监控模式
 * @param {Object} page - Puppeteer页面对象
 * @returns {Promise<void>}
 */
async function startRealTimeMonitoring(page) {
  console.log('🔴 启动实时监控模式');
  console.log(`⏱️ 监控间隔: ${config.monitorInterval / 1000}秒`);
  console.log(`⏳ 监控持续时间: ${config.monitorDuration / 1000 / 60}分钟`);
  
  const startTime = Date.now();
  const monitorData = {
    startTime: new Date().toISOString(),
    config: {
      interval: config.monitorInterval,
      duration: config.monitorDuration,
      targetMatches: config.monitorMatches
    },
    sessions: [],
    summary: {
      totalSessions: 0,
      totalChanges: 0,
      monitoredMatches: new Set()
    }
  };
  
  // 存储上次的比赛状态
  let lastMatchStates = new Map();
  
  let sessionCount = 0;
  
  while (Date.now() - startTime < config.monitorDuration) {
    sessionCount++;
    const sessionStart = Date.now();
    console.log(`\n🔄 监控会话 #${sessionCount} - ${new Date().toLocaleString()}`);
    
    try {
      // 获取当前进行中的比赛
      const tournamentData = await callSportAPI(page, 'inplay');
      
      if (tournamentData.code !== 0) {
        console.log('⚠️ 获取比赛列表失败，跳过本次监控');
        await delay(config.monitorInterval);
        continue;
      }
      
      const allMatches = extractMatchesFromTournaments(tournamentData);
      console.log(`📊 发现 ${allMatches.length} 场进行中的比赛`);
      
      // 确定要监控的比赛
      let matchesToMonitor = allMatches;
      if (config.monitorMatches.length > 0) {
        matchesToMonitor = allMatches.filter(match => 
          config.monitorMatches.includes(match.iid.toString())
        );
        console.log(`🎯 根据配置筛选出 ${matchesToMonitor.length} 场比赛进行监控`);
      }
      
      const sessionData = {
        sessionId: sessionCount,
        timestamp: new Date().toISOString(),
        monitoredMatches: [],
        changes: [],
        duration: 0
      };
      
      // 逐个获取比赛详情并检查变化
      for (const match of matchesToMonitor) {
        try {
          console.log(`🔍 监控比赛: ${match.name} (ID: ${match.iid})`);
          
          // 获取比赛详情
          const originalMatchId = config.matchId;
          config.matchId = match.iid;
          const detailResult = await callSportAPI(page, 'match-detail-inplay');
          config.matchId = originalMatchId;
          
          if (detailResult.code === 0 && detailResult.data) {
            const currentMatchData = {
              basicInfo: match,
              detailInfo: detailResult.data,
              fetchTime: new Date().toISOString()
            };
            
            // 与上次状态比较
            const matchKey = match.iid.toString();
            const lastState = lastMatchStates.get(matchKey);
            const changes = compareMatchStates(lastState, currentMatchData);
            
            sessionData.monitoredMatches.push({
              matchId: match.iid,
              matchName: match.name,
              currentState: {
                score: detailResult.data.data?.detail?.score || 'N/A',
                time: detailResult.data.data?.detail?.time || 'N/A',
                period: detailResult.data.data?.detail?.period || 'N/A'
              },
              hasChanges: changes.hasChanges
            });
            
            if (changes.hasChanges) {
              console.log(`🚨 发现变化: ${match.name}`);
              if (changes.scoreChanged) {
                console.log(`  ⚽ 比分: ${changes.detailChanges.score.from} → ${changes.detailChanges.score.to}`);
              }
              if (changes.timeChanged) {
                console.log(`  ⏰ 时间: ${changes.detailChanges.time.from} → ${changes.detailChanges.time.to}`);
              }
              if (changes.periodChanged) {
                console.log(`  📊 阶段: ${changes.detailChanges.period.from} → ${changes.detailChanges.period.to}`);
              }
              
              sessionData.changes.push({
                matchId: match.iid,
                matchName: match.name,
                changes: changes.detailChanges,
                timestamp: new Date().toISOString()
              });
              
              monitorData.summary.totalChanges++;
            }
            
            // 更新状态
            lastMatchStates.set(matchKey, currentMatchData);
            monitorData.summary.monitoredMatches.add(matchKey);
            
          } else {
            console.log(`⚠️ 获取 ${match.name} 详情失败`);
          }
          
          // 添加请求间隔
          await delay(config.requestDelay);
          
        } catch (error) {
          console.error(`❌ 监控比赛 ${match.name} 时发生错误:`, error.message);
        }
      }
      
      sessionData.duration = Date.now() - sessionStart;
      monitorData.sessions.push(sessionData);
      monitorData.summary.totalSessions = sessionCount;
      
      // 保存到数据库（如果启用）
      if (config.saveToDatabase) {
        try {
          await dataStorage.saveMonitorSession(sessionData);
        } catch (dbError) {
          console.error(`⚠️ 监控数据库保存失败: ${dbError.message}`);
        }
      }
      
      // 保存监控数据文件（如果启用）
      if (config.saveToFile) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        saveDataToFile(monitorData, `monitor_session_${timestamp}.json`);
      }
      
      console.log(`✅ 会话 #${sessionCount} 完成，耗时 ${sessionData.duration}ms`);
      console.log(`📈 发现 ${sessionData.changes.length} 个变化`);
      
    } catch (error) {
      console.error(`❌ 监控会话 #${sessionCount} 发生错误:`, error.message);
    }
    
    // 等待下次监控
    console.log(`⏳ 等待 ${config.monitorInterval / 1000}秒后进行下次监控...`);
    await delay(config.monitorInterval);
  }
  
  // 生成最终监控报告
  const finalReport = {
    ...monitorData,
    endTime: new Date().toISOString(),
    summary: {
      ...monitorData.summary,
      totalDuration: Date.now() - startTime,
      averageSessionDuration: monitorData.sessions.reduce((sum, s) => sum + s.duration, 0) / monitorData.sessions.length,
      monitoredMatchesCount: monitorData.summary.monitoredMatches.size,
      changesPerSession: monitorData.summary.totalChanges / monitorData.summary.totalSessions
    }
  };
  
  const reportTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  saveDataToFile(finalReport, `monitor_report_${reportTimestamp}.json`);
  
  console.log('\n📋 监控完成总结:');
  console.log(`- 监控时长: ${finalReport.summary.totalDuration / 1000 / 60} 分钟`);
  console.log(`- 监控会话: ${finalReport.summary.totalSessions} 次`);
  console.log(`- 监控比赛: ${finalReport.summary.monitoredMatchesCount} 场`);
  console.log(`- 发现变化: ${finalReport.summary.totalChanges} 次`);
  console.log(`- 平均每会话变化: ${finalReport.summary.changesPerSession.toFixed(2)} 次`);
}

// 主函数
(async () => {
  let dbConnected = false;
  
  try {
    // 连接数据库（如果启用）
    if (config.saveToDatabase) {
      console.log('🔗 连接数据库...');
      await database.connectDatabase();
      dbConnected = true;
      console.log('✅ 数据库连接成功');
    }
    
    // 启动浏览器
    const browser = await puppeteer.launch({ 
      headless: config.headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
    const page = await browser.newPage();

    // 设置浏览器特征
    await page.setUserAgent(config.userAgent);

    // 访问主站页面，完成 Cloudflare JS 校验
    console.log(`🔐 正在加载主页 ${config.mainSite} 以通过 Cloudflare 验证...`);
    await page.goto(config.mainSite, {
      waitUntil: 'networkidle2',
      timeout: config.pageTimeout,
    });

    // 等待验证通过
    console.log(`⏳ 等待 ${config.cfTimeout}ms 以确保通过 Cloudflare 验证...`);
    await new Promise(resolve => setTimeout(resolve, config.cfTimeout));

    if (config.monitorMode) {
      // 实时监控模式
      await startRealTimeMonitoring(page);
      
    } else if (config.batchMode) {
      // 批量模式：先获取比赛列表，再获取详情
      console.log('🚀 启用批量模式');
      
      // 1. 获取比赛列表
      const listApiType = config.inplay ? 'inplay' : 'upcoming';
      const description = config.inplay ? '进行中的比赛' : '即将开始的比赛';
      
      console.log(`📥 正在获取${description}列表...`);
      const tournamentData = await callSportAPI(page, listApiType);
      
      if (tournamentData.code !== 0) {
        throw new Error(`获取比赛列表失败: ${tournamentData.msg}`);
      }
      
      // 保存比赛列表文件
      if (config.saveToFile) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        saveDataToFile(tournamentData, `tournaments_${timestamp}.json`);
      }
      
      // 2. 提取比赛信息
      const matches = extractMatchesFromTournaments(tournamentData);
      console.log(`📊 发现 ${matches.length} 场比赛`);
      
      if (matches.length === 0) {
        console.log('⚠️ 没有找到比赛数据');
        await browser.close();
        return;
      }
      
      // 3. 保存比赛基本信息到数据库
      if (config.saveToDatabase) {
        console.log('💾 保存比赛列表到数据库...');
        await dataStorage.batchSaveMatches(matches);
      }
      
      // 保存比赛基本信息文件
      if (config.saveToFile) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        saveDataToFile(matches, `matches_basic_${timestamp}.json`);
      }
      
      // 4. 批量获取比赛详情
      const matchDetails = await batchGetMatchDetails(page, matches);
      
      // 5. 保存完整的比赛详情
      const finalData = {
        summary: {
          totalMatches: matches.length,
          processedMatches: matchDetails.length,
          successCount: matchDetails.filter(m => m.detailInfo !== null).length,
          errorCount: matchDetails.filter(m => m.detailInfo === null).length,
          fetchTime: new Date().toISOString(),
          savedToDatabase: config.saveToDatabase
        },
        tournaments: tournamentData.data,
        matchDetails: matchDetails
      };
      
      // 保存完整数据文件
      if (config.saveToFile) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        saveDataToFile(finalData, `complete_data_${timestamp}.json`);
      }
      
      console.log('\n📈 批量处理完成统计:');
      console.log(`- 总比赛数: ${finalData.summary.totalMatches}`);
      console.log(`- 处理比赛数: ${finalData.summary.processedMatches}`);
      console.log(`- 成功获取详情: ${finalData.summary.successCount}`);
      console.log(`- 获取失败: ${finalData.summary.errorCount}`);
      console.log(`- 已保存到数据库: ${finalData.summary.savedToDatabase ? '是' : '否'}`);
      
      // 显示数据库统计（如果连接了数据库）
      if (config.saveToDatabase) {
        console.log('\n📊 数据库统计:');
        await dataStorage.getDatabaseStats();
      }
      
    } else {
      // 单一模式：原有功能
      let result;
      let apiDescription = '';
      
      // 根据配置选择API调用
      if (config.matchId) {
        // 获取比赛详情
        const detailType = config.inplay ? 'match-detail-inplay' : 'match-detail-prematch';
        apiDescription = config.inplay ? '进行中比赛详情' : '未开始比赛详情';
        console.log(`📥 正在获取${apiDescription}，比赛ID: ${config.matchId}...`);
        result = await callSportAPI(page, detailType);
        
        // 保存到数据库（如果启用）
        if (config.saveToDatabase && result.code === 0) {
          try {
            await dataStorage.saveCompleteMatchData(config.matchId, result.data);
            console.log('✅ 完整数据已保存到数据库');
          } catch (dbError) {
            console.error('⚠️ 数据库保存失败:', dbError.message);
          }
        }
        
      } else {
        // 获取比赛列表
        switch (config.apiType) {
          case 'inplay':
            apiDescription = '进行中的比赛列表';
            console.log(`📥 正在获取${apiDescription}...`);
            result = await callSportAPI(page, 'inplay');
            break;
          case 'upcoming':
            apiDescription = '即将开始的比赛列表';
            console.log(`📥 正在获取${apiDescription}...`);
            result = await callSportAPI(page, 'upcoming');
            break;
          default:
            // 自动选择
            apiDescription = config.inplay ? '进行中的比赛列表' : '即将开始的比赛列表';
            console.log(`📥 正在获取${apiDescription}...`);
            result = await callSportAPI(page, 'auto');
        }
        
        // 保存比赛列表到数据库（如果启用）
        if (config.saveToDatabase && result.code === 0) {
          try {
            const matches = extractMatchesFromTournaments(result);
            if (matches.length > 0) {
              await dataStorage.batchSaveMatches(matches);
              console.log('✅ 比赛列表已保存到数据库');
            }
          } catch (dbError) {
            console.error('⚠️ 数据库保存失败:', dbError.message);
          }
        }
      }

      console.log(`✅ ${apiDescription}获取成功`);
      
      // 只在未启用databaseOnly时显示结果
      if (!config.databaseOnly) {
  console.dir(result, { depth: null });
      }
    }

  await browser.close();
    
  } catch (error) {
    console.error('❌ 发生错误:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    if (dbConnected) {
      await database.closeDatabase();
    }
  }
})();
