const database = require('./database');

async function checkCompleteData() {
  try {
    // 连接数据库
    await database.connectDatabase();
    
    console.log('🔍 检查完整数据保存情况...\n');
    
    // 1. 查看最新保存的3场比赛的完整数据
    console.log('=== 最新保存的3场比赛完整数据 ===');
    
    const latestMatches = await database.executeQuery(`
      SELECT iid, name, home_name, away_name, tn_name, inplay, streaming, video
      FROM match_info 
      WHERE id > 155966
      ORDER BY id DESC 
      LIMIT 3
    `);
    
    console.log('基本信息:');
    console.table(latestMatches);
    
    // 2. 查看这3场比赛的详情
    const matchIds = latestMatches.map(m => m.iid);
    
    for (const iid of matchIds) {
      console.log(`\n--- 比赛 ${iid} 的完整数据 ---`);
      
      // 基本信息
      const basicInfo = await database.executeQuery('SELECT * FROM match_info WHERE iid = ?', [iid]);
      console.log('基本信息字段数:', Object.keys(basicInfo[0] || {}).length);
      
      // 详情信息
      const detailInfo = await database.executeQuery('SELECT * FROM match_detail WHERE match_id = ?', [iid]);
      console.log('详情信息:', detailInfo.length > 0 ? '已保存' : '未保存');
      if (detailInfo.length > 0) {
        console.log('详情字段:', ['score', 'period', 'time', 'ht_score', 'cr', 'ts'].map(field => 
          `${field}: ${detailInfo[0][field] || 'null'}`
        ).join(', '));
      }
      
      // 媒体信息
      const mediaInfo = await database.executeQuery('SELECT type, source, COUNT(*) as count FROM match_media WHERE match_id = ? GROUP BY type, source', [iid]);
      console.log('媒体信息:', mediaInfo.length > 0 ? `${mediaInfo.length} 种类型` : '未保存');
      if (mediaInfo.length > 0) {
        console.table(mediaInfo);
      }
      
      // 扩展信息
      const extendedInfo = await database.executeQuery('SELECT mid, kickoff_dt, round_type, round_name, cr, ot, pk FROM match_extended WHERE match_id = ?', [iid]);
      console.log('扩展信息:', extendedInfo.length > 0 ? '已保存' : '未保存');
      if (extendedInfo.length > 0) {
        console.log('扩展字段:', Object.entries(extendedInfo[0]).map(([k, v]) => `${k}: ${v}`).join(', '));
      }
      
      // 市场数据
      const marketInfo = await database.executeQuery('SELECT market_type, COUNT(*) as count FROM match_market WHERE match_id = ? GROUP BY market_type LIMIT 5', [iid]);
      console.log('市场数据:', marketInfo.length > 0 ? `${marketInfo.length}+ 种市场` : '未保存');
      if (marketInfo.length > 0) {
        console.log('市场类型样本:', marketInfo.map(m => m.market_type).join(', '));
      }
    }
    
    // 3. 数据完整性对比
    console.log('\n=== 数据完整性对比 ===');
    
    const completenessStats = await database.executeQuery(`
      SELECT 
        'match_info' as table_name,
        COUNT(*) as total_records,
        SUM(CASE WHEN tn_name IS NOT NULL THEN 1 ELSE 0 END) as has_tournament,
        SUM(CASE WHEN kickoff_time IS NOT NULL THEN 1 ELSE 0 END) as has_kickoff,
        SUM(CASE WHEN streaming = 1 THEN 1 ELSE 0 END) as has_streaming,
        SUM(CASE WHEN video = 1 THEN 1 ELSE 0 END) as has_video
      FROM match_info
      WHERE id > 155966
      
      UNION ALL
      
      SELECT 
        'match_detail' as table_name,
        COUNT(*) as total_records,
        SUM(CASE WHEN score IS NOT NULL THEN 1 ELSE 0 END) as has_score,
        SUM(CASE WHEN period IS NOT NULL THEN 1 ELSE 0 END) as has_period,
        SUM(CASE WHEN time IS NOT NULL THEN 1 ELSE 0 END) as has_time,
        SUM(CASE WHEN ts IS NOT NULL THEN 1 ELSE 0 END) as has_timestamp
      FROM match_detail
      WHERE match_id IN (${matchIds.map(() => '?').join(',')})
      
      UNION ALL
      
      SELECT 
        'match_extended' as table_name,
        COUNT(*) as total_records,
        SUM(CASE WHEN mid IS NOT NULL THEN 1 ELSE 0 END) as has_mid,
        SUM(CASE WHEN kickoff_dt IS NOT NULL THEN 1 ELSE 0 END) as has_kickoff_dt,
        SUM(CASE WHEN round_type IS NOT NULL THEN 1 ELSE 0 END) as has_round_type,
        SUM(CASE WHEN home_info IS NOT NULL THEN 1 ELSE 0 END) as has_home_info
      FROM match_extended
      WHERE match_id IN (${matchIds.map(() => '?').join(',')})
      
      UNION ALL
      
      SELECT 
        'match_market' as table_name,
        COUNT(*) as total_records,
        COUNT(DISTINCT match_id) as unique_matches,
        COUNT(DISTINCT market_type) as unique_market_types,
        0 as unused_field
      FROM match_market
      WHERE match_id IN (${matchIds.map(() => '?').join(',')})
    `, [...matchIds, ...matchIds, ...matchIds]);
    
    console.table(completenessStats);
    
    // 4. 与之前数据对比
    console.log('\n=== 新旧数据对比 ===');
    
    const oldDataSample = await database.executeQuery(`
      SELECT 
        'old_data' as type,
        COUNT(*) as total_matches,
        SUM(CASE WHEN score IS NOT NULL THEN 1 ELSE 0 END) as has_score,
        SUM(CASE WHEN period IS NOT NULL THEN 1 ELSE 0 END) as has_period,
        SUM(CASE WHEN tn_name IS NOT NULL THEN 1 ELSE 0 END) as has_tournament
      FROM match_info 
      WHERE id <= 155966
      LIMIT 1
      
      UNION ALL
      
      SELECT 
        'new_data' as type,
        COUNT(*) as total_matches,
        SUM(CASE WHEN score IS NOT NULL THEN 1 ELSE 0 END) as has_score,
        SUM(CASE WHEN period IS NOT NULL THEN 1 ELSE 0 END) as has_period,
        SUM(CASE WHEN tn_name IS NOT NULL THEN 1 ELSE 0 END) as has_tournament
      FROM match_info 
      WHERE id > 155966
    `);
    
    console.table(oldDataSample);
    
    console.log('\n✅ 完整数据检查完成！');
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    // 关闭数据库连接
    await database.closeDatabase();
  }
}

// 运行检查
checkCompleteData(); 