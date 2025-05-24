const database = require('./database');
const dataStorage = require('./dataStorage');

async function testDuplicateHandling() {
  try {
    // 连接数据库
    await database.connectDatabase();
    
    console.log('🧪 测试重复数据处理功能...\n');
    
    const testIid = '9999999'; // 使用一个测试ID
    
    // 1. 清理测试数据
    console.log('🧹 清理测试数据...');
    await database.executeQuery('DELETE FROM match_info WHERE iid = ?', [testIid]);
    await database.executeQuery('DELETE FROM match_detail WHERE match_id = ?', [parseInt(testIid)]);
    await database.executeQuery('DELETE FROM match_media WHERE match_id = ?', [parseInt(testIid)]);
    
    // 2. 第一次插入数据
    console.log('\n📝 第一次插入测试数据...');
    const testData1 = {
      iid: testIid,
      name: '测试比赛A vs 测试比赛B',
      home: { name: '测试队A' },
      away: { name: '测试队B' },
      score: '1-0',
      period: 'ht',
      tnName: '测试联赛',
      inplay: true,
      market: {
        'dc&ou': [{ k: '2.5', 'a-d&ud': '2.00' }],
        'money_line': [{ k: '1', 'a-d&ud': '1.50' }]
      },
      detail: {
        score: '1-0',
        period: 'ht',
        time: '45+2',
        cr: '3-2',
        ts: '1748069577742'
      },
      videos: [{
        source: 'test',
        type: 'stream',
        info: 'http://test.com/stream1'
      }],
      gifMid: 12345
    };
    
    const result1 = await dataStorage.saveCompleteMatchData(testIid, { data: testData1 });
    console.log('第一次插入结果:', result1);
    
    // 3. 检查第一次插入的数据
    console.log('\n🔍 检查第一次插入的数据...');
    const check1 = await checkTestData(testIid);
    console.log(`- match_info: ${check1.matchInfoCount} 条记录`);
    console.log(`- match_detail: ${check1.matchDetailCount} 条记录`);
    console.log(`- match_media: ${check1.matchMediaCount} 条记录`);
    
    // 4. 模拟重复插入（创建重复记录）
    console.log('\n🔄 模拟创建重复记录...');
    await database.executeQuery(`
      INSERT INTO match_info (iid, name, home_name, away_name, score, period, tn_name, inplay, market, create_time) 
      VALUES (?, '重复记录1', '重复队A1', '重复队B1', '0-1', 'ft', '重复联赛1', 0, '{"test": "duplicate1"}', NOW())
    `, [testIid]);
    
    await database.executeQuery(`
      INSERT INTO match_info (iid, name, home_name, away_name, score, period, tn_name, inplay, market, create_time) 
      VALUES (?, '重复记录2', '重复队A2', '重复队B2', '2-1', 'ft', '重复联赛2', 1, '{"test": "duplicate2"}', NOW())
    `, [testIid]);
    
    // 5. 检查重复记录
    console.log('\n🔍 检查重复记录创建结果...');
    const check2 = await checkTestData(testIid);
    console.log(`- match_info: ${check2.matchInfoCount} 条记录 (应该是3条)`);
    
    // 6. 使用更新的数据再次保存（测试重复处理）
    console.log('\n💾 使用新数据保存，测试重复处理...');
    const testData2 = {
      iid: testIid,
      name: '更新后的比赛A vs 更新后的比赛B',
      home: { name: '更新队A' },
      away: { name: '更新队B' },
      score: '2-1',
      period: 'ft',
      tnName: '更新联赛',
      inplay: false,
      market: {
        'dc&ou': [{ k: '3.5', 'a-d&ud': '1.80' }],
        'money_line': [{ k: '1', 'a-d&ud': '2.00' }],
        'handicap': [{ k: '-1', 'a-d&ud': '1.90' }]
      },
      detail: {
        score: '2-1',
        period: 'ft',
        time: '90+4',
        cr: '7-3',
        ts: '1748070000000'
      },
      videos: [{
        source: 'updated',
        type: 'hd_stream',
        info: 'http://test.com/hd_stream'
      }],
      gifMid: 54321
    };
    
    const result2 = await dataStorage.saveCompleteMatchData(testIid, { data: testData2 });
    console.log('重复处理后保存结果:', result2);
    
    // 7. 检查重复处理后的数据
    console.log('\n✅ 检查重复处理后的最终数据...');
    const finalCheck = await checkTestData(testIid);
    console.log(`- match_info: ${finalCheck.matchInfoCount} 条记录 (应该是1条)`);
    console.log(`- match_detail: ${finalCheck.matchDetailCount} 条记录`);
    console.log(`- match_media: ${finalCheck.matchMediaCount} 条记录`);
    
    // 8. 查看最终保存的数据内容
    console.log('\n📋 最终保存的数据内容:');
    const finalData = await getFinalTestData(testIid);
    console.log('比赛信息:');
    console.table([{
      name: finalData.matchInfo?.name,
      home_name: finalData.matchInfo?.home_name,
      away_name: finalData.matchInfo?.away_name,
      score: finalData.matchInfo?.score,
      period: finalData.matchInfo?.period,
      market_types: finalData.matchInfo?.market ? Object.keys(JSON.parse(finalData.matchInfo.market)).length : 0
    }]);
    
    if (finalData.matchDetail) {
      console.log('比赛详情:');
      console.table([{
        score: finalData.matchDetail.score,
        period: finalData.matchDetail.period,
        time: finalData.matchDetail.time,
        cr: finalData.matchDetail.cr
      }]);
    }
    
    console.log(`媒体信息: ${finalData.mediaCount} 条记录`);
    
    // 9. 测试单条记录更新
    console.log('\n🔄 测试单条记录更新功能...');
    const updateData = {
      iid: testIid,
      name: '最终更新的比赛A vs 最终更新的比赛B',
      home: { name: '最终队A' },
      away: { name: '最终队B' },
      score: '3-1',
      period: 'ft',
      time: '90+6',
      market: {
        'final_market': [{ k: 'final', 'a-d&ud': '1.00' }]
      }
    };
    
    const updateResult = await dataStorage.saveMatchInfo(updateData);
    console.log('单条更新结果:', updateResult);
    
    // 10. 检查更新后的数据
    const updateCheck = await getFinalTestData(testIid);
    console.log('更新后的数据:');
    console.table([{
      name: updateCheck.matchInfo?.name,
      score: updateCheck.matchInfo?.score,
      market_types: updateCheck.matchInfo?.market ? Object.keys(JSON.parse(updateCheck.matchInfo.market)).length : 0
    }]);
    
    console.log('\n🎉 重复数据处理测试完成！');
    
    // 清理测试数据
    console.log('\n🧹 清理测试数据...');
    await database.executeQuery('DELETE FROM match_info WHERE iid = ?', [testIid]);
    await database.executeQuery('DELETE FROM match_detail WHERE match_id = ?', [parseInt(testIid)]);
    await database.executeQuery('DELETE FROM match_media WHERE match_id = ?', [parseInt(testIid)]);
    
    await database.closeDatabase();
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

async function checkTestData(iid) {
  const matchInfoCount = await database.executeQuery('SELECT COUNT(*) as count FROM match_info WHERE iid = ?', [iid]);
  const matchDetailCount = await database.executeQuery('SELECT COUNT(*) as count FROM match_detail WHERE match_id = ?', [parseInt(iid)]);
  const matchMediaCount = await database.executeQuery('SELECT COUNT(*) as count FROM match_media WHERE match_id = ?', [parseInt(iid)]);
  
  return {
    matchInfoCount: matchInfoCount[0].count,
    matchDetailCount: matchDetailCount[0].count,
    matchMediaCount: matchMediaCount[0].count
  };
}

async function getFinalTestData(iid) {
  const matchInfo = await database.executeQuery('SELECT * FROM match_info WHERE iid = ?', [iid]);
  const matchDetail = await database.executeQuery('SELECT * FROM match_detail WHERE match_id = ?', [parseInt(iid)]);
  const mediaCount = await database.executeQuery('SELECT COUNT(*) as count FROM match_media WHERE match_id = ?', [parseInt(iid)]);
  
  return {
    matchInfo: matchInfo[0] || null,
    matchDetail: matchDetail[0] || null,
    mediaCount: mediaCount[0].count
  };
}

testDuplicateHandling(); 