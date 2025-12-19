// 初始化示例数据
const db = require('../database/db');
const bcrypt = require('bcrypt');

async function initSampleData() {
  try {
    // 检查是否已有数据
    const existingUsers = db.all('users');
    if (existingUsers.length > 0) {
      console.log('数据已存在，跳过初始化');
      return;
    }
    
    // 创建示例用户
    const hashedPassword = await bcrypt.hash('123456', 10);
    const adminUser = db.insert('users', {
      username: 'admin',
      password: hashedPassword,
      email: 'admin@example.com',
      phone: '13800138000'
    });
    
    const userId = adminUser.id;
    
    // 创建示例分类
    const categories = [
      { name: '电子产品', icon: 'laptop', parent_id: null },
      { name: '服装配饰', icon: 'handbag', parent_id: null },
      { name: '食品饮料', icon: 'cup', parent_id: null },
      { name: '图书文具', icon: 'book', parent_id: null }
    ];
    
    const categoryIds = [];
    categories.forEach(cat => {
      const category = db.insert('categories', cat);
      categoryIds.push(category.id);
    });
    
    // 创建示例店铺
    const shop = db.insert('shops', {
      name: '示例店铺',
      description: '这是一个示例店铺',
      owner_id: userId,
      logo_url: 'https://via.placeholder.com/100'
    });
    
    const shopId = shop.id;
    
    // 创建示例商品
    const products = [
      {
        name: '智能手机',
        sku: 'SPH-1001',
        barcode: '6900000000001',
        brand: '示例品牌',
        tags: ['手机', '数码', '热销'],
        attributes: { color: ['黑色', '白色'], storage: ['128GB', '256GB'] },
        variants: [
          { sku: 'SPH-1001-128-BK', price: 2999.00, attributes: { storage: '128GB', color: '黑色' }, stock: 20 }
        ],
        description: '高性能智能手机，拍照清晰，运行流畅',
        price: 2999.00,
        original_price: 3499.00,
        stock: 50,
        category_id: categoryIds[0],
        shop_id: shopId,
        image_url: 'https://via.placeholder.com/300',
        images: ['https://via.placeholder.com/300', 'https://via.placeholder.com/300/111'],
        weight_grams: 180,
        dimensions_cm: { length: 15, width: 7, height: 0.8 },
        shipping: { type: 'standard', weight_grams: 220 },
        warranty: '1年',
        rating: 4.6,
        reviews: 120,
        is_hot: true,
        is_new: true
      },
      {
        name: '笔记本电脑',
        sku: 'LTP-2001',
        barcode: '6900000000002',
        brand: '示例品牌',
        tags: ['电脑', '办公'],
        attributes: { memory: ['8GB', '16GB'], storage: ['256GB', '512GB'] },
        variants: [],
        description: '轻薄便携，性能强劲',
        price: 5999.00,
        original_price: 6999.00,
        stock: 30,
        category_id: categoryIds[0],
        shop_id: shopId,
        image_url: 'https://via.placeholder.com/300',
        images: ['https://via.placeholder.com/300'],
        weight_grams: 1400,
        dimensions_cm: { length: 32, width: 22, height: 1.8 },
        shipping: { type: 'bulky', weight_grams: 1600 },
        warranty: '1年',
        rating: 4.7,
        reviews: 85,
        is_hot: true,
        is_new: false
      },
      {
        name: '时尚T恤',
        sku: 'TSH-3001',
        barcode: '6900000000003',
        brand: '潮牌',
        tags: ['服装', '棉质'],
        attributes: { color: ['白色', '黑色'], size: ['S', 'M', 'L'] },
        variants: [
          { sku: 'TSH-3001-WH-M', price: 99.00, attributes: { color: '白色', size: 'M' }, stock: 20 }
        ],
        description: '纯棉材质，舒适透气',
        price: 99.00,
        original_price: 129.00,
        stock: 100,
        category_id: categoryIds[1],
        shop_id: shopId,
        image_url: 'https://via.placeholder.com/300',
        images: ['https://via.placeholder.com/300'],
        weight_grams: 200,
        dimensions_cm: { length: 30, width: 25, height: 2 },
        shipping: { type: 'standard', weight_grams: 250 },
        warranty: '',
        rating: 4.4,
        reviews: 60,
        is_hot: true,
        is_new: true
      },
      {
        name: '咖啡豆',
        sku: 'COF-4001',
        barcode: '6900000000004',
        brand: '精品咖啡',
        tags: ['食品', '饮料'],
        attributes: { weight: ['250g', '500g'] },
        variants: [],
        description: '精选咖啡豆，香味浓郁',
        price: 88.00,
        original_price: 118.00,
        stock: 200,
        category_id: categoryIds[2],
        shop_id: shopId,
        image_url: 'https://via.placeholder.com/300',
        images: ['https://via.placeholder.com/300'],
        weight_grams: 500,
        dimensions_cm: { length: 20, width: 12, height: 8 },
        shipping: { type: 'food', weight_grams: 520 },
        warranty: '',
        rating: 4.5,
        reviews: 40,
        is_hot: false,
        is_new: false
      },
      {
        name: '平板电脑',
        sku: 'TAB-5001',
        barcode: '6900000000005',
        brand: '示例品牌',
        tags: ['平板', '学习'],
        attributes: { storage: ['64GB', '128GB'] },
        variants: [],
        description: '高清屏幕，适合学习和娱乐',
        price: 1999.00,
        original_price: 2299.00,
        stock: 40,
        category_id: categoryIds[0],
        shop_id: shopId,
        image_url: 'https://via.placeholder.com/300',
        images: ['https://via.placeholder.com/300'],
        weight_grams: 600,
        dimensions_cm: { length: 25, width: 17, height: 0.7 },
        shipping: { type: 'standard', weight_grams: 650 },
        warranty: '1年',
        rating: 4.3,
        reviews: 30,
        is_hot: false,
        is_new: true
      },
      {
        name: '运动鞋',
        sku: 'SHO-6001',
        barcode: '6900000000006',
        brand: '运动品牌',
        tags: ['鞋履', '运动'],
        attributes: { color: ['白色', '黑色'], size: ['39', '40', '41'] },
        variants: [],
        description: '舒适透气，适合运动',
        price: 299.00,
        original_price: 399.00,
        stock: 80,
        category_id: categoryIds[1],
        shop_id: shopId,
        image_url: 'https://via.placeholder.com/300',
        images: ['https://via.placeholder.com/300'],
        weight_grams: 800,
        dimensions_cm: { length: 30, width: 20, height: 10 },
        shipping: { type: 'standard', weight_grams: 900 },
        warranty: '',
        rating: 4.2,
        reviews: 45,
        is_hot: false,
        is_new: false
      }
    ];
    
    products.forEach(product => {
      db.insert('products', product);
    });
    
    console.log('示例数据初始化完成');
    console.log('测试账号: admin / 123456');
  } catch (error) {
    console.error('初始化示例数据错误:', error);
  }
}

module.exports = initSampleData;
