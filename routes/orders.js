// routes/orders.js
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');

// 生成模拟订单数据
function generateMockOrders() {
    const products = db.all('products');
    const statuses = ['pending_payment', 'pending_shipment', 'shipped', 'completed', 'cancelled'];
    const statusNames = {
        'pending_payment': '待支付',
        'pending_shipment': '待发货', 
        'shipped': '待收货',
        'completed': '已收货',
        'cancelled': '已取消'
    };
    
    const orders = [];
    
    // 生成5个模拟订单
    for (let i = 1; i <= 5; i++) {
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 30)); // 随机30天内的日期
        
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const orderNumber = `2025${String(orderDate.getMonth() + 1).padStart(2, '0')}${String(orderDate.getDate()).padStart(2, '0')}${String(i).padStart(3, '0')}`;
        
        // 随机选择1-3个商品
        const itemCount = Math.floor(Math.random() * 3) + 1;
        const orderItems = [];
        let totalAmount = 0;
        
        for (let j = 0; j < itemCount; j++) {
            const randomProduct = products[Math.floor(Math.random() * products.length)];
            const quantity = Math.floor(Math.random() * 3) + 1;
            const subtotal = randomProduct.price * quantity;
            
            // 生成规格信息
            let specifications = [];
            if (randomProduct.attributes && typeof randomProduct.attributes === 'object') {
                Object.entries(randomProduct.attributes).forEach(([key, values]) => {
                    if (Array.isArray(values) && values.length > 0) {
                        const seed = randomProduct.id + j;
                        const selectedValue = values[seed % values.length];
                        specifications.push(selectedValue);
                    }
                });
            }
            
            if (specifications.length === 0) {
                specifications = ['标准版'];
            }
            
            orderItems.push({
                productId: randomProduct.id,
                name: randomProduct.name,
                price: randomProduct.price,
                quantity: quantity,
                subtotal: subtotal,
                imageUrl: randomProduct.image_url || 'https://via.placeholder.com/60x60?text=商品',
                specifications: specifications.slice(0, 2) // 最多显示2个规格
            });
            
            totalAmount += subtotal;
        }
        
        orders.push({
            id: i,
            orderNumber: orderNumber,
            status: status,
            statusName: statusNames[status],
            orderDate: orderDate.toLocaleString('zh-CN'),
            totalAmount: totalAmount,
            items: orderItems,
            expireTime: status === 'pending_payment' ? new Date(Date.now() + 30 * 60 * 1000) : null // 30分钟后过期
        });
    }
    
    return orders;
}

// 订单列表页
router.get('/', requireAuth, (req, res) => {
    try {
        
        const userId = req.session.userId;
        const statusFilter = req.query.status; // 获取状态筛选参数
        
        // 获取用户的真实订单数据
        let userOrders = db.all('orders', { user_id: userId });
        
        // 如果有状态筛选，过滤订单
        if (statusFilter) {
            userOrders = userOrders.filter(order => order.status === statusFilter);
        }
        
        // 状态名称映射
        const statusNames = {
            'pending_payment': '待支付',
            'pending_shipment': '待发货', 
            'shipped': '待收货',
            'completed': '已收货',
            'cancelled': '已取消'
        };
        
        // 处理订单数据，添加商品信息
        const processedOrders = userOrders.map(order => {
            // 获取订单商品
            const orderItems = db.all('order_items', { order_id: order.id });
            
            const items = orderItems.filter(item => {
                // 只保留商品仍然存在的订单项
                const product = db.get('products', { id: item.product_id });
                return product !== null;
            }).map(item => {
                const product = db.get('products', { id: item.product_id });
                
                // 生成规格信息
                let specifications = [];
                if (product && product.attributes && typeof product.attributes === 'object') {
                    Object.entries(product.attributes).forEach(([key, values]) => {
                        if (Array.isArray(values) && values.length > 0) {
                            // 使用商品ID作为种子选择规格
                            const selectedValue = values[product.id % values.length];
                            specifications.push(selectedValue);
                        }
                    });
                }
                
                if (specifications.length === 0) {
                    specifications = ['标准版'];
                }
                
                return {
                    productId: item.product_id,
                    name: product.name,
                    price: item.price,
                    quantity: item.quantity,
                    subtotal: item.price * item.quantity,
                    imageUrl: product.image_url,
                    specifications: specifications.slice(0, 2) // 最多显示2个规格
                };
            });
            
            return {
                id: order.id,
                orderNumber: order.order_number,
                status: order.status,
                statusName: statusNames[order.status] || order.status,
                orderDate: new Date(order.created_at).toLocaleString('zh-CN'),
                totalAmount: order.total_amount,
                items: items,
                expireTime: order.status === 'pending_payment' && order.expire_at ? 
                    new Date(order.expire_at) : null
            };
        }).filter(order => order.items.length > 0); // 只保留有有效商品的订单
        
        // 按创建时间倒序排列
        processedOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
        
        // 渲染订单列表页面
        res.render('pages/order_list', { 
            title: statusFilter ? `我的订单 - ${statusNames[statusFilter] || statusFilter}` : '我的订单',
            isAuthenticated: true,
            orders: processedOrders,
            currentStatus: statusFilter || 'all'
        });
    } catch (error) {
        console.error('获取订单数据错误:', error);
        res.render('pages/order_list', { 
            title: '我的订单',
            isAuthenticated: true,
            orders: [],
            currentStatus: 'all'
        });
    }
});

// API: 创建订单
router.post('/create', requireAuth, (req, res) => {
    console.log('收到订单创建请求:', {
        body: req.body,
        session: req.session ? { userId: req.session.userId } : null
    });
    
    try {
        
        const userId = req.session.userId;
        const { items, addressId, paymentMethod, totalAmount, source } = req.body;
        
        console.log('解析请求数据:', { userId, items, addressId, paymentMethod, totalAmount, source });
        
        // 验证必填字段
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: '订单商品不能为空'
            });
        }
        
        if (!addressId) {
            return res.status(400).json({
                success: false,
                message: '请选择收货地址'
            });
        }
        
        if (!paymentMethod) {
            return res.status(400).json({
                success: false,
                message: '请选择支付方式'
            });
        }
        
        // 生成订单号
        const orderNumber = generateOrderNumber();
        
        // 计算订单总金额（重新验证）
        let calculatedTotal = 0;
        const validItems = [];
        
        for (const item of items) {
            const product = db.get('products', { id: item.productId });
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: `商品 ${item.productId} 不存在`
                });
            }
            
            // 检查库存
            if (product.stock && product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `商品 ${product.name} 库存不足`
                });
            }
            
            const itemTotal = product.price * item.quantity;
            calculatedTotal += itemTotal;
            
            validItems.push({
                productId: product.id,
                price: product.price,
                quantity: item.quantity,
                subtotal: itemTotal
            });
        }
        
        // 验证总金额
        if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
            return res.status(400).json({
                success: false,
                message: '订单金额验证失败'
            });
        }
        
        // 创建订单记录
        const orderData = {
            order_number: orderNumber,
            user_id: userId,
            status: 'pending_payment',
            total_amount: calculatedTotal,
            payment_method: paymentMethod,
            address_id: addressId,
            created_at: new Date().toISOString(),
            expire_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30分钟后过期
        };
        
        const orderRecord = db.insert('orders', orderData);
        const orderId = orderRecord.id;
        
        // 创建订单商品记录
        validItems.forEach(item => {
            db.insert('order_items', {
                order_id: orderId,
                product_id: item.productId,
                price: item.price,
                quantity: item.quantity,
                created_at: new Date().toISOString()
            });
        });
        
        // 如果是从购物车结算，清空对应的购物车商品
        if (source === 'cart') {
            // 这里应该删除购物车中对应的商品
            // 简化处理：清空用户的购物车
            const cartItems = db.all('cart_items', { user_id: userId });
            cartItems.forEach(cartItem => {
                db.delete('cart_items', { id: cartItem.id });
            });
        }
        
        res.json({
            success: true,
            message: '订单创建成功',
            orderId: orderId,
            orderNumber: orderNumber
        });
        
    } catch (error) {
        console.error('创建订单失败:', error);
        res.status(500).json({
            success: false,
            message: '创建订单失败，请稍后重试'
        });
    }
});

// 订单详情页
router.get('/:id', requireAuth, (req, res) => {
    try {
        
        const userId = req.session.userId;
        const orderId = parseInt(req.params.id, 10);
        
        // 验证订单ID
        if (isNaN(orderId)) {
            return res.status(404).render('pages/404', { 
                title: '订单不存在', 
                isAuthenticated: true 
            });
        }
        
        // 获取订单信息
        const order = db.get('orders', { id: orderId, user_id: userId });
        
        if (!order) {
            return res.status(404).render('pages/404', { 
                title: '订单不存在', 
                isAuthenticated: true 
            });
        }
        
        // 获取订单商品
        const orderItems = db.all('order_items', { order_id: orderId });
        
        const items = orderItems.map(item => {
            const product = db.get('products', { id: item.product_id });
            
            // 生成规格信息
            let specifications = [];
            if (product && product.attributes && typeof product.attributes === 'object') {
                Object.entries(product.attributes).forEach(([key, values]) => {
                    if (Array.isArray(values) && values.length > 0) {
                        const selectedValue = values[product.id % values.length];
                        specifications.push(selectedValue);
                    }
                });
            }
            
            if (specifications.length === 0) {
                specifications = ['标准版'];
            }
            
            return {
                productId: item.product_id,
                name: product ? product.name : '商品已下架',
                price: item.price,
                quantity: item.quantity,
                subtotal: item.price * item.quantity,
                imageUrl: product ? product.image_url : '/images/product-default.svg',
                specifications: specifications.slice(0, 2)
            };
        });
        
        // 状态名称映射
        const statusNames = {
            'pending_payment': '待支付',
            'pending_shipment': '待发货', 
            'shipped': '待收货',
            'completed': '已收货',
            'cancelled': '已取消'
        };
        
        const orderDetail = {
            id: order.id,
            orderNumber: order.order_number,
            status: order.status,
            statusName: statusNames[order.status] || order.status,
            orderDate: new Date(order.created_at).toLocaleString('zh-CN'),
            totalAmount: order.total_amount,
            paymentMethod: order.payment_method,
            items: items,
            expireTime: order.status === 'pending_payment' && order.expire_at ? 
                new Date(order.expire_at) : null
        };
        
        // 渲染订单详情页面（暂时使用订单列表页面显示单个订单）
        res.render('pages/order_list', { 
            title: `订单详情 - ${orderDetail.orderNumber}`,
            isAuthenticated: true,
            orders: [orderDetail],
            currentStatus: 'detail'
        });
        
    } catch (error) {
        console.error('获取订单详情错误:', error);
        res.status(500).render('pages/500', { 
            title: '服务器错误', 
            isAuthenticated: true 
        });
    }
});

// 生成订单号
function generateOrderNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}${random}`;
}

// Test route for debugging
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Orders route is working',
        session: req.session ? { userId: req.session.userId } : null,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;