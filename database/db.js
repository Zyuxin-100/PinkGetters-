const fs = require('fs');
const path = require('path');

// 数据文件目录
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'database.json');

// 确保数据目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 初始化数据结构
const defaultData = {
  users: [],
  categories: [],
  shops: [],
  products: [],
  cart_items: [],
  orders: [],
  order_items: [],
  addresses: [],
  sequences: {
    users: 1,
    categories: 1,
    shops: 1,
    products: 1,
    cart_items: 1,
    orders: 1,
    order_items: 1,
    addresses: 1
  }
};

// 读取数据
function readData() {
  try {
    if (fs.existsSync(dataFile)) {
      const data = fs.readFileSync(dataFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('读取数据文件错误:', error);
  }
  return JSON.parse(JSON.stringify(defaultData)); // 深拷贝
}

// 保存数据
function saveData(data) {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('保存数据文件错误:', error);
    return false;
  }
}

// 数据库操作对象
const db = {
  // 获取下一个ID
  getNextId(tableName) {
    const data = readData();
    const id = data.sequences[tableName] || 1;
    data.sequences[tableName] = id + 1;
    // 延迟保存，避免频繁写入文件
    this._pendingSave = data;
    if (!this._saveTimeout) {
      this._saveTimeout = setTimeout(() => {
        if (this._pendingSave) {
          saveData(this._pendingSave);
          this._pendingSave = null;
        }
        this._saveTimeout = null;
      }, 100);
    }
    return id;
  },

  // 查询所有记录
  all(tableName, condition = null) {
    const data = readData();
    let records = data[tableName] || [];
    
    if (condition) {
      if (typeof condition === 'function') {
        records = records.filter(condition);
      } else if (typeof condition === 'object') {
        records = records.filter(record => {
          return Object.keys(condition).every(key => record[key] === condition[key]);
        });
      }
    }
    
    return records;
  },

  // 查询单条记录
  get(tableName, condition) {
    const records = this.all(tableName, condition);
    return records.length > 0 ? records[0] : null;
  },

  // 插入记录
  insert(tableName, record) {
    const data = readData();

    if (!data[tableName]) {
      data[tableName] = [];
    }

    const nextId = data.sequences && data.sequences[tableName]
      ? data.sequences[tableName]
      : 1;

    const newRecord = {
      ...record,
      id: nextId,
      created_at: record.created_at || new Date().toISOString()
    };

    // 更新自增序列
    if (!data.sequences) data.sequences = {};
    data.sequences[tableName] = nextId + 1;
    
    data[tableName].push(newRecord);
    saveData(data);
    return newRecord;
  },

  // 更新记录
  update(tableName, id, updates) {
    const data = readData();
    const records = data[tableName] || [];
    const index = records.findIndex(r => r.id === id);
    
    if (index !== -1) {
      records[index] = { ...records[index], ...updates };
      saveData(data);
      return records[index];
    }
    
    return null;
  },

  // 删除记录
  delete(tableName, condition) {
    const data = readData();
    const records = data[tableName] || [];
    
    let filtered;
    if (typeof condition === 'function') {
      filtered = records.filter(r => !condition(r));
    } else if (typeof condition === 'object') {
      filtered = records.filter(record => {
        return !Object.keys(condition).every(key => record[key] === condition[key]);
      });
    } else if (typeof condition === 'number') {
      filtered = records.filter(r => r.id !== condition);
    } else {
      return false;
    }
    
    data[tableName] = filtered;
    return saveData(data);
  },

  // 执行查询（兼容SQLite语法）
  prepare(sql) {
    return {
      get(...params) {
        // 简单的SQL解析（仅支持基本查询）
        if (sql.includes('SELECT') && sql.includes('FROM')) {
          const tableMatch = sql.match(/FROM\s+(\w+)/i);
          const whereMatch = sql.match(/WHERE\s+(.+)/i);
          
          if (tableMatch) {
            const tableName = tableMatch[1];
            let condition = null;
            
            if (whereMatch && params.length > 0) {
              const whereClause = whereMatch[1];
              // 简单的条件解析
              if (whereClause.includes('id = ?')) {
                condition = { id: params[0] };
              } else if (whereClause.includes('username = ?')) {
                condition = { username: params[0] };
              }
            }
            
            return db.get(tableName, condition);
          }
        }
        return null;
      },
      
      all(...params) {
        if (sql.includes('SELECT') && sql.includes('FROM')) {
          const tableMatch = sql.match(/FROM\s+(\w+)/i);
          const whereMatch = sql.match(/WHERE\s+(.+)/i);
          const orderMatch = sql.match(/ORDER BY\s+(\w+)\s+(ASC|DESC)?/i);
          const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
          const offsetMatch = sql.match(/OFFSET\s+(\d+)/i);
          
          if (tableMatch) {
            const tableName = tableMatch[1];
            let condition = null;
            
            if (whereMatch && params.length > 0) {
              const whereClause = whereMatch[1];
              if (whereClause.includes('category_id = ?')) {
                condition = { category_id: params[0] };
              } else if (whereClause.includes('shop_id = ?')) {
                condition = { shop_id: params[0] };
              } else if (whereClause.includes('user_id = ?')) {
                condition = { user_id: params[0] };
              }
            }
            
            let records = db.all(tableName, condition);
            
            // 排序
            if (orderMatch) {
              const sortField = orderMatch[1];
              const sortOrder = (orderMatch[2] || 'ASC').toUpperCase();
              records.sort((a, b) => {
                const aVal = a[sortField];
                const bVal = b[sortField];
                if (sortOrder === 'DESC') {
                  return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
                }
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
              });
            }
            
            // 分页
            if (offsetMatch) {
              const offset = parseInt(offsetMatch[1]);
              const limit = limitMatch ? parseInt(limitMatch[1]) : records.length;
              records = records.slice(offset, offset + limit);
            } else if (limitMatch) {
              records = records.slice(0, parseInt(limitMatch[1]));
            }
            
            return records;
          }
        }
        return [];
      },
      
      run(...params) {
        if (sql.includes('INSERT INTO')) {
          const tableMatch = sql.match(/INSERT INTO\s+(\w+)/i);
          const valuesMatch = sql.match(/VALUES\s*\((.+)\)/i);
          
          if (tableMatch && valuesMatch) {
            const tableName = tableMatch[1];
            // 简单的值解析（需要根据实际SQL调整）
            const record = {};
            // 这里需要根据实际的INSERT语句来解析字段和值
            // 暂时返回一个占位符
            return { lastInsertRowid: db.getNextId(tableName) };
          }
        }
        return { lastInsertRowid: null };
      }
    };
  },

  // 执行SQL（兼容SQLite语法）
  exec(sql) {
    // 简单的SQL执行（主要用于CREATE TABLE等）
    if (sql.includes('CREATE TABLE')) {
      // 表已通过数据结构创建，这里只做记录
      console.log('表结构已初始化');
    }
    return true;
  },

  // 兼容SQLite的pragma
  pragma(setting) {
    // 文件系统存储不需要pragma
    return true;
  }
};

// 初始化数据库
function initDatabase() {
  const data = readData();
  
  // 确保所有表存在
  Object.keys(defaultData).forEach(key => {
    if (!data[key] && key !== 'sequences') {
      data[key] = [];
    }
  });
  
  if (!data.sequences) {
    data.sequences = defaultData.sequences;
  }
  
  saveData(data);
  console.log('数据库初始化完成（文件系统存储）');
}

// 初始化数据库
initDatabase();

module.exports = db;
