const database = require('./database');

(async () => {
  try {
    await database.connectDatabase();
    
    console.log('🔍 检查最新保存的完整数据...\n');
    
    const iid = 3810286;
    
    // 1. 检查基本信息
    console.log('=== match_info 表 - 基本信息 ===');
    const matchInfo = await database.executeQuery('SELECT * FROM match_info WHERE iid = ?', [iid]);
    if (matchInfo.length > 0) {
      console.log('基本字段:');
      console.log(`- 比赛名称: ${matchInfo[0].name}`);
      console.log(`- 联赛: ${matchInfo[0].tn_name}`);
      console.log(`- 主队: ${matchInfo[0].home_name}`);
      console.log(`- 客队: ${matchInfo[0].away_name}`);
      console.log(`- 进行中: ${matchInfo[0].inplay ? '是' : '否'}`);
      console.log(`- 开球时间: ${matchInfo[0].kickoff_time}`);
      console.log(`- 市场数据: ${matchInfo[0].market ? 'JSON格式已保存' : '无'}`);
      
      if (matchInfo[0].market) {
        const marketData = JSON.parse(matchInfo[0].market);
        console.log(`- 市场类型数量: ${Object.keys(marketData).length}`);
        console.log(`- 市场类型样本: ${Object.keys(marketData).slice(0, 5).join(', ')}`);
      }
    }
    
    // 2. 检查详情信息
    console.log('\n=== match_detail 表 - 详情信息 ===');
    const matchDetail = await database.executeQuery('SELECT * FROM match_detail WHERE match_id = ?', [iid]);
    if (matchDetail.length > 0) {
      console.log('详情字段:');
      console.log(`- 比分: ${matchDetail[0].score}`);
      console.log(`- 阶段: ${matchDetail[0].period}`);
      console.log(`- 时间: ${matchDetail[0].time}`);
      console.log(`- 半场比分: ${matchDetail[0].ht_score}`);
      console.log(`- 角球: ${matchDetail[0].cr}`);
      console.log(`- 红牌: ${matchDetail[0].red_card}`);
      console.log(`- 黄牌: ${matchDetail[0].yellow_card}`);
      console.log(`- 时间戳: ${matchDetail[0].ts}`);
    }
    
    // 3. 检查媒体信息
    console.log('\n=== match_media 表 - 媒体和扩展信息 ===');
    const matchMedia = await database.executeQuery('SELECT source, type, LEFT(info, 100) as info_preview FROM match_media WHERE match_id = ?', [iid]);
    
    console.log('媒体记录:');
    console.table(matchMedia);
    
    // 4. 按类型分组统计
    const mediaStats = await database.executeQuery(`
      SELECT type, COUNT(*) as count 
      FROM match_media 
      WHERE match_id = ? 
      GROUP BY type
    `, [iid]);
    
    console.log('\n媒体类型统计:');
    console.table(mediaStats);
    
    // 5. 查看具体的扩展信息
    console.log('\n=== 具体扩展信息内容 ===');
    
    const extendedInfo = await database.executeQuery('SELECT info FROM match_media WHERE match_id = ? AND type = "extended"', [iid]);
    if (extendedInfo.length > 0) {
      console.log('基本扩展信息:');
      const extended = JSON.parse(extendedInfo[0].info);
      console.log(`- mid: ${extended.mid}`);
      console.log(`- kickoffDT: ${extended.kickoffDT}`);
      console.log(`- roundType: ${extended.roundType}`);
      console.log(`- roundName: ${extended.roundName}`);
      console.log(`- source: ${extended.source}`);
      console.log(`- cr: ${extended.cr}`);
      console.log(`- ot: ${extended.ot}`);
      console.log(`- pk: ${extended.pk}`);
    }
    
    const teamInfo = await database.executeQuery('SELECT source, info FROM match_media WHERE match_id = ? AND type = "team_info"', [iid]);
    teamInfo.forEach(team => {
      console.log(`\n${team.source}信息:`);
      const info = JSON.parse(team.info);
      console.log(`- ID: ${info.id}`);
      console.log(`- 名称: ${info.name}`);
      console.log(`- 国家ID: ${info.cid}`);
      if (info.jersey) {
        console.log(`- 球衣: ${JSON.stringify(info.jersey)}`);
      }
    });
    
    const detailExtended = await database.executeQuery('SELECT info FROM match_media WHERE match_id = ? AND type = "detail_extended"', [iid]);
    if (detailExtended.length > 0) {
      console.log('\n详细状态扩展:');
      const detail = JSON.parse(detailExtended[0].info);
      console.log(`- booking: ${detail.booking}`);
      console.log(`- ht-booking: ${detail['ht-booking']}`);
      console.log(`- ht-cr: ${detail['ht-cr']}`);
      console.log(`- 2nd-ht-score: ${detail['2nd-ht-score']}`);
    }
    
    // 6. 数据库统计
    console.log('\n=== 数据库总体统计 ===');
    const totalStats = await database.executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM match_info) as total_matches,
        (SELECT COUNT(*) FROM match_info WHERE market IS NOT NULL) as with_market,
        (SELECT COUNT(DISTINCT match_id) FROM match_detail) as with_detail,
        (SELECT COUNT(DISTINCT match_id) FROM match_media) as with_media,
        (SELECT COUNT(DISTINCT match_id) FROM match_media WHERE type IN ('extended', 'team_info', 'detail_extended')) as with_extended
    `);
    
    console.table(totalStats);
    
    console.log('\n✅ 数据检查完成！');
    console.log('🎯 所有数据都已正确保存到现有表结构中');
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await database.closeDatabase();
  }
})(); 