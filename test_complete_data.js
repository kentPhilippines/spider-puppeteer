const database = require('./database');
const dataStorage = require('./dataStorage');

async function testCompleteDataSaving() {
  try {
    // 连接数据库
    await database.connectDatabase();
    
    console.log('🧪 测试完整数据保存功能...\n');
    
    // 1. 创建扩展表
    console.log('📋 创建扩展表...');
    await dataStorage.createExtendedTables();
    
    // 2. 测试保存一个完整的比赛数据
    const testMatchData = {
      data: {
        sid: 1,
        vd: 'b',
        mid: 60477737,
        gifMid: 0,
        iid: 3810286,
        tid: 7265,
        cid: 23,
        mids: {
          fmid: 0,
          bmid: 60477737,
          amid: 9498093,
          cmid: 12243081,
          dmid: 0,
          jmid: 0
        },
        tnPriority: 50011,
        tnName: '澳大利亚甲组联赛 - 附加赛',
        streaming: 0,
        inplay: true,
        favorite: false,
        kickoff: 1748066400,
        video: false,
        specialsTournament: false,
        kickoffDT: '2025-05-24 14:00:00',
        nv: false,
        scoreId: '',
        home: { id: 454714, cid: 23, name: '奥克兰', jersey: null },
        away: {
          id: 3067,
          cid: 121,
          name: '墨尔本胜利',
          jersey: {
            base: 'fcfcfc',
            sleeve: 'ffffff',
            style: '',
            styleColor: '',
            shirtType: 'short',
            sleeveDetails: 'd1ef3e'
          }
        },
        count: 183,
        detail: {
          booking: '2-2',
          penaltyShootout: null,
          'ot-ht-cr': '',
          'ot-cr': '',
          'ot-ht-booking': '',
          'ot-2nd-ht-booking': '',
          'ht-score': '0-0',
          'ot-2nd-ht-score': '',
          stoppageTime: null,
          'ht-booking': '2-1',
          score: '0-0',
          'ot-2nd-ht-cr': '',
          'ot-red-card': '',
          clockStopped: 'false',
          '2nd-ht-score': '0-0',
          'ot-yellow-card': '',
          period: '2h',
          '2nd-ht-booking': '0-1',
          'red-card': '0-0',
          ot: '',
          'ot-ht-score': '',
          '2nd-ht-cr': '0-0',
          cr: '3-2',
          'yellow-card': '2-2',
          time: '49:59',
          'ot-booking': '',
          pk: '',
          'ht-cr': '3-2',
          ts: '1748070718923'
        },
        state: '',
        series: '',
        higher: false,
        cr: true,
        ot: false,
        pk: false,
        otcr: false,
        ad: true,
        roundType: 'cup',
        roundName: 'semifinal',
        roundGroup: '',
        roundGroupName: 'semifinal',
        roundNumber: '',
        source: 'tv',
        gifs: [
          { source: 'b', type: 'id', info: '60477737' },
          {
            source: 'S',
            type: 'url',
            info: 'https://df123ua2cjl26.cloudfront.net/#/football?lang=zh&z=60477737&type=2&size=large'
          },
          { source: 'c', type: 'id', info: '12243081' }
        ],
        videos: [
          {
            source: 'A2',
            type: 'url',
            info: 'https://live5.jjmlhs.com/live/60477737_324f728f67cfaea7ba84369b2881f37c_autoChange.m3u8?auth_key=1748084648-0-0-256a47aa896552a5f9c0ddc7312ac39b'
          },
          {
            source: 'A1',
            type: 'url',
            info: 'https://live5.xmqkx.com/live/60477737_324f728f67cfaea7ba84369b2881f37c_autoChange.m3u8?auth_key=1748081032-0-0-92241713ac7e9bdc8aa7b65796d407e2'
          }
        ],
        anchors: [
          {
            houseId: '102591',
            liveStatus: 2,
            visitHistory: 0,
            playStreamAddress: 'https://live5.hengbeixingtech.com/live/102591.flv?txSecret=f7e9ece0e5fb7a0f07467b20b96da6a8&txTime=19425309A74',
            playStreamAddress2: 'https://live5.hengbeixingtech.com/live/102591.m3u8?txSecret=f7e9ece0e5fb7a0f07467b20b96da6a8&txTime=19425309A74',
            userImage: 'https://anchor51.oss-accelerate.aliyuncs.com/business/image/2591/AP89jSLjRsmLbP-V3WLcjw.jpg',
            houseName: '夏天的直播间',
            houseImage: 'https://anchor51.oss-accelerate.aliyuncs.com/business/image/2591/ksm8yefKS9C8K31BCIe3jw.png',
            nickName: '夏天',
            anchorTypeName: '篮球',
            fansCount: 2,
            anchorTitle: '',
            houseIntroduction: '',
            languageType: 'zh',
            vendors: [
              'vd003', 'vd005',
              'vd007', 'vd008',
              'vd009', 'vd010',
              'vd012'
            ]
          }
        ],
        market: {
          '1x2': { a: '3.90', d: '2.40', h: '2.65' },
          'ou': [
            { k: '1/1.5', ov: '1.11', ud: '0.78' },
            { k: '1', ov: '0.67', ud: '1.26' },
            { k: '1.5', ov: '1.49', ud: '0.55' }
          ],
          'ah': [
            { k: '-0/0.5', absK: '-0/0.5', a: '0.76', h: '1.16' },
            { k: '0', absK: '0', a: '1.36', h: '0.63' }
          ]
        },
        countdown: 0,
        name: '奥克兰-vs-墨尔本胜利',
        'red-card': false,
        'otred-card': false
      }
    };
    
    const iid = '3810286';
    
    console.log('💾 保存比赛基本信息...');
    await dataStorage.saveMatchInfo(testMatchData.data);
    
    console.log('💾 保存比赛详情...');
    await dataStorage.saveMatchDetail(iid, testMatchData);
    
    console.log('💾 保存媒体信息...');
    await dataStorage.saveMatchMedia(iid, testMatchData);
    
    console.log('💾 保存扩展信息...');
    await dataStorage.saveMatchExtended(iid, testMatchData);
    
    console.log('💾 保存市场数据...');
    await dataStorage.saveMatchMarket(iid, testMatchData);
    
    // 3. 验证数据保存
    console.log('\n🔍 验证保存的数据...');
    
    // 检查基本信息
    const matchInfo = await database.executeQuery('SELECT * FROM match_info WHERE iid = ?', [iid]);
    console.log('✅ 基本信息:', matchInfo.length > 0 ? '已保存' : '未保存');
    
    // 检查详情
    const matchDetail = await database.executeQuery('SELECT * FROM match_detail WHERE match_id = ?', [iid]);
    console.log('✅ 比赛详情:', matchDetail.length > 0 ? '已保存' : '未保存');
    
    // 检查媒体
    const matchMedia = await database.executeQuery('SELECT * FROM match_media WHERE match_id = ?', [iid]);
    console.log('✅ 媒体信息:', matchMedia.length > 0 ? `已保存 (${matchMedia.length} 条)` : '未保存');
    
    // 检查扩展信息
    const matchExtended = await database.executeQuery('SELECT * FROM match_extended WHERE match_id = ?', [iid]);
    console.log('✅ 扩展信息:', matchExtended.length > 0 ? '已保存' : '未保存');
    
    // 检查市场数据
    const matchMarket = await database.executeQuery('SELECT * FROM match_market WHERE match_id = ?', [iid]);
    console.log('✅ 市场数据:', matchMarket.length > 0 ? `已保存 (${matchMarket.length} 个市场)` : '未保存');
    
    // 4. 显示数据库统计
    console.log('\n📊 数据库统计:');
    await dataStorage.getDatabaseStats();
    
    // 5. 显示保存的数据样本
    console.log('\n📋 保存的数据样本:');
    
    if (matchInfo.length > 0) {
      console.log('\n基本信息样本:');
      console.table(matchInfo[0]);
    }
    
    if (matchDetail.length > 0) {
      console.log('\n详情样本:');
      console.table(matchDetail[0]);
    }
    
    if (matchExtended.length > 0) {
      console.log('\n扩展信息样本:');
      console.log(JSON.stringify(matchExtended[0], null, 2));
    }
    
    if (matchMarket.length > 0) {
      console.log('\n市场数据样本 (前3个):');
      console.table(matchMarket.slice(0, 3));
    }
    
    console.log('\n✅ 完整数据保存测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    // 关闭数据库连接
    await database.closeDatabase();
  }
}

// 运行测试
testCompleteDataSaving(); 