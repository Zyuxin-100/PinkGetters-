// routes/shop.js
const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 测试API端点
router.get('/api/shops/test', (req, res) => {
    res.json({
        success: true,
        message: '店铺API正常工作',
        timestamp: new Date().toISOString()
    });
});

// API: 获取店铺列表（支持搜索）
router.get('/api/shops', (req, res) => {
    console.log('店铺搜索API被调用，参数:', req.query);
    
    // 设置正确的响应头
    res.setHeader('Content-Type', 'application/json');
    
    try {
        const { q = '' } = req.query;
        
        // 获取所有店铺
        let shops = db.all('shops');
        console.log('从数据库获取到的店铺数量:', shops.length);
        
        // 如果没有店铺数据，返回空数组
        if (!shops || shops.length === 0) {
            console.log('数据库中没有店铺数据');
            return res.json({
                success: true,
                data: []
            });
        }
        
        // 如果有搜索关键词，进行过滤
        if (q.trim()) {
            const keyword = q.toLowerCase();
            console.log('搜索关键词:', keyword);
            shops = shops.filter(shop => 
                (shop.name && shop.name.toLowerCase().includes(keyword)) ||
                (shop.description && shop.description.toLowerCase().includes(keyword)) ||
                (shop.address && shop.address.toLowerCase().includes(keyword))
            );
            console.log('过滤后的店铺数量:', shops.length);
        }
        
        // 为每个店铺添加统计信息
        const shopsWithStats = shops.map(shop => {
            const products = db.all('products', { shop_id: shop.id });
            const totalSales = products.reduce((sum, product) => sum + (product.sold || 0), 0);
            
            return {
                id: shop.id,
                name: shop.name || '未知店铺',
                description: shop.description || '',
                address: shop.address || '',
                rating: shop.rating || 4.5,
                logo_url: shop.logo_url || '/images/product-default.svg',
                productCount: products.length,
                totalSales: totalSales,
                avgPrice: products.length > 0 ? 
                    (products.reduce((sum, p) => sum + p.price, 0) / products.length).toFixed(2) : 0
            };
        });
        
        console.log('返回店铺数据:', shopsWithStats.length, '个店铺');
        res.json({
            success: true,
            data: shopsWithStats
        });
    } catch (error) {
        console.error('获取店铺列表API错误:', error);
        res.status(500).json({
            success: false,
            message: '获取店铺列表失败',
            error: error.message
        });
    }
});

// 商店列表页
router.get('/shop', (req, res) => {
    try {
        // 获取所有商店
        const shops = db.all('shops');        
        const shopsWithStats = shops.map(shop => {
            const products = db.all('products', { shop_id: shop.id });
            return {
                ...shop,
                productCount: products.length,
                avgPrice: products.length > 0 ? 
                    (products.reduce((sum, p) => sum + p.price, 0) / products.length).toFixed(2) : 0
            };
        });
        
        res.render('pages/shop_list', { 
            title: '商店列表',
            shops: shopsWithStats,
            isAuthenticated: !!(req.session && req.session.userId)
        });
    } catch (error) {
        console.error('获取商店列表错误:', error);
        res.status(500).render('pages/500', { 
            title: '服务器错误',
            error: error
        });
    }
});

// 店铺详情页
router.get('/shop/:shopId', (req, res) => {
    try {
        // 从数据库获取店铺信息
        const shopId = parseInt(req.params.shopId);
        const shop = db.get('shops', { id: shopId });
        const products = db.all('products', { shop_id: shop.id });
        
        // 获取店铺的商品分类（从店铺数据中获取，或从商品中提取）
        let shopCategories = [];
        if (shop.categories && Array.isArray(shop.categories)) {
            // 如果店铺有预定义的分类，使用店铺分类
            shopCategories = shop.categories;
        } else {
            // 否则从商品中提取唯一的shop_category
            const uniqueCategories = [...new Set(products
                .map(product => product.shop_category)
                .filter(category => category)
            )];
            shopCategories = uniqueCategories;
        }
        
        const categoryNames = ['全部', ...shopCategories];
        
        // 构建完整的店铺数据
        const shopData = {
            id: shop.id,
            name: shop.name,
            description: shop.description,
            rating: shop.rating || 0, // 使用数据库中的真实评分
            registerDate: shop.created_at ? new Date(shop.created_at).toLocaleDateString('zh-CN') : '', // 使用真实创建日期
            logo_url: shop.logo_url,
            banner_url: shop.banner_url,
            address: shop.address,
            phone: shop.phone,
            products: products.map(product => ({
                id: product.id,
                name: product.name,
                price: product.price,
                sales: product.sold || 0, // 使用数据库中的真实销量
                imageUrl: product.image_url,
                category: product.shop_category || 'other' // 使用店铺内分类
            })),
            categories: categoryNames,
            productCount: products.length
        };
        
        res.render('pages/shop', { 
            title: shopData.name,
            shop: shopData,
            isAuthenticated: !!(req.session && req.session.userId)
        });
    } catch (error) {
        console.error('获取店铺数据错误:', error);
        res.status(500).render('pages/500', { 
            title: '服务器错误',
            error: error
        });
    }
});

module.exports = router;