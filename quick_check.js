const database = require('./database');

(async () => {
  await database.connectDatabase();
  
  // 查看有扩展数据的比赛
  const extendedMatches = await database.executeQuery('SELECT match_id FROM match_extended ORDER BY id DESC LIMIT 3');
  console.log('有扩展数据的比赛:', extendedMatches.map(m => m.match_id));
  
  // 查看这些比赛的完整数据
  for (const match of extendedMatches) {
    const iid = match.match_id;
    console.log(`\n=== 比赛 ${iid} 的完整数据 ===`);
    
    // 基本信息
    const basic = await database.executeQuery('SELECT name, tn_name, inplay, streaming, video FROM match_info WHERE iid = ?', [iid]);
    console.log('基本信息:', basic[0]);
    
    // 详情
    const detail = await database.executeQuery('SELECT score, period, time, ht_score, cr, ts FROM match_detail WHERE match_id = ?', [iid]);
    console.log('详情:', detail[0]);
    
    // 扩展信息
    const extended = await database.executeQuery('SELECT mid, kickoff_dt, round_type, round_name, source FROM match_extended WHERE match_id = ?', [iid]);
    console.log('扩展:', extended[0]);
    
    // 媒体数量
    const mediaCount = await database.executeQuery('SELECT COUNT(*) as count FROM match_media WHERE match_id = ?', [iid]);
    console.log('媒体数量:', mediaCount[0].count);
    
    // 市场数量
    const marketCount = await database.executeQuery('SELECT COUNT(*) as count FROM match_market WHERE match_id = ?', [iid]);
    console.log('市场数量:', marketCount[0].count);
    
    // 市场类型样本
    const marketTypes = await database.executeQuery('SELECT market_type FROM match_market WHERE match_id = ? LIMIT 5', [iid]);
    console.log('市场类型样本:', marketTypes.map(m => m.market_type).join(', '));
  }
  
  await database.closeDatabase();
})(); 