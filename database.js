const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: 'rm-3nsaxs0kq75fk89n5ko.mysql.rds.aliyuncs.com',
  port: 3306,
  user: 'seo_spider_data',
  password: 'rDeHT0MOUigKAMNJtkn3',
  database: 'sports_api',
  timezone: '+08:00',
  charset: 'utf8mb4',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

let connection = null;

/**
 * 连接数据库
 */
async function connectDatabase() {
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('🔗 数据库连接成功');
    return connection;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    throw error;
  }
}

/**
 * 关闭数据库连接
 */
async function closeDatabase() {
  if (connection) {
    await connection.end();
    console.log('🔌 数据库连接已关闭');
  }
}

/**
 * 查看所有表
 */
async function showTables() {
  try {
    const [rows] = await connection.execute('SHOW TABLES');
    console.log('📋 数据库中的表:');
    rows.forEach(row => {
      const tableName = Object.values(row)[0];
      console.log(`  - ${tableName}`);
    });
    return rows.map(row => Object.values(row)[0]);
  } catch (error) {
    console.error('❌ 查看表失败:', error.message);
    throw error;
  }
}

/**
 * 查看表结构
 */
async function describeTable(tableName) {
  try {
    const [rows] = await connection.execute(`DESCRIBE ${tableName}`);
    console.log(`\n📊 表 ${tableName} 的结构:`);
    console.table(rows);
    return rows;
  } catch (error) {
    console.error(`❌ 查看表 ${tableName} 结构失败:`, error.message);
    throw error;
  }
}

/**
 * 执行查询
 */
async function executeQuery(sql, params = []) {
  try {
    const [rows] = await connection.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('❌ 执行查询失败:', error.message);
    console.error('SQL:', sql);
    console.error('参数:', params);
    throw error;
  }
}

/**
 * 批量插入数据
 */
async function batchInsert(tableName, columns, values) {
  try {
    const placeholders = '(' + columns.map(() => '?').join(',') + ')';
    const sql = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES ${placeholders}`;
    
    const [result] = await connection.execute(sql, values);
    console.log(`✅ 向表 ${tableName} 插入数据成功，影响行数: ${result.affectedRows}`);
    return result;
  } catch (error) {
    console.error(`❌ 向表 ${tableName} 插入数据失败:`, error.message);
    console.error('SQL:', `INSERT INTO ${tableName} (${columns.join(',')}) VALUES ...`);
    throw error;
  }
}

/**
 * 插入或更新数据
 */
async function insertOrUpdate(tableName, data, updateColumns = []) {
  try {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(',');
    
    let sql = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`;
    
    if (updateColumns.length > 0) {
      const updatePart = updateColumns.map(col => `${col} = VALUES(${col})`).join(',');
      sql += ` ON DUPLICATE KEY UPDATE ${updatePart}`;
    }
    
    const [result] = await connection.execute(sql, values);
    return result;
  } catch (error) {
    console.error(`❌ 插入或更新表 ${tableName} 数据失败:`, error.message);
    throw error;
  }
}

module.exports = {
  connectDatabase,
  closeDatabase,
  showTables,
  describeTable,
  executeQuery,
  batchInsert,
  insertOrUpdate,
  getConnection: () => connection
}; 