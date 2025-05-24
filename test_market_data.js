const puppeteer = require('puppeteer');
const database = require('./database');
const dataStorage = require('./dataStorage');

// API常量
const API_ENDPOINTS = {
  UPCOMING_URL: '/product/business/sport/tournament/info',
  MATCH_DETAIL_URL: '/product/business/sport/inplay/match',
  PREMATCH_DETAIL_URL: '/product/business/sport/prematch/match'
};

const config = {
  sid: 1,
  language: 'zh-cn',
  apiBaseUrl: 'https://0036jdpm96ugqo29-api.qdzjdlev30201.app',
  mainSite: 'https://hg22984.com'
};

/**
 * 统一的API调用函数
 */
async function callSportAPI(page, apiType, customParams = {}) {
  return await page.evaluate(async (params) => {
    let endpoint = '';
    let queryParams = {};
    
    switch (params.apiType) {
      case 'upcoming':
        endpoint = params.endpoints.UPCOMING_URL;
        queryParams = {
          sid: params.sid,
          inplay: false,
          date: '24h',
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
    }
    
    Object.assign(queryParams, params.customParams);
    
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
    language: config.language,
    matchId: customParams.matchId,
    apiBaseUrl: config.apiBaseUrl,
    mainSite: config.mainSite,
    endpoints: API_ENDPOINTS,
    customParams: customParams
  });
}

async function testMarketData() {
  try {
    // 连接数据库
    await database.connectDatabase();
    
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
    
    console.log('🔐 正在通过Cloudflare验证...');
    await page.goto(config.mainSite, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('📥 获取未开始的比赛列表...');
    const tournamentData = await callSportAPI(page, 'upcoming');
    
    if (tournamentData.code !== 0) {
      throw new Error(`获取比赛列表失败: ${tournamentData.msg}`);
    }
    
    // 提取比赛信息
    const matches = [];
    if (tournamentData.data && tournamentData.data.tournaments) {
      for (const tournament of tournamentData.data.tournaments) {
        if (tournament.matches && Array.isArray(tournament.matches)) {
          for (const match of tournament.matches) {
            matches.push({
              iid: match.iid,
              name: match.name,
              inplay: match.inplay
            });
          }
        }
      }
    }
    
    console.log(`📊 发现 ${matches.length} 场未开始的比赛，测试前5场的市场数据...`);
    
    const testMatches = matches.slice(0, 5);
    const results = [];
    
    for (let i = 0; i < testMatches.length; i++) {
      const match = testMatches[i];
      console.log(`\n[${i + 1}/5] 测试比赛: ${match.name} (ID: ${match.iid})`);
      
      try {
        const detailResult = await callSportAPI(page, 'match-detail-prematch', { matchId: match.iid });
        
        if (detailResult.code === 0 && detailResult.data) {
          const actualMatchData = detailResult.data.data || detailResult.data;
          const hasMarket = actualMatchData.market && Object.keys(actualMatchData.market).length > 0;
          
          const result = {
            iid: match.iid,
            name: match.name,
            hasMarket: hasMarket,
            marketCount: hasMarket ? Object.keys(actualMatchData.market).length : 0,
            marketTypes: hasMarket ? Object.keys(actualMatchData.market).slice(0, 3) : []
          };
          
          results.push(result);
          
          if (hasMarket) {
            console.log(`   ✅ 有市场数据 - ${result.marketCount} 个市场类型`);
            console.log(`   📊 市场类型样本: ${result.marketTypes.join(', ')}`);
            
            // 保存到数据库
            await dataStorage.saveCompleteMatchData(match.iid, detailResult.data);
            console.log(`   💾 已保存到数据库`);
          } else {
            console.log(`   ❌ 无市场数据`);
          }
        } else {
          console.log(`   ⚠️ 获取详情失败: ${detailResult.msg || '未知错误'}`);
          results.push({
            iid: match.iid,
            name: match.name,
            hasMarket: false,
            error: detailResult.msg || '获取详情失败'
          });
        }
        
        // 延时
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`   ❌ 请求失败: ${error.message}`);
        results.push({
          iid: match.iid,
          name: match.name,
          hasMarket: false,
          error: error.message
        });
      }
    }
    
    console.log('\n📊 测试结果总结:');
    console.table(results);
    
    const withMarket = results.filter(r => r.hasMarket).length;
    console.log(`\n🎯 结果: ${withMarket}/${results.length} 场比赛有市场数据`);
    
    await browser.close();
    await database.closeDatabase();
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

testMarketData(); 