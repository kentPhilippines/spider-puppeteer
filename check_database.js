const database = require('./database');

async function checkDatabaseStructure() {
  try {
    // 连接数据库
    await database.connectDatabase();
    
    // 查看所有表
    const tables = await database.showTables();
    
    // 查看每个表的结构
    for (const table of tables) {
      await database.describeTable(table);
    }
    
  } catch (error) {
    console.error('❌ 检查数据库结构失败:', error);
  } finally {
    // 关闭数据库连接
    await database.closeDatabase();
  }
}

// 运行检查
checkDatabaseStructure(); 