// routes/cart.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const db = require('../database/db');

// 购物车页面
router.get('/cart', (req, res) => {
    try {
        let cartItems = [];
        const isLoggedIn = !!(req.session && req.session.userId);
        
        // 调试信息
        console.log('购物车页面访问 - Session调试:', {
            hasSession: !!req.session,
            sessionKeys: req.session ? Object.keys(req.session) : [],
            userId: req.session?.userId,
            username: req.session?.username,
            sessionId: req.session?.id,
            cookie: req.session?.cookie,
            isLoggedIn: isLoggedIn,
            userAgent: req.get('User-Agent'),
            referer: req.get('Referer')
        });
        
        // 如果未登录，直接显示未登录状态
        if (!isLoggedIn) {
            return res.render('pages/cart_page', { 
                title: '我的购物车',
                isAuthenticated: false,
                cartItems: [],
                isLoggedIn: false,
                showLoginPrompt: true,
                user: null
            });
        }
        
        // 登录用户：从数据库获取购物车数据
        const userId = req.session.userId;
        const dbCartItems = db.all('cart_items', { user_id: userId });
        
        // 获取商品详细信息
        cartItems = dbCartItems.map(item => {
            const product = db.get('products', { id: item.product_id });
            
            // 如果商品不存在，跳过该项
            if (!product) {
                console.warn(`购物车中的商品ID ${item.product_id} 不存在，跳过该项`);
                return null;
            }
            
            // 从商品的attributes中提取规格信息
            let specifications = [];
            
            if (product.attributes && typeof product.attributes === 'object') {
                // 遍历attributes对象，提取第一个值作为规格
                Object.entries(product.attributes).forEach(([key, values]) => {
                    if (Array.isArray(values) && values.length > 0) {
                        // 使用商品ID作为种子，确保同一商品的规格选择保持一致
                        const seed = product.id;
                        const selectedValue = values[seed % values.length];
                        specifications.push(selectedValue);
                    }
                });
            }
            
            // 如果没有attributes或为空，使用商品的specs字段或默认值
            if (specifications.length === 0) {
                if (product.specs) {
                    // 将specs字符串按逗号分割作为规格
                    specifications = product.specs.split(',').map(spec => spec.trim()).slice(0, 2);
                } else {
                    specifications = ['标准版'];
                }
            }
            
            return {
                id: item.id,
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
                imageUrl: product.image_url || 'https://via.placeholder.com/100x100?text=商品',
                subtotal: product.price * item.quantity,
                specifications: specifications
            };
        }).filter(item => item !== null); // 过滤掉不存在的商品
        
        // 渲染购物车页面
        res.render('pages/cart_page', { 
            title: '我的购物车',
            isAuthenticated: isLoggedIn,
            cartItems: cartItems,
            isLoggedIn: isLoggedIn,
            showLoginPrompt: false,
            user: req.session.userId ? { id: req.session.userId } : null
        });
    } catch (error) {
        console.error('获取购物车数据错误:', error);
        res.render('pages/cart_page', { 
            title: '我的购物车',
            isAuthenticated: false,
            cartItems: [],
            isLoggedIn: false,
            showLoginPrompt: true,
            user: null
        });
    }
});

// API: 添加商品到购物车
router.post('/api/cart/add', (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;
        
        if (!productId) {
            return res.json({ success: false, message: '商品ID不能为空' });
        }
        
        // 检查商品是否存在
        const product = db.get('products', { id: parseInt(productId) });
        if (!product) {
            return res.json({ success: false, message: '商品不存在' });
        }
        
        // 检查库存
        if (product.stock < quantity) {
            return res.json({ success: false, message: '库存不足' });
        }
        
        // 如果用户已登录，保存到数据库
        if (req.session && req.session.userId) {
            const userId = req.session.userId;
            
            // 检查购物车中是否已有该商品
            const existingItem = db.get('cart_items', { 
                user_id: userId, 
                product_id: parseInt(productId) 
            });
            
            if (existingItem) {
                // 更新数量
                const newQuantity = existingItem.quantity + parseInt(quantity);
                if (newQuantity > product.stock) {
                    return res.json({ success: false, message: '超出库存限制' });
                }
                
                db.update('cart_items', existingItem.id, { 
                    quantity: newQuantity 
                });
            } else {
                // 添加新商品到购物车
                db.insert('cart_items', {
                    user_id: userId,
                    product_id: parseInt(productId),
                    quantity: parseInt(quantity)
                });
            }
        }
        
        // 无论是否登录都返回成功（未登录用户使用前端本地存储）
        res.json({ 
            success: true, 
            message: '商品已加入购物车',
            product: {
                id: product.id,
                name: product.name,
                price: product.price
            },
            isLoggedIn: !!(req.session && req.session.userId)
        });
        
    } catch (error) {
        console.error('添加购物车错误:', error);
        res.json({ success: false, message: '添加失败，请稍后重试' });
    }
});

// API: 检查登录状态
router.get('/api/cart/status', (req, res) => {
    const isLoggedIn = !!(req.session && req.session.userId);
    res.json({ 
        success: true, 
        isLoggedIn: isLoggedIn,
        userId: req.session?.userId,
        username: req.session?.username
    });
});

// API: 获取购物车商品数量
router.get('/api/cart/count', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        const cartItems = db.all('cart_items', { user_id: userId });
        const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        
        res.json({ success: true, count: totalCount });
    } catch (error) {
        console.error('获取购物车数量错误:', error);
        res.json({ success: false, message: '获取失败' });
    }
});

// API: 删除购物车商品
router.delete('/api/cart/remove/:itemId', requireAuth, (req, res) => {
    try {
        const itemId = parseInt(req.params.itemId);
        const userId = req.session.userId;
        
        // 检查商品是否属于当前用户
        const cartItem = db.get('cart_items', { id: itemId, user_id: userId });
        if (!cartItem) {
            return res.json({ success: false, message: '商品不存在或无权限删除' });
        }
        
        // 删除商品
        db.delete('cart_items', itemId);
        
        res.json({ success: true, message: '商品已从购物车中删除' });
    } catch (error) {
        console.error('删除购物车商品错误:', error);
        res.json({ success: false, message: '删除失败，请稍后重试' });
    }
});

// API: 更新购物车商品数量
router.put('/api/cart/update/:itemId', requireAuth, (req, res) => {
    try {
        const itemId = parseInt(req.params.itemId);
        const { quantity } = req.body;
        const userId = req.session.userId;
        
        if (!quantity || quantity < 1) {
            return res.json({ success: false, message: '数量必须大于0' });
        }
        
        // 检查商品是否属于当前用户
        const cartItem = db.get('cart_items', { id: itemId, user_id: userId });
        if (!cartItem) {
            return res.json({ success: false, message: '商品不存在或无权限修改' });
        }
        
        // 检查商品库存
        const product = db.get('products', { id: cartItem.product_id });
        if (!product) {
            return res.json({ success: false, message: '商品不存在' });
        }
        
        if (product.stock < quantity) {
            return res.json({ success: false, message: '库存不足' });
        }
        
        // 更新数量
        db.update('cart_items', itemId, { quantity: parseInt(quantity) });
        
        res.json({ success: true, message: '数量已更新' });
    } catch (error) {
        console.error('更新购物车商品数量错误:', error);
        res.json({ success: false, message: '更新失败，请稍后重试' });
    }
});

module.exports = router;