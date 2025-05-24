const database = require('./database');

(async () => {
  try {
    await database.connectDatabase();
    
    console.log('🔍 检查最新记录的市场数据...\n');
    
    // 检查最新的记录
    console.log('=== 最新的比赛记录 ===');
    const latestMatch = await database.executeQuery('SELECT * FROM match_info ORDER BY id DESC LIMIT 1');
    if (latestMatch.length > 0) {
      const match = latestMatch[0];
      console.log(`- ID: ${match.id}`);
      console.log(`- IID: ${match.iid}`);
      console.log(`- 比赛名称: ${match.name}`);
      console.log(`- 市场数据: ${match.market ? 'JSON格式已保存' : '无'}`);
      
      if (match.market) {
        try {
          const marketData = JSON.parse(match.market);
          console.log(`- 市场类型数量: ${Object.keys(marketData).length}`);
          console.log(`- 市场类型样本: ${Object.keys(marketData).slice(0, 5).join(', ')}`);
          
          // 显示一个市场的详细内容
          const firstMarketKey = Object.keys(marketData)[0];
          if (firstMarketKey) {
            console.log(`\n市场样本 [${firstMarketKey}]:`);
            console.log(JSON.stringify(marketData[firstMarketKey].slice(0, 2), null, 2));
          }
        } catch (error) {
          console.log(`- 市场数据解析错误: ${error.message}`);
        }
      }
    }
    
    // 检查iid = 3810286的记录
    console.log('\n=== 比赛ID 3810286 的记录 ===');
    const specificMatch = await database.executeQuery('SELECT * FROM match_info WHERE iid = "3810286" ORDER BY id DESC LIMIT 1');
    if (specificMatch.length > 0) {
      const match = specificMatch[0];
      console.log(`- 数据库ID: ${match.id}`);
      console.log(`- 比赛名称: ${match.name}`);
      console.log(`- 市场数据: ${match.market ? '有数据' : '无数据'}`);
      console.log(`- 更新时间: ${match.update_time}`);
      
      if (match.market) {
        const marketData = JSON.parse(match.market);
        console.log(`- 市场类型数量: ${Object.keys(marketData).length}`);
      }
    } else {
      console.log('未找到该比赛记录');
    }
    
    // 检查有市场数据的比赛数量
    console.log('\n=== 市场数据统计 ===');
    const marketStats = await database.executeQuery(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN market IS NOT NULL THEN 1 END) as with_market,
        COUNT(CASE WHEN market IS NULL THEN 1 END) as without_market
      FROM match_info
    `);
    console.table(marketStats);
    
    // 查看最近5条有市场数据的记录
    console.log('\n=== 最近5条有市场数据的记录 ===');
    const recentWithMarket = await database.executeQuery(`
      SELECT id, iid, name, LEFT(market, 50) as market_preview, update_time 
      FROM match_info 
      WHERE market IS NOT NULL 
      ORDER BY id DESC 
      LIMIT 5
    `);
    console.table(recentWithMarket);
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await database.closeDatabase();
  }
})(); 