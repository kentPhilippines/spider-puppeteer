const database = require('./database');

(async () => {
  try {
    await database.connectDatabase();
    console.log('🗑️ 删除扩展表...');
    
    await database.executeQuery('DROP TABLE IF EXISTS match_market');
    console.log('✅ match_market 表已删除');
    
    await database.executeQuery('DROP TABLE IF EXISTS match_extended');  
    console.log('✅ match_extended 表已删除');
    
    await database.closeDatabase();
    console.log('🔌 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 删除失败:', error);
    process.exit(1);
  }
})(); 