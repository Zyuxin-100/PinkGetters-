// cart_page.js - 购物车页面JavaScript

// 安全的localStorage访问函数
function safeGetLocalStorage(key, defaultValue = '[]') {
    try {
        return localStorage.getItem(key) || defaultValue;
    } catch (error) {
        console.warn('无法访问localStorage:', error);
        return defaultValue;
    }
}

function safeSetLocalStorage(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn('无法写入localStorage:', error);
        return false;
    }
}

function safeRemoveLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.warn('无法删除localStorage:', error);
        return false;
    }
}

$(document).ready(function() {
    // 检查是否需要同步本地购物车到服务器
    syncLocalCartIfLoggedIn();
    
    // 检查是否为未登录用户，如果是则加载本地存储的购物车
    loadLocalCartIfNeeded();
    
    // 页面加载完成后立即计算总价和更新UI状态
    updateCartSummary();
    
    // --- 0. 同步本地购物车到服务器 ---
    
    function syncLocalCartIfLoggedIn() {
        // 检查是否已登录且服务器购物车为空，但本地有数据
        const hasServerItems = $('.cart-item-card[data-item-id]').length > 0;
        const localCart = JSON.parse(safeGetLocalStorage('cart', '[]'));
        
        // 从隐藏元素中获取登录状态
        const loginStatusElement = $('#login-status');
        const loginStatusData = loginStatusElement.data('logged-in');
        let isLoggedIn = false;
        
        if (loginStatusElement.length > 0) {
            // 处理多种可能的数据类型
            isLoggedIn = loginStatusData === true || 
                        loginStatusData === 'true' || 
                        loginStatusData === 1 || 
                        loginStatusData === '1';
        } else {
            // 备用检测方法：检查是否有服务器端渲染的购物车商品
            isLoggedIn = $('.cart-item-card[data-item-id]').length > 0;
        }
        
        // 额外的调试信息
        const debugInfo = {
            elementExists: loginStatusElement.length > 0,
            dataValue: loginStatusData,
            dataType: typeof loginStatusData,
            hasServerItems: $('.cart-item-card[data-item-id]').length > 0,
            debugLoggedIn: $('#debug-logged-in').text(),
            debugAuthenticated: $('#debug-authenticated').text(),
            debugUser: $('#debug-user').text(),
            isLoggedIn: isLoggedIn
        };
        
        console.log('登录状态检测:', debugInfo);
        
        // 如果前端检测显示未登录，通过API再次验证（但不自动刷新）
        if (!isLoggedIn) {
            console.log('前端检测显示未登录，通过API验证...');
            $.ajax({
                url: '/api/cart/status',
                method: 'GET',
                success: function(response) {
                    console.log('API验证结果:', response);
                    if (response.success && response.isLoggedIn) {
                        console.log('API显示已登录，但前端检测失败，可能是模板数据传递问题');
                        console.log('建议：检查服务器端session和模板数据传递');
                        // 不自动刷新，避免无限循环
                        // 可以在这里手动更新页面状态
                        updateLoginStatus(true);
                    }
                },
                error: function(xhr, status, error) {
                    console.log('API验证失败:', error);
                }
            });
        }
        
        if (isLoggedIn && !hasServerItems && localCart.length > 0) {
            console.log('检测到已登录用户有本地购物车数据，开始同步...');
            syncLocalCartToServer(localCart);
        }
    }
    
    // 手动更新登录状态
    function updateLoginStatus(loggedIn) {
        if (loggedIn) {
            console.log('手动更新登录状态为已登录');
            // 隐藏未登录提示
            $('.empty-cart').hide();
            // 可以在这里添加其他需要的UI更新
        }
    }
    
    function syncLocalCartToServer(localCart) {
        let syncCount = 0;
        const totalItems = localCart.length;
        
        // 显示同步提示
        showSyncAlert('正在同步购物车数据...', 'info');
        
        localCart.forEach((item, index) => {
            // 为每个本地商品发送添加请求
            ajaxRequest('/api/cart/add', 'POST', {
                productId: item.productId,
                quantity: item.quantity
            }, 
            function(response) {
                syncCount++;
                console.log(`同步商品 ${item.productName} 成功`);
                
                // 如果所有商品都同步完成
                if (syncCount === totalItems) {
                    // 清空本地存储
                    safeRemoveLocalStorage('cart');
                    console.log('购物车同步完成，刷新页面');
                    
                    // 显示成功提示并刷新页面
                    showSyncAlert(`成功同步 ${totalItems} 件商品到购物车`, 'success');
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
            },
            function(error) {
                console.error(`同步商品 ${item.productName} 失败:`, error);
                syncCount++;
                
                // 即使失败也要检查是否完成
                if (syncCount === totalItems) {
                    showSyncAlert('部分商品同步失败，请手动添加', 'warning');
                }
            });
        });
    }
    
    function showSyncAlert(message, type) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="bi bi-arrow-repeat me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // 在调试信息后面插入同步提示
        $('.alert-info').after(alertHtml);
    }
    
    // --- 1. 加载本地购物车数据 ---
    
    function loadLocalCartIfNeeded() {
        // 检查页面是否显示空购物车且用户未登录
        const $emptyCart = $('.empty-cart');
        const hasServerItems = $('.cart-item-card[data-item-id]').length > 0;
        
        if ($emptyCart.length > 0 && !hasServerItems) {
            // 尝试从本地存储加载购物车
            const localCart = JSON.parse(safeGetLocalStorage('cart', '[]'));
            
            if (localCart.length > 0) {
                $emptyCart.hide();
                loadLocalCartItems(localCart);
            }
        }
    }
    
    function loadLocalCartItems(cartItems) {
        const $container = $('#cart-list-container');
        
        // 批量获取商品信息
        const productIds = cartItems.map(item => item.productId).join(',');
        
        // 从服务器获取商品详细信息
        $.ajax({
            url: `/api/products/batch?ids=${productIds}`,
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    const products = response.products;
                    
                    cartItems.forEach((item, index) => {
                        const product = products.find(p => p.id == item.productId);
                        
                        if (product) {
                            // 生成规格信息（与服务器端逻辑保持一致）
                            const specifications = generateSpecifications(product);
                            const specHtml = specifications.map(spec => 
                                `<span class="badge bg-light text-dark me-1">${spec}</span>`
                            ).join('');
                            
                            const subtotal = product.price * item.quantity;
                            
                            const cartItemHtml = `
                                <div class="cart-item-card p-3 d-flex align-items-center" data-local-id="${index}">
                                    <div class="form-check me-3">
                                        <input class="form-check-input item-select-checkbox" type="checkbox" 
                                               data-price="${product.price}" data-quantity="${item.quantity}" checked>
                                    </div>
                                    
                                    <img src="${product.image_url || 'https://via.placeholder.com/100x100?text=商品'}" 
                                         class="product-image-small me-3" alt="${product.name}">
                                    
                                    <div class="flex-grow-1">
                                        <h5 class="item-name mb-1">${product.name}</h5>
                                        <p class="text-muted small mb-1">
                                            <i class="bi bi-tags me-1"></i>
                                            ${specHtml}
                                        </p>
                                        <span class="item-price">¥ ${product.price.toFixed(2)}</span>
                                    </div>
                                    
                                    <div class="d-flex align-items-center me-4">
                                        <div class="quantity-control">
                                            <button type="button" class="btn-minus" data-local-id="${index}">-</button>
                                            <input type="text" value="${item.quantity}" class="form-control item-quantity" data-local-id="${index}" readonly>
                                            <button type="button" class="btn-plus" data-local-id="${index}">+</button>
                                        </div>
                                    </div>

                                    <div class="text-end me-4">
                                        <p class="mb-0 small text-muted">小计</p>
                                        <span class="item-subtotal item-price">¥ ${subtotal.toFixed(2)}</span>
                                    </div>
                                    
                                    <button type="button" class="btn btn-sm text-danger ms-3 btn-delete" data-local-id="${index}">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            `;
                            
                            $container.append(cartItemHtml);
                        }
                    });
                    
                    // 显示提示信息
                    $container.prepend(`
                        <div class="alert alert-info mb-3">
                            <i class="bi bi-info-circle me-2"></i>
                            您有 ${cartItems.length} 件商品保存在本地。<a href="/auth/login" class="alert-link">登录</a> 后可同步到服务器。
                        </div>
                    `);
                    
                    // 加载完成后更新总价
                    updateCartSummary();
                } else {
                    console.error('获取商品信息失败:', response.message);
                    loadFallbackLocalCart(cartItems);
                }
            },
            error: function() {
                console.error('网络错误，使用备用方案');
                loadFallbackLocalCart(cartItems);
            }
        });
    }
    
    // 备用方案：直接使用本地存储的商品信息
    function loadFallbackLocalCart(cartItems) {
        const $container = $('#cart-list-container');
        
        cartItems.forEach((item, index) => {
            const subtotal = item.price * item.quantity;
            
            const cartItemHtml = `
                <div class="cart-item-card p-3 d-flex align-items-center" data-local-id="${index}">
                    <div class="form-check me-3">
                        <input class="form-check-input item-select-checkbox" type="checkbox" 
                               data-price="${item.price}" data-quantity="${item.quantity}" checked>
                    </div>
                    
                    <img src="${item.imageUrl || 'https://via.placeholder.com/100x100?text=商品'}" 
                         class="product-image-small me-3" alt="${item.productName}">
                    
                    <div class="flex-grow-1">
                        <h5 class="item-name mb-1">${item.productName}</h5>
                        <p class="text-muted small mb-1">
                            <i class="bi bi-tags me-1"></i>
                            <span class="badge bg-light text-dark me-1">标准版</span>
                        </p>
                        <span class="item-price">¥ ${item.price.toFixed(2)}</span>
                    </div>
                    
                    <div class="d-flex align-items-center me-4">
                        <div class="quantity-control">
                            <button type="button" class="btn-minus" data-local-id="${index}">-</button>
                            <input type="text" value="${item.quantity}" class="form-control item-quantity" data-local-id="${index}" readonly>
                            <button type="button" class="btn-plus" data-local-id="${index}">+</button>
                        </div>
                    </div>

                    <div class="text-end me-4">
                        <p class="mb-0 small text-muted">小计</p>
                        <span class="item-subtotal item-price">¥ ${subtotal.toFixed(2)}</span>
                    </div>
                    
                    <button type="button" class="btn btn-sm text-danger ms-3 btn-delete" data-local-id="${index}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            
            $container.append(cartItemHtml);
        });
        
        // 显示提示信息
        $container.prepend(`
            <div class="alert alert-warning mb-3">
                <i class="bi bi-exclamation-triangle me-2"></i>
                网络连接异常，显示本地保存的购物车数据。<a href="/auth/login" class="alert-link">登录</a> 后可同步到服务器。
            </div>
        `);
        
        // 加载完成后更新总价
        updateCartSummary();
    }
    
    // 生成规格信息（与服务器端逻辑保持一致）
    function generateSpecifications(product) {
        let specifications = [];
        
        // 从商品的attributes中提取规格信息
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
        
        return specifications;
    }

    // --- 1. 核心计算函数 ---
    
    /**
     * 核心函数：计算并更新总价、小计、选中数量，刷新所有 UI 显示。
     * 每次数量、选择框变化时，都必须调用此函数。
     */
    function updateCartSummary() {
        let total = 0;
        let count = 0;
        const $allCheckboxes = $('.item-select-checkbox');
        
        // 1. 遍历所有商品卡片，计算小计并累加总价
        $allCheckboxes.each(function() {
            const $checkbox = $(this);
            const $card = $checkbox.closest('.cart-item-card');
            
            // **关键点：从 data-price 读取价格**
            const price = parseFloat($checkbox.data('price')) || 0;
            // **关键点：从 .item-quantity 的 value 属性读取数量**
            const quantity = parseInt($card.find('.item-quantity').val()) || 0; 
            
            // 计算小计并更新UI
            const subtotal = price * quantity;
            $card.find('.item-subtotal').text(`¥ ${formatPrice(subtotal)}`);
            
            // 仅对选中的商品进行汇总
            if ($checkbox.is(':checked')) {
                total += subtotal;
                count += quantity;
            }
        });

        // 2. 更新数量和总价显示
        
        // 更新所有数量显示区域
        $('#selected-count, #summary-count, #summary-final-count').text(count);

        // 更新所有总价显示区域
        $('#selected-total').text(`¥ ${formatPrice(total)}`);
        $('#summary-total').text(`¥ ${formatPrice(total)}`);
        
        // 3. 启用/禁用结算和批量删除按钮
        const isDisabled = count === 0;
        $('#checkout-btn, #summary-checkout-btn, #delete-selected-btn').prop('disabled', isDisabled);
        
        // 4. 同步“全选”复选框状态
        const totalItems = $allCheckboxes.length;
        const selectedItemsCount = $allCheckboxes.filter(':checked').length;
        const allChecked = totalItems > 0 && selectedItemsCount === totalItems;
        $('#selectAllCheckbox').prop('checked', allChecked);
    }
    
    // --- 2. 事件绑定 (使用 document 委托，确保对动态加载的商品也有效) ---

    // 绑定：数量增减按钮
    $(document).on('click', '.btn-minus, .btn-plus', function() {
        const isPlus = $(this).hasClass('btn-plus');
        const $input = $(this).siblings('.item-quantity');
        let quantity = parseInt($input.val()) || 0;
        
        if (isPlus) {
            quantity++;
        } else if (quantity > 1) {
            quantity--;
        }

        // 确保数量最小为1
        quantity = Math.max(1, quantity); 

        const localId = $(this).data('local-id');
        const itemId = $(this).data('id');
        
        // 如果是本地存储的商品，更新本地存储
        if (localId !== undefined) {
            $input.val(quantity);
            updateLocalCartQuantity(localId, quantity);
            updateCartSummary(); // 核心：数量变化后必须重新计算总价
            updateNavCartCount(); // 更新导航栏购物车数量
        }
        // 如果是服务器端的商品，调用API更新
        else if (itemId !== undefined) {
            ajaxRequest(`/api/cart/update/${itemId}`, 'PUT', { quantity: quantity },
                function(response) {
                    if (response.success) {
                        $input.val(quantity);
                        // 更新checkbox的data-quantity属性
                        const $checkbox = $(this).closest('.cart-item-card').find('.item-select-checkbox');
                        $checkbox.data('quantity', quantity);
                        updateCartSummary(); // 数量变化后重新计算总价
                        updateNavCartCount(); // 更新导航栏购物车数量
                    } else {
                        showAlert('danger', response.message || '更新数量失败');
                        // 恢复原来的数量
                        const originalQuantity = isPlus ? quantity - 1 : quantity + 1;
                        $input.val(originalQuantity);
                    }
                }.bind(this),
                function(error) {
                    showAlert('danger', '网络错误，更新失败');
                    // 恢复原来的数量
                    const originalQuantity = isPlus ? quantity - 1 : quantity + 1;
                    $input.val(originalQuantity);
                }
            );
        } else {
            // 兜底：直接更新前端
            $input.val(quantity);
            updateCartSummary();
            updateNavCartCount();
        }
    });
    
    // 更新本地存储中的商品数量
    function updateLocalCartQuantity(localId, quantity) {
        const cartItems = JSON.parse(safeGetLocalStorage('cart', '[]'));
        if (cartItems[localId]) {
            cartItems[localId].quantity = quantity;
            safeSetLocalStorage('cart', JSON.stringify(cartItems));
        }
    }

    // 绑定：单个商品选择框变化
    $(document).on('change', '.item-select-checkbox', updateCartSummary);
    
    // 绑定：“全选”复选框变化
    $('#selectAllCheckbox').on('change', function() {
        const isChecked = $(this).prop('checked');
        // 将所有商品的选择框状态设置为与全选框一致
        $('.item-select-checkbox').prop('checked', isChecked);
        updateCartSummary(); // 核心：全选状态变化后必须重新计算总价
    });

    // --- 3. 模拟删除逻辑 (保证删除后总价更新) ---
    
    // 删除单个商品
    $(document).on('click', '.btn-delete', function() {
        if (confirm('确定要从购物车中删除该商品吗？')) {
            const $card = $(this).closest('.cart-item-card');
            const localId = $(this).data('local-id');
            const itemId = $(this).data('id');
            
            // 如果是本地存储的商品，从本地存储中删除
            if (localId !== undefined) {
                removeFromLocalCart(localId);
                $card.fadeOut(300, function() {
                    $(this).remove();
                    updateCartSummary(); // 删除后重新计算总价
                    updateNavCartCount(); // 更新导航栏购物车数量
                    
                    // 如果没有商品了，显示空购物车
                    if ($('.cart-item-card').length === 0) {
                        showEmptyCart();
                    }
                });
            } 
            // 如果是服务器端的商品，调用API删除
            else if (itemId !== undefined) {
                ajaxRequest(`/api/cart/remove/${itemId}`, 'DELETE', null,
                    function(response) {
                        if (response.success) {
                            $card.fadeOut(300, function() {
                                $(this).remove();
                                updateCartSummary(); // 删除后重新计算总价
                                updateNavCartCount(); // 更新导航栏购物车数量
                                
                                // 如果没有商品了，显示空购物车
                                if ($('.cart-item-card').length === 0) {
                                    showEmptyCart();
                                }
                            });
                            showAlert('success', '商品已从购物车中删除');
                        } else {
                            showAlert('danger', response.message || '删除失败');
                        }
                    },
                    function(error) {
                        showAlert('danger', '网络错误，删除失败');
                    }
                );
            } else {
                // 兜底：直接从前端删除
                $card.fadeOut(300, function() {
                    $(this).remove();
                    updateCartSummary();
                    updateNavCartCount();
                    
                    if ($('.cart-item-card').length === 0) {
                        showEmptyCart();
                    }
                });
            }
        }
    });
    
    // 从本地存储中删除商品
    function removeFromLocalCart(localId) {
        const cartItems = JSON.parse(safeGetLocalStorage('cart', '[]'));
        cartItems.splice(localId, 1);
        safeSetLocalStorage('cart', JSON.stringify(cartItems));
    }
    
    // 显示空购物车
    function showEmptyCart() {
        $('#cart-list-container').html(`
            <div class="empty-cart text-center py-5">
                <i class="bi bi-cart-x display-1 text-muted mb-3"></i>
                <h4 class="text-muted mb-3">购物车是空的</h4>
                <a href="/shop" class="btn btn-outline-primary">去购物</a>
            </div>
        `);
    }
    
    // 批量删除
    $('#delete-selected-btn').on('click', function() {
        if (confirm('确定要删除所有选中的商品吗？')) {
            const $selectedCards = $('.item-select-checkbox:checked').closest('.cart-item-card');
            let deleteCount = 0;
            const totalCount = $selectedCards.length;
            
            $selectedCards.each(function() {
                const $card = $(this);
                const localId = $card.find('.btn-delete').data('local-id');
                const itemId = $card.find('.btn-delete').data('id');
                
                // 如果是本地存储的商品
                if (localId !== undefined) {
                    removeFromLocalCart(localId);
                    $card.fadeOut(300, function() {
                        $(this).remove();
                        deleteCount++;
                        if (deleteCount === totalCount) {
                            updateCartSummary();
                            updateNavCartCount();
                            if ($('.cart-item-card').length === 0) {
                                showEmptyCart();
                            }
                        }
                    });
                }
                // 如果是服务器端的商品
                else if (itemId !== undefined) {
                    ajaxRequest(`/api/cart/remove/${itemId}`, 'DELETE', null,
                        function(response) {
                            $card.fadeOut(300, function() {
                                $(this).remove();
                                deleteCount++;
                                if (deleteCount === totalCount) {
                                    updateCartSummary();
                                    updateNavCartCount();
                                    if ($('.cart-item-card').length === 0) {
                                        showEmptyCart();
                                    }
                                }
                            });
                        },
                        function(error) {
                            console.error('删除商品失败:', error);
                            deleteCount++;
                            if (deleteCount === totalCount) {
                                updateCartSummary();
                                updateNavCartCount();
                            }
                        }
                    );
                } else {
                    // 兜底：直接删除
                    $card.fadeOut(300, function() {
                        $(this).remove();
                        deleteCount++;
                        if (deleteCount === totalCount) {
                            updateCartSummary();
                            updateNavCartCount();
                            if ($('.cart-item-card').length === 0) {
                                showEmptyCart();
                            }
                        }
                    });
                }
            });
            
            if (totalCount > 0) {
                showAlert('success', `正在删除 ${totalCount} 件商品...`);
            }
        }
    });

    // 去结算按钮
    $(document).on('click', '#checkout-btn, #summary-checkout-btn', function() {
        const $selectedItems = $('.item-select-checkbox:checked');
        
        if ($selectedItems.length === 0) {
            showAlert('warning', '请至少选择一件商品进行结算！');
            return;
        }
        
        // 收集选中的商品信息
        const selectedItems = [];
        $selectedItems.each(function() {
            const $checkbox = $(this);
            const $card = $checkbox.closest('.cart-item-card');
            const itemId = $card.data('item-id') || $card.data('local-id');
            const price = parseFloat($checkbox.data('price')) || 0;
            const quantity = parseInt($card.find('.item-quantity').val()) || 1;
            
            // 获取商品信息
            const name = $card.find('.item-name').text().trim();
            const imageUrl = $card.find('.product-image-small').attr('src');
            
            // 获取规格信息
            const specifications = [];
            $card.find('.badge').each(function() {
                specifications.push($(this).text().trim());
            });
            
            selectedItems.push({
                id: itemId,
                name: name,
                price: price,
                quantity: quantity,
                image_url: imageUrl,
                specifications: specifications.length > 0 ? specifications : ['标准版']
            });
        });
        
        // 将选中的商品信息保存到sessionStorage
        const checkoutData = {
            items: selectedItems,
            source: 'cart'
        };
        
        try {
            sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));
            // 跳转到订单确认页面
            window.location.href = '/checkout';
        } catch (error) {
            console.error('保存结算数据失败:', error);
            showAlert('error', '系统错误，请稍后重试');
        }
    });
    
    // 更新导航栏购物车数量
    function updateNavCartCount() {
        // 调用全局的购物车数量更新函数
        if (typeof window.updateCartCount === 'function') {
            window.updateCartCount();
        }
    }
});