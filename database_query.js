const database = require('./database');
const dataStorage = require('./dataStorage');

async function queryDatabaseData() {
  try {
    // 连接数据库
    await database.connectDatabase();
    
    console.log('🔍 查询数据库数据...\n');
    
    // 1. 显示数据库统计信息
    console.log('=== 数据库统计信息 ===');
    await dataStorage.getDatabaseStats();
    
    // 2. 查看最近的比赛信息 (前50条)
    console.log('\n=== 最近保存的比赛信息 (前50条) ===');
    const recentMatches = await database.executeQuery(`
      SELECT iid, name, home_name, away_name, score, period, match_time, inplay, 
             streaming, video, tn_name, market, status, create_time 
      FROM match_info 
      ORDER BY create_time DESC 
      LIMIT 50
    `);
    console.log(`发现 ${recentMatches.length} 条比赛记录`);
    
    // 显示前10条的详细信息
    console.table(recentMatches.slice(0, 10));
    
    // 3. 查看比赛详情 (前50条)
    console.log('\n=== 最近的比赛详情 (前50条) ===');
    const recentDetails = await database.executeQuery(`
      SELECT md.match_id, md.score, md.period, md.time, md.ht_score, md.ft_score,
             md.red_card, md.yellow_card, md.create_time,
             mi.name as match_name
      FROM match_detail md
      LEFT JOIN match_info mi ON md.match_id = mi.iid
      ORDER BY md.create_time DESC
      LIMIT 50
    `);
    console.log(`发现 ${recentDetails.length} 条比赛详情记录`);
    
    // 显示前10条的详细信息
    console.table(recentDetails.slice(0, 10));
    
    // 4. 查看进行中的比赛
    console.log('\n=== 进行中的比赛 (前50条) ===');
    const inplayMatches = await database.executeQuery(`
      SELECT iid, name, home_name, away_name, score, period, match_time, 
             streaming, video, tn_name, market
      FROM match_info 
      WHERE inplay = 1
      ORDER BY create_time DESC
      LIMIT 50
    `);
    console.log(`发现 ${inplayMatches.length} 场进行中的比赛`);
    
    // 显示前10条
    console.table(inplayMatches.slice(0, 10));
    
    // 5. 查看媒体信息
    console.log('\n=== 比赛媒体信息 (前50条) ===');
    const mediaInfo = await database.executeQuery(`
      SELECT mm.match_id, mm.type, mm.source, mm.info, mm.create_time,
             mi.name as match_name
      FROM match_media mm
      LEFT JOIN match_info mi ON mm.match_id = mi.iid
      ORDER BY mm.create_time DESC
      LIMIT 50
    `);
    console.log(`发现 ${mediaInfo.length} 条媒体记录`);
    
    // 显示前5条
    console.table(mediaInfo.slice(0, 5));
    
    // 6. 分析数据完整性
    console.log('\n=== 数据完整性分析 ===');
    
    // 检查字段非空情况
    const fieldAnalysis = await database.executeQuery(`
      SELECT 
        COUNT(*) as total_matches,
        SUM(CASE WHEN score IS NOT NULL THEN 1 ELSE 0 END) as has_score,
        SUM(CASE WHEN period IS NOT NULL THEN 1 ELSE 0 END) as has_period,
        SUM(CASE WHEN match_time IS NOT NULL THEN 1 ELSE 0 END) as has_match_time,
        SUM(CASE WHEN market IS NOT NULL THEN 1 ELSE 0 END) as has_market,
        SUM(CASE WHEN streaming = 1 THEN 1 ELSE 0 END) as has_streaming,
        SUM(CASE WHEN video = 1 THEN 1 ELSE 0 END) as has_video
      FROM match_info
    `);
    
    console.log('match_info 表字段完整性:');
    console.table(fieldAnalysis);
    
    // 检查详情表的字段情况
    const detailFieldAnalysis = await database.executeQuery(`
      SELECT 
        COUNT(*) as total_details,
        SUM(CASE WHEN score IS NOT NULL THEN 1 ELSE 0 END) as has_score,
        SUM(CASE WHEN period IS NOT NULL THEN 1 ELSE 0 END) as has_period,
        SUM(CASE WHEN time IS NOT NULL THEN 1 ELSE 0 END) as has_time,
        SUM(CASE WHEN ht_score IS NOT NULL THEN 1 ELSE 0 END) as has_ht_score,
        SUM(CASE WHEN ft_score IS NOT NULL THEN 1 ELSE 0 END) as has_ft_score,
        SUM(CASE WHEN red_card IS NOT NULL THEN 1 ELSE 0 END) as has_red_card,
        SUM(CASE WHEN yellow_card IS NOT NULL THEN 1 ELSE 0 END) as has_yellow_card
      FROM match_detail
    `);
    
    console.log('match_detail 表字段完整性:');
    console.table(detailFieldAnalysis);
    
    // 7. 查看具体的数据样本
    console.log('\n=== 数据样本分析 ===');
    
    // 获取一个有详情的比赛
    const sampleMatch = await database.executeQuery(`
      SELECT mi.*, md.score as detail_score, md.period as detail_period, 
             md.time as detail_time, md.ht_score, md.ft_score
      FROM match_info mi 
      LEFT JOIN match_detail md ON mi.iid = md.match_id 
      WHERE mi.inplay = 1 
      LIMIT 1
    `);
    
    if (sampleMatch.length > 0) {
      console.log('样本比赛数据结构:');
      console.log(JSON.stringify(sampleMatch[0], null, 2));
    }
    
    // 8. 检查缺失数据
    console.log('\n=== 缺失数据分析 ===');
    
    const missingData = await database.executeQuery(`
      SELECT 
        'match_info 缺少详情' as type,
        COUNT(*) as count
      FROM match_info mi
      LEFT JOIN match_detail md ON mi.iid = md.match_id
      WHERE md.match_id IS NULL
      
      UNION ALL
      
      SELECT 
        'match_info 缺少媒体' as type,
        COUNT(*) as count
      FROM match_info mi
      LEFT JOIN match_media mm ON mi.iid = mm.match_id
      WHERE mm.match_id IS NULL
    `);
    
    console.table(missingData);
    
  } catch (error) {
    console.error('❌ 查询数据库失败:', error);
  } finally {
    // 关闭数据库连接
    await database.closeDatabase();
  }
}

// 运行查询
queryDatabaseData(); 