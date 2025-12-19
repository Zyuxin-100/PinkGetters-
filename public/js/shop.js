// 店铺详情页面JavaScript逻辑

$(document).ready(function() {
    
    const $productList = $('#product-list-container');
    const $categoryButtons = $('.product-category-filter button');
    const $sortLinks = $('.dropdown-menu a');
    const $followBtn = $('.shop-follow-btn');
    
    let currentCategory = 'all';
    let currentSort = 'default';
    let isFollowing = false;
    let itemsPerPage = 5; // 每次显示5个商品（一排）
    let currentPage = 1; // 当前页数

    // --- 1. 商品筛选事件绑定 ---

    $categoryButtons.on('click', function() {
        const $button = $(this);
        const newCategory = $button.data('category');
        
        if (newCategory === currentCategory) return;
        
        // 样式切换
        $categoryButtons.removeClass('active');
        $button.addClass('active');
        
        currentCategory = newCategory;
        
        // 执行筛选和排序（会重置分页）
        filterAndSortProducts();
    });
    
    // --- 2. 排序事件绑定 ---

    $sortLinks.on('click', function(e) {
        e.preventDefault();
        const $link = $(this);
        const newSort = $link.data('sort');
        
        if (newSort === currentSort) return;
        
        // 样式切换
        $sortLinks.removeClass('active');
        $link.addClass('active');
        
        // 更新排序按钮的显示文本
        $('#sortDropdown').text($link.text());
        
        currentSort = newSort;
        
        // 执行筛选和排序（会重置分页）
        filterAndSortProducts();
    });

// --- 3. 核心筛选和排序逻辑 ---

    function filterAndSortProducts() {
        const products = [];
        // 1. 获取并筛选数据
        $productList.find('.product-col').each(function() {
            const $col = $(this);
            const category = $col.data('category');
            
            // 筛选：如果不是'all'，且分类不匹配，则跳过
            if (currentCategory !== 'all' && category !== currentCategory) {
                return;
            }
            
            // 提取用于排序的数据
            const price = parseFloat($col.find('.price-text').text().replace('¥ ', ''));
            const sales = parseInt($col.find('.badge:contains("销量")').text().replace('销量: ', '')) || 0;

            products.push({
                $element: $col,
                price: price,
                sales: sales
            });
        });

        // 2. 排序
        products.sort((a, b) => {
            switch (currentSort) {
                case 'price_asc':
                    return a.price - b.price;
                case 'price_desc':
                    return b.price - a.price;
                case 'sales_desc':
                    return b.sales - a.sales;
                case 'newest':
                    // 按商品ID倒序排列（模拟最新商品）
                    const aId = parseInt(a.$element.find('.add-to-cart-btn').data('product-id'));
                    const bId = parseInt(b.$element.find('.add-to-cart-btn').data('product-id'));
                    return bId - aId;
                case 'default':
                default:
                    return 0; // 保持原有顺序
            }
        });

        // 3. 重新插入DOM以反映排序结果
        products.forEach(item => {
            $productList.append(item.$element);
        });
        
        // 4. 重置分页并显示第一页
        currentPage = 1;
        showProductsPage(products);
    }
    
    // 显示指定页数的商品
    function showProductsPage(allProducts) {
        $productList.find('.product-col').hide();
        
        const startIndex = 0;
        const endIndex = currentPage * itemsPerPage;
        
        for (let i = startIndex; i < Math.min(endIndex, allProducts.length); i++) {
            allProducts[i].$element.show();
        }
        
        updateLoadMoreButton(allProducts.length);
    }
    
    // 更新加载更多按钮状态
    function updateLoadMoreButton(totalProducts) {
        const $loadMoreBtn = $('#load-more-btn');
        const showedProducts = currentPage * itemsPerPage;
        
        if (showedProducts >= totalProducts) {
            // 已显示所有商品
            $loadMoreBtn.html('<i class="bi bi-check-lg me-2"></i> 已加载全部商品')
                       .prop('disabled', true)
                       .removeClass('btn-primary')
                       .addClass('btn-secondary');
        } else {
            // 还有更多商品
            const remainingProducts = totalProducts - showedProducts;
            const nextBatchSize = Math.min(itemsPerPage, remainingProducts);
            $loadMoreBtn.html(`<i class="bi bi-arrow-clockwise me-2"></i> 加载更多商品 (还有${remainingProducts}件)`)
                       .prop('disabled', false)
                       .removeClass('btn-secondary')
                       .addClass('btn-primary');
        }
    }
    // --- 4. 关注店铺功能 ---
    
    $followBtn.on('click', function() {
        const $btn = $(this);
        
        // 显示加载状态
        $btn.prop('disabled', true);
        const originalHtml = $btn.html();
        $btn.html('<i class="spinner-border spinner-border-sm me-1"></i> 处理中...');
        
        // 模拟API请求
        setTimeout(() => {
            if (isFollowing) {
                // 取消关注
                isFollowing = false;
                $btn.removeClass('followed').addClass('btn-primary')
                    .html('<i class="bi bi-heart me-1"></i> 关注');
                showAlert('info', '已取消关注该店铺');
            } else {
                // 关注店铺
                isFollowing = true;
                $btn.removeClass('btn-primary').addClass('followed')
                    .html('<i class="bi bi-heart-fill me-1"></i> 已关注');
                showAlert('success', '关注成功！您将收到该店铺的最新动态');
            }
            
            $btn.prop('disabled', false);
        }, 800);
    });
    
    // --- 5. 添加到购物车功能 ---
    
    $(document).on('click', '.add-to-cart-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const $btn = $(this);
        const productId = $btn.data('product-id');
        const $productCard = $btn.closest('.product-col');
        const productName = $productCard.find('.product-name').text();
        
        // 显示加载状态
        $btn.prop('disabled', true);
        const originalHtml = $btn.html();
        $btn.html('<i class="spinner-border spinner-border-sm"></i>');
        
        // 发送添加到购物车的API请求
        ajaxRequest('/api/cart/add', 'POST', {
            productId: productId,
            quantity: 1
        }, 
        function(response) {
            
            // 如果用户未登录，保存到本地存储
            if (!response.isLoggedIn) {
                const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
                const existingIndex = cartItems.findIndex(item => item.productId == productId);
                
                if (existingIndex >= 0) {
                    cartItems[existingIndex].quantity += 1;
                } else {
                    cartItems.push({
                        productId: productId,
                        productName: productName,
                        quantity: 1,
                        addedAt: new Date().toISOString()
                    });
                }
                
                localStorage.setItem('cart', JSON.stringify(cartItems));
            }
            
            // 成功添加
            $btn.html('<i class="bi bi-check-lg text-success"></i>');
            showAlert('success', `${productName} 已加入购物车`);
            
            // 2秒后恢复按钮状态
            setTimeout(() => {
                $btn.html(originalHtml).prop('disabled', false);
            }, 2000);
        },
        function(error) {
            // 添加失败
            $btn.html(originalHtml).prop('disabled', false);
            
            if (error.includes('登录')) {
                // 用户未登录，提示登录
                showAlert('warning', '请先登录后再添加商品到购物车');
                setTimeout(() => {
                    window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
                }, 2000);
            } else {
                showAlert('danger', '添加失败：' + error);
            }
        });
    });

    // --- 6. 加载更多商品功能 ---
    
    $('#load-more-btn').on('click', function() {
        const $btn = $(this);
        
        // 显示加载状态
        $btn.prop('disabled', true);
        $btn.html('<i class="spinner-border spinner-border-sm me-2"></i> 加载中...');
        
        // 模拟加载延迟
        setTimeout(() => {
            // 增加页数
            currentPage++;
            
            // 重新获取当前筛选和排序后的商品
            const products = [];
            $productList.find('.product-col').each(function() {
                const $col = $(this);
                const category = $col.data('category');
                
                // 应用当前筛选条件
                if (currentCategory !== 'all' && category !== currentCategory) {
                    return;
                }
                
                const price = parseFloat($col.find('.price-text').text().replace('¥ ', ''));
                const sales = parseInt($col.find('.badge:contains("销量")').text().replace('销量: ', '')) || 0;

                products.push({
                    $element: $col,
                    price: price,
                    sales: sales
                });
            });
            
            // 应用当前排序
            products.sort((a, b) => {
                switch (currentSort) {
                    case 'price_asc':
                        return a.price - b.price;
                    case 'price_desc':
                        return b.price - a.price;
                    case 'sales_desc':
                        return b.sales - a.sales;
                    case 'newest':
                        const aId = parseInt(a.$element.find('.add-to-cart-btn').data('product-id'));
                        const bId = parseInt(b.$element.find('.add-to-cart-btn').data('product-id'));
                        return bId - aId;
                    case 'default':
                    default:
                        return 0;
                }
            });
            
            // 显示更多商品
            showProductsPage(products);
            
            showAlert('success', `已加载更多商品`);
        }, 800);
    });
    
    // 默认执行一次筛选和排序
    filterAndSortProducts();
});