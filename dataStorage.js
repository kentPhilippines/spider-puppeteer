const database = require('./database');

/**
 * 数据存储模块
 * 将爬取的体育赛事数据存储到MySQL数据库
 * 使用现有表结构：match_info、match_detail、match_media
 */

/**
 * 存储比赛基本信息到 match_info 表
 * @param {Object} matchData - 比赛数据
 * @returns {Promise<number>} - 插入的记录ID
 */
async function saveMatchInfo(matchData) {
  try {
    // 处理嵌套的数据结构，确保正确提取市场数据
    const actualMatchData = matchData.data || matchData;
    const iid = actualMatchData.iid?.toString();
    
    if (!iid) {
      throw new Error('比赛ID(iid)不能为空');
    }
    
    // 检查现有记录
    const existingRecords = await database.executeQuery('SELECT id FROM match_info WHERE iid = ?', [iid]);
    
    const data = {
      sid: actualMatchData.sid || null,
      cid: actualMatchData.cid || null,
      tid: actualMatchData.tid || null,
      iid: iid,
      countdown: actualMatchData.countdown || null,
      state: actualMatchData.state || null,
      series: actualMatchData.series !== undefined ? actualMatchData.series : null,
      vd: actualMatchData.vd || null,
      streaming: actualMatchData.streaming || 0,
      inplay: actualMatchData.inplay ? 1 : 0,
      video: actualMatchData.video || 0,
      tn_name: actualMatchData.tournamentName || actualMatchData.tnName || null,
      tn_priority: actualMatchData.tn_priority || actualMatchData.tnPriority || null,
      home_name: actualMatchData.home?.name || actualMatchData.home || null,
      away_name: actualMatchData.away?.name || actualMatchData.away || null,
      name: actualMatchData.name || null,
      kickoff_time: actualMatchData.kickoffTime || actualMatchData.kickoff || null,
      score: actualMatchData.score || null,
      period: actualMatchData.period || null,
      match_time: actualMatchData.time || null,
      home_score: actualMatchData.homeScore || 0,
      away_score: actualMatchData.awayScore || 0,
      
      // 市场数据保存在market字段（JSON格式）- 确保正确提取
      market: actualMatchData.market ? JSON.stringify(actualMatchData.market) : null,
      
      status: actualMatchData.status || 0,
      update_time: new Date()
    };

    let result;
    
    if (existingRecords.length > 1) {
      // 如果有多条重复记录，删除所有旧记录后插入新记录
      console.log(`⚠️ 发现 ${existingRecords.length} 条重复记录 (iid: ${iid})，删除后重新插入`);
      await database.executeQuery('DELETE FROM match_info WHERE iid = ?', [iid]);
      
      // 添加创建时间
      data.create_time = new Date();
      
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);
      
      result = await database.executeQuery(
        `INSERT INTO match_info (${columns}) VALUES (${placeholders})`,
        values
      );
      
    } else if (existingRecords.length === 1) {
      // 如果只有一条记录，更新字段
      const updateFields = Object.keys(data).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(data), iid];
      
      result = await database.executeQuery(
        `UPDATE match_info SET ${updateFields} WHERE iid = ?`,
        values
      );
      result.insertId = existingRecords[0].id;
      
    } else {
      // 如果没有记录，插入新记录
      data.create_time = new Date();
      
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);
      
      result = await database.executeQuery(
        `INSERT INTO match_info (${columns}) VALUES (${placeholders})`,
        values
      );
    }

    console.log(`✅ 比赛信息已保存: ${actualMatchData.name || iid} (ID: ${result.insertId || '更新'})`);
    
    if (actualMatchData.market) {
      const marketCount = Object.keys(actualMatchData.market).length;
      console.log(`   📊 市场数据已保存: ${marketCount} 个市场类型`);
    }
    
    return result.insertId || null;

  } catch (error) {
    console.error(`❌ 保存比赛信息失败 (${matchData.iid}):`, error.message);
    throw error;
  }
}

/**
 * 存储比赛详细信息到 match_detail 表
 * @param {string} iid - 比赛ID
 * @param {Object} detailData - 详细数据
 * @returns {Promise<number>} - 插入的记录ID
 */
async function saveMatchDetail(iid, detailData) {
  try {
    const matchData = detailData.data || detailData;
    const detail = matchData.detail || {};
    
    if (!iid) {
      throw new Error('比赛ID(iid)不能为空');
    }
    
    // 检查现有记录
    const existingRecords = await database.executeQuery('SELECT id FROM match_detail WHERE match_id = ?', [parseInt(iid)]);

    const data = {
      match_id: parseInt(iid),
      score: detail.score || null,
      period: detail.period || null,
      time: detail.time || null,
      ht_score: detail.htScore || detail.ht_score || detail['ht-score'] || null,
      ft_score: detail.ftScore || detail.ft_score || detail['ft-score'] || null,
      set5_score: detail.set5_score || null,
      current_set: detail.current_set || detail.currentSet || null,
      current_game: detail.current_game || detail.currentGame || null,
      current_point: detail.current_point || detail.currentPoint || null,
      serve: detail.serve || null,
      clock_stopped: detail.clockStopped === 'true' || detail.clock_stopped === 1 ? 1 : 0,
      stoppage_time: detail.stoppageTime || detail.stoppage_time || null,
      ts: detail.ts || null,
      cr: detail.cr || null,
      red_card: detail.redCard || detail.red_card || detail['red-card'] || null,
      yellow_card: detail.yellowCard || detail.yellow_card || detail['yellow-card'] || null,
      update_time: new Date()
    };

    let result;
    
    if (existingRecords.length > 1) {
      // 如果有多条重复记录，删除所有旧记录后插入新记录
      console.log(`⚠️ 发现 ${existingRecords.length} 条重复详情记录 (match_id: ${iid})，删除后重新插入`);
      await database.executeQuery('DELETE FROM match_detail WHERE match_id = ?', [parseInt(iid)]);
      
      // 添加创建时间
      data.create_time = new Date();
      
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);
      
      result = await database.executeQuery(
        `INSERT INTO match_detail (${columns}) VALUES (${placeholders})`,
        values
      );
      
    } else if (existingRecords.length === 1) {
      // 如果只有一条记录，更新字段
      const updateFields = Object.keys(data).filter(key => key !== 'match_id').map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(data).slice(1), parseInt(iid)]; // 去掉match_id
      
      result = await database.executeQuery(
        `UPDATE match_detail SET ${updateFields} WHERE match_id = ?`,
        values
      );
      result.insertId = existingRecords[0].id;
      
    } else {
      // 如果没有记录，插入新记录
      data.create_time = new Date();
      
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);
      
      result = await database.executeQuery(
        `INSERT INTO match_detail (${columns}) VALUES (${placeholders})`,
        values
      );
    }

    console.log(`✅ 比赛详情已保存: ${iid} (ID: ${result.insertId || '更新'})`);
    return result.insertId || null;

  } catch (error) {
    console.error(`❌ 保存比赛详情失败 (${iid}):`, error.message);
    throw error;
  }
}

/**
 * 存储比赛媒体信息到 match_media 表
 * @param {string} iid - 比赛ID
 * @param {Object} mediaData - 媒体数据
 * @returns {Promise<number>} - 插入的记录ID
 */
async function saveMatchMedia(iid, mediaData) {
  try {
    const matchData = mediaData.data || mediaData;
    
    if (!iid) {
      throw new Error('比赛ID(iid)不能为空');
    }
    
    let savedCount = 0;

    // 先清除该比赛的所有旧媒体数据，避免重复
    const existingCount = await database.executeQuery('SELECT COUNT(*) as count FROM match_media WHERE match_id = ?', [parseInt(iid)]);
    if (existingCount[0].count > 0) {
      console.log(`🗑️ 清除比赛 ${iid} 的 ${existingCount[0].count} 条旧媒体记录`);
      await database.executeQuery('DELETE FROM match_media WHERE match_id = ?', [parseInt(iid)]);
    }

    // 保存视频流信息
    if (matchData.videos && Array.isArray(matchData.videos)) {
      for (const video of matchData.videos) {
        const data = {
          match_id: parseInt(iid),
          source: video.source || 'unknown',
          type: 'video',
          info: JSON.stringify({
            type: video.type,
            url: video.info,
            source: video.source
          }),
          create_time: new Date()
        };

        const result = await database.executeQuery(
          'INSERT INTO match_media (match_id, source, type, info, create_time) VALUES (?, ?, ?, ?, ?)',
          [data.match_id, data.source, data.type, data.info, data.create_time]
        );
        savedCount++;
      }
    }

    // 保存GIF信息
    if (matchData.gifMid) {
      const data = {
        match_id: parseInt(iid),
        source: 'system',
        type: 'gif',
        info: JSON.stringify({
          gifMid: matchData.gifMid,
          mid: matchData.mid
        }),
        create_time: new Date()
      };

      const result = await database.executeQuery(
        'INSERT INTO match_media (match_id, source, type, info, create_time) VALUES (?, ?, ?, ?, ?)',
        [data.match_id, data.source, data.type, data.info, data.create_time]
      );
      savedCount++;
    }

    // 保存主播信息（如果有）
    if (matchData.anchors && Array.isArray(matchData.anchors)) {
      for (const anchor of matchData.anchors) {
        const data = {
          match_id: parseInt(iid),
          source: anchor.source || 'unknown',
          type: 'anchor',
          info: JSON.stringify(anchor),
          create_time: new Date()
        };

        const result = await database.executeQuery(
          'INSERT INTO match_media (match_id, source, type, info, create_time) VALUES (?, ?, ?, ?, ?)',
          [data.match_id, data.source, data.type, data.info, data.create_time]
        );
        savedCount++;
      }
    }

    console.log(`✅ 媒体信息已保存: ${iid} (${savedCount} 条记录)`);
    return savedCount;

  } catch (error) {
    console.error(`❌ 保存媒体信息失败 (${iid}):`, error.message);
    throw error;
  }
}

/**
 * 保存完整的比赛数据
 * @param {string} iid - 比赛ID
 * @param {Object} completeData - 完整的比赛数据
 * @returns {Promise<Object>} - 保存结果
 */
async function saveCompleteMatchData(iid, completeData) {
  try {
    console.log(`📦 开始保存完整比赛数据: ${iid}`);
    
    const results = {
      matchInfo: null,
      matchDetail: null,
      matchMedia: null,
      errors: []
    };

    // 1. 保存基本信息
    try {
      results.matchInfo = await saveMatchInfo(completeData);
    } catch (error) {
      results.errors.push(`基本信息保存失败: ${error.message}`);
    }

    // 2. 保存详细信息
    try {
      results.matchDetail = await saveMatchDetail(iid, completeData);
    } catch (error) {
      results.errors.push(`详细信息保存失败: ${error.message}`);
    }

    // 3. 保存媒体信息
    try {
      results.matchMedia = await saveMatchMedia(iid, completeData);
    } catch (error) {
      results.errors.push(`媒体信息保存失败: ${error.message}`);
    }

    if (results.errors.length > 0) {
      console.log(`⚠️ 部分数据保存失败: ${results.errors.join(', ')}`);
    } else {
      console.log(`✅ 完整比赛数据保存成功: ${iid}`);
    }

    return results;

  } catch (error) {
    console.error(`❌ 保存完整比赛数据失败 (${iid}):`, error.message);
    throw error;
  }
}

/**
 * 批量保存比赛列表数据
 * @param {Array} matches - 比赛列表
 * @returns {Promise<Array>} - 保存结果
 */
async function batchSaveMatches(matches) {
  const results = [];
  
  console.log(`📋 开始批量保存 ${matches.length} 场比赛信息...`);
  
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    try {
      const result = await saveMatchInfo(match);
      results.push({
        iid: match.iid,
        success: true,
        insertId: result
      });
      
      console.log(`[${i + 1}/${matches.length}] ✅ ${match.name || match.iid}`);
      
    } catch (error) {
      results.push({
        iid: match.iid,
        success: false,
        error: error.message
      });
      
      console.log(`[${i + 1}/${matches.length}] ❌ ${match.name || match.iid}: ${error.message}`);
    }
    
    // 添加小延时避免数据库压力
    if (i < matches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`📊 批量保存完成: 成功 ${successCount}/${matches.length}`);
  
  return results;
}

/**
 * 批量保存比赛详情数据（完整版）
 * @param {Array} matchDetails - 比赛详情列表
 * @returns {Promise<Array>} - 保存结果
 */
async function batchSaveMatchDetails(matchDetails) {
  const results = [];
  
  console.log(`📋 开始批量保存 ${matchDetails.length} 场比赛完整详情...`);
  
  for (let i = 0; i < matchDetails.length; i++) {
    const matchDetail = matchDetails[i];
    const iid = matchDetail.basicInfo?.iid || matchDetail.iid;
    
    try {
      let saveResults = {};
      
      // 保存完整数据
      if (matchDetail.detailInfo) {
        saveResults = await saveCompleteMatchData(iid, matchDetail.detailInfo);
      }
      
      results.push({
        iid: iid,
        success: true,
        ...saveResults
      });
      
      console.log(`[${i + 1}/${matchDetails.length}] ✅ 比赛ID ${iid} (完整数据已保存)`);
      
    } catch (error) {
      results.push({
        iid: iid,
        success: false,
        error: error.message
      });
      
      console.log(`[${i + 1}/${matchDetails.length}] ❌ 比赛ID ${iid}: ${error.message}`);
    }
    
    // 添加小延时避免数据库压力
    if (i < matchDetails.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`📊 批量保存详情完成: 成功 ${successCount}/${matchDetails.length}`);
  
  return results;
}

/**
 * 保存监控会话数据
 * @param {Object} sessionData - 监控会话数据
 * @returns {Promise<void>}
 */
async function saveMonitorSession(sessionData) {
  try {
    console.log(`📊 保存监控会话数据 #${sessionData.sessionId}...`);
    
    // 保存每个监控的比赛状态变化
    for (const match of sessionData.monitoredMatches) {
      if (match.hasChanges) {
        // 查找变化记录并更新数据库
        const changeRecord = sessionData.changes.find(c => c.matchId === match.matchId);
        if (changeRecord) {
          // 构造更新数据
          const updateData = {
            score: match.currentState.score !== 'N/A' ? match.currentState.score : null,
            period: match.currentState.period !== 'N/A' ? match.currentState.period : null,
            time: match.currentState.time !== 'N/A' ? match.currentState.time : null,
            update_time: new Date()
          };
          
          // 更新比赛详情
          const sql = `UPDATE match_detail SET score = ?, period = ?, time = ?, update_time = ? WHERE match_id = ?`;
          await database.executeQuery(sql, [
            updateData.score,
            updateData.period,
            updateData.time,
            updateData.update_time,
            match.matchId
          ]);
          
          console.log(`🔄 更新比赛状态: ${match.matchName} (ID: ${match.matchId})`);
        }
      }
    }
    
    console.log(`✅ 监控会话 #${sessionData.sessionId} 数据保存完成`);
    
  } catch (error) {
    console.error(`❌ 保存监控会话数据失败:`, error.message);
    throw error;
  }
}

/**
 * 获取数据库统计信息
 * @returns {Promise<Object>} - 统计信息
 */
async function getDatabaseStats() {
  try {
    const stats = {};
    
    // 获取比赛总数
    const matchCountResult = await database.executeQuery('SELECT COUNT(*) as count FROM match_info');
    stats.totalMatches = matchCountResult[0]?.count || 0;
    
    // 获取进行中的比赛数
    const inplayCountResult = await database.executeQuery('SELECT COUNT(*) as count FROM match_info WHERE inplay = 1');
    stats.inplayMatches = inplayCountResult[0]?.count || 0;
    
    // 获取有详情的比赛数
    const detailCountResult = await database.executeQuery('SELECT COUNT(DISTINCT match_id) as count FROM match_detail');
    stats.matchesWithDetails = detailCountResult[0]?.count || 0;
    
    // 获取有媒体的比赛数
    const mediaCountResult = await database.executeQuery('SELECT COUNT(DISTINCT match_id) as count FROM match_media');
    stats.matchesWithMedia = mediaCountResult[0]?.count || 0;
    
    // 获取有市场数据的比赛数
    const marketCountResult = await database.executeQuery('SELECT COUNT(*) as count FROM match_info WHERE market IS NOT NULL');
    stats.matchesWithMarket = marketCountResult[0]?.count || 0;
    
    // 获取有扩展信息的比赛数
    const extendedCountResult = await database.executeQuery('SELECT COUNT(DISTINCT match_id) as count FROM match_media WHERE type IN ("extended", "team_info", "detail_extended")');
    stats.matchesWithExtended = extendedCountResult[0]?.count || 0;
    
    // 获取最近更新时间
    const lastUpdateResult = await database.executeQuery('SELECT MAX(update_time) as last_update FROM match_info');
    stats.lastUpdate = lastUpdateResult[0]?.last_update || null;
    
    console.log('📊 数据库统计信息:');
    console.table(stats);
    
    return stats;
    
  } catch (error) {
    console.error('❌ 获取数据库统计失败:', error.message);
    throw error;
  }
}

module.exports = {
  saveMatchInfo,
  saveMatchDetail,
  saveMatchMedia,
  saveCompleteMatchData,
  batchSaveMatches,
  batchSaveMatchDetails,
  saveMonitorSession,
  getDatabaseStats
}; 