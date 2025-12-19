// 订单确认页面JavaScript
$(document).ready(function() {
    // 初始化页面
    initCheckoutPage();
    
    // 绑定事件
    bindEvents();
});

// 页面初始化
function initCheckoutPage() {
    // 从URL参数或sessionStorage获取订单信息
    const orderData = getOrderData();
    
    if (!orderData || !orderData.items || orderData.items.length === 0) {
        showError('没有找到订单信息，请重新选择商品');
        return;
    }
    
    // 渲染订单商品
    renderOrderItems(orderData.items);
    
    // 计算并显示总价
    calculateTotal(orderData.items);
    
    // 加载用户地址列表
    loadUserAddresses();
}

// 获取订单数据
function getOrderData() {
    // 优先从URL参数获取（立即购买）
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('productId');
    const quantity = urlParams.get('quantity');
    
    if (productId && quantity) {
        // 立即购买模式：从服务器获取商品信息
        return getDirectBuyData(productId, quantity);
    }
    
    // 从购物车结算模式：从sessionStorage获取
    const cartData = sessionStorage.getItem('checkoutData');
    if (cartData) {
        try {
            return JSON.parse(cartData);
        } catch (e) {
            console.error('解析购物车数据失败:', e);
        }
    }
    
    return null;
}

// 获取立即购买的商品数据
function getDirectBuyData(productId, quantity) {
    let productData = null;
    
    // 同步请求获取商品信息（仅用于演示，实际应用中建议异步）
    $.ajax({
        url: `/api/products/${productId}`,
        method: 'GET',
        async: false,
        success: function(response) {
            if (response.success && response.data) {
                productData = {
                    items: [{
                        id: response.data.id,
                        name: response.data.name,
                        price: response.data.price,
                        quantity: parseInt(quantity),
                        image_url: response.data.image_url,
                        shop: response.data.shop,
                        specifications: ['标准版'] // 简化处理
                    }],
                    source: 'direct'
                };
            }
        },
        error: function() {
            console.error('获取商品信息失败');
        }
    });
    
    return productData;
}

// 渲染订单商品列表
function renderOrderItems(items) {
    const $container = $('#order-items-list');
    $container.empty();
    
    // 按店铺分组
    const shopGroups = groupItemsByShop(items);
    
    Object.keys(shopGroups).forEach(shopName => {
        const shopItems = shopGroups[shopName];
        const shopInfo = shopItems[0].shop || { name: shopName };
        
        const shopHtml = `
            <div class="shop-group mb-4">
                <div class="shop-header d-flex align-items-center mb-3 p-2 bg-light rounded">
                    <div class="shop-logo me-3">
                        <img src="${shopInfo.logo_url || '/images/product-default.svg'}" 
                             alt="${shopInfo.name}" 
                             style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;"
                             onerror="this.src='/images/product-default.svg'">
                    </div>
                    <div class="shop-info">
                        <h6 class="mb-0 text-primary">
                            <i class="bi bi-shop me-1"></i>${shopInfo.name || shopName}
                        </h6>
                        <small class="text-muted">
                            <i class="bi bi-shield-check me-1"></i>官方认证
                        </small>
                    </div>
                </div>
                
                <div class="shop-items">
                    ${shopItems.map(item => renderOrderItem(item)).join('')}
                </div>
            </div>
        `;
        
        $container.append(shopHtml);
    });
}

// 按店铺分组商品
function groupItemsByShop(items) {
    const groups = {};
    
    items.forEach(item => {
        const shopName = item.shop ? item.shop.name : '自营店';
        if (!groups[shopName]) {
            groups[shopName] = [];
        }
        groups[shopName].push(item);
    });
    
    return groups;
}

// 渲染单个订单商品
function renderOrderItem(item) {
    const specifications = item.specifications || ['标准版'];
    const specHtml = specifications.map(spec => 
        `<span class="badge bg-light text-dark me-1">${spec}</span>`
    ).join('');
    
    const subtotal = item.price * item.quantity;
    
    return `
        <div class="order-item d-flex align-items-center p-3 border rounded mb-2" data-item-id="${item.id}">
            <img src="${item.image_url || '/images/product-default.svg'}" 
                 alt="${item.name}" 
                 class="item-image me-3"
                 style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;"
                 onerror="this.src='/images/product-default.svg'">
            
            <div class="item-info flex-grow-1">
                <h6 class="item-name mb-2">${item.name}</h6>
                <div class="item-specs mb-2">
                    ${specHtml}
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <div class="item-price">
                        <span class="text-muted">单价：</span>
                        <span class="fw-bold text-primary">¥${formatPrice(item.price)}</span>
                    </div>
                    <div class="item-quantity">
                        <span class="text-muted">数量：</span>
                        <span class="fw-bold">${item.quantity}</span>
                    </div>
                    <div class="item-subtotal">
                        <span class="text-muted">小计：</span>
                        <span class="fw-bold text-danger">¥${formatPrice(subtotal)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 计算并显示总价
function calculateTotal(items) {
    let subtotal = 0;
    
    items.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    
    const shipping = 0; // 免运费
    const discount = 0; // 暂无优惠
    const total = subtotal - discount + shipping;
    
    // 更新显示
    $('#subtotal-amount').text(`¥ ${formatPrice(subtotal)}`);
    $('#shipping-amount').text(shipping > 0 ? `¥ ${formatPrice(shipping)}` : '免运费');
    $('#discount-amount').text(`-¥ ${formatPrice(discount)}`);
    $('#total-amount').text(`¥ ${formatPrice(total)}`);
    
    // 保存总价信息
    window.orderTotal = {
        subtotal: subtotal,
        shipping: shipping,
        discount: discount,
        total: total
    };
}

// 绑定事件
function bindEvents() {
    // 地址选择
    $(document).on('click', '.address-item', function() {
        $('.address-item').removeClass('address-selected');
        $(this).addClass('address-selected');
        $(this).find('.address-radio').prop('checked', true);
    });
    
    // 支付方式选择
    $(document).on('click', '.payment-option', function() {
        $('.payment-option').removeClass('border-primary');
        $(this).addClass('border-primary');
        $(this).find('input[type="radio"]').prop('checked', true);
    });
    
    // 使用新地址
    $('#btn-use-new-address').on('click', function() {
        showAddressForm();
    });
    
    // 管理地址
    $('#btn-manage-address').on('click', function() {
        showAlert('info', '地址管理功能开发中...');
    });
    
    // 选择优惠券
    $('#btn-coupon').on('click', function() {
        showCouponModal();
    });
    
    // 提交订单
    $('#btn-submit-order').on('click', function() {
        submitOrder();
    });
    
    // 添加第一个地址
    $('#btn-add-first-address').on('click', function() {
        showAddressForm();
    });
}

// 显示地址表单
function showAddressForm(editAddress = null) {
    const modalHtml = `
        <div class="modal fade" id="addressModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${editAddress ? '编辑收货地址' : '添加收货地址'}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addressForm">
                            <div class="mb-3">
                                <label class="form-label">收货人姓名</label>
                                <input type="text" class="form-control" id="receiverName" value="${editAddress ? editAddress.receiver_name : ''}" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">手机号码</label>
                                <input type="tel" class="form-control" id="receiverPhone" value="${editAddress ? editAddress.receiver_phone : ''}" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">所在地区</label>
                                <div class="row">
                                    <div class="col-4">
                                        <select class="form-select" id="province" required>
                                            <option value="">省份</option>
                                            <option value="四川省" ${editAddress && editAddress.province === '四川省' ? 'selected' : ''}>四川省</option>
                                            <option value="北京市" ${editAddress && editAddress.province === '北京市' ? 'selected' : ''}>北京市</option>
                                            <option value="上海市" ${editAddress && editAddress.province === '上海市' ? 'selected' : ''}>上海市</option>
                                            <option value="广东省" ${editAddress && editAddress.province === '广东省' ? 'selected' : ''}>广东省</option>
                                            <option value="浙江省" ${editAddress && editAddress.province === '浙江省' ? 'selected' : ''}>浙江省</option>
                                        </select>
                                    </div>
                                    <div class="col-4">
                                        <select class="form-select" id="city" required>
                                            <option value="">城市</option>
                                            <option value="成都市" ${editAddress && editAddress.city === '成都市' ? 'selected' : ''}>成都市</option>
                                            <option value="泸州市" ${editAddress && editAddress.city === '泸州市' ? 'selected' : ''}>泸州市</option>
                                            <option value="北京市" ${editAddress && editAddress.city === '北京市' ? 'selected' : ''}>北京市</option>
                                            <option value="上海市" ${editAddress && editAddress.city === '上海市' ? 'selected' : ''}>上海市</option>
                                            <option value="广州市" ${editAddress && editAddress.city === '广州市' ? 'selected' : ''}>广州市</option>
                                            <option value="深圳市" ${editAddress && editAddress.city === '深圳市' ? 'selected' : ''}>深圳市</option>
                                            <option value="杭州市" ${editAddress && editAddress.city === '杭州市' ? 'selected' : ''}>杭州市</option>
                                        </select>
                                    </div>
                                    <div class="col-4">
                                        <select class="form-select" id="district" required>
                                            <option value="">区县</option>
                                            <option value="双流区" ${editAddress && editAddress.district === '双流区' ? 'selected' : ''}>双流区</option>
                                            <option value="江阳区" ${editAddress && editAddress.district === '江阳区' ? 'selected' : ''}>江阳区</option>
                                            <option value="朝阳区" ${editAddress && editAddress.district === '朝阳区' ? 'selected' : ''}>朝阳区</option>
                                            <option value="浦东新区" ${editAddress && editAddress.district === '浦东新区' ? 'selected' : ''}>浦东新区</option>
                                            <option value="天河区" ${editAddress && editAddress.district === '天河区' ? 'selected' : ''}>天河区</option>
                                            <option value="南山区" ${editAddress && editAddress.district === '南山区' ? 'selected' : ''}>南山区</option>
                                            <option value="西湖区" ${editAddress && editAddress.district === '西湖区' ? 'selected' : ''}>西湖区</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">详细地址</label>
                                <textarea class="form-control" id="detailAddress" rows="3" required>${editAddress ? editAddress.detail_address : ''}</textarea>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="setDefault" ${editAddress && editAddress.is_default ? 'checked' : ''}>
                                <label class="form-check-label" for="setDefault">
                                    设为默认地址
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="btn-save-address">${editAddress ? '更新地址' : '保存地址'}</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('body').append(modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('addressModal'));
    modal.show();
    
    // 保存地址
    $('#btn-save-address').on('click', function() {
        const formData = {
            receiverName: $('#receiverName').val().trim(),
            receiverPhone: $('#receiverPhone').val().trim(),
            province: $('#province').val(),
            city: $('#city').val(),
            district: $('#district').val(),
            detailAddress: $('#detailAddress').val().trim(),
            isDefault: $('#setDefault').is(':checked')
        };
        
        // 验证必填字段
        if (!formData.receiverName || !formData.receiverPhone || !formData.province || !formData.city || !formData.district || !formData.detailAddress) {
            showAlert('warning', '请填写完整的地址信息');
            return;
        }
        
        // 验证手机号格式
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(formData.receiverPhone)) {
            showAlert('warning', '请输入正确的手机号码');
            return;
        }
        
        // 保存到服务器
        if (editAddress) {
            saveAddressToServer(formData, true, editAddress.id);
        } else {
            saveAddressToServer(formData, false);
        }
    });
    
    // 模态框关闭时移除DOM
    $('#addressModal').on('hidden.bs.modal', function() {
        $(this).remove();
    });
}



// 显示优惠券选择
function showCouponModal() {
    const modalHtml = `
        <div class="modal fade" id="couponModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">选择优惠券</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="coupon-list">
                            <div class="coupon-item p-3 border rounded mb-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="mb-1 text-danger">满100减10元</h6>
                                        <small class="text-muted">有效期至 2024-12-31</small>
                                    </div>
                                    <button class="btn btn-outline-primary btn-sm">使用</button>
                                </div>
                            </div>
                            
                            <div class="coupon-item p-3 border rounded mb-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="mb-1 text-danger">新用户专享8折</h6>
                                        <small class="text-muted">有效期至 2024-12-31</small>
                                    </div>
                                    <button class="btn btn-outline-primary btn-sm">使用</button>
                                </div>
                            </div>
                            
                            <div class="text-center py-4 text-muted">
                                <i class="bi bi-ticket-perforated display-4"></i>
                                <p class="mt-2">暂无可用优惠券</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('body').append(modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('couponModal'));
    modal.show();
    
    // 模态框关闭时移除DOM
    $('#couponModal').on('hidden.bs.modal', function() {
        $(this).remove();
    });
}

// 提交订单
function submitOrder() {
    // 验证必填信息
    const selectedAddress = $('input[name="selectedAddress"]:checked').val();
    const selectedPayment = $('input[name="paymentMethod"]:checked').val();
    
    if (!selectedAddress) {
        showAlert('warning', '请选择收货地址');
        return;
    }
    
    if (!selectedPayment) {
        showAlert('warning', '请选择支付方式');
        return;
    }
    
    // 获取订单数据
    const orderData = getOrderData();
    if (!orderData || !orderData.items) {
        showAlert('error', '订单信息异常，请重新下单');
        return;
    }
    
    // 构建订单提交数据
    const submitData = {
        items: orderData.items.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price
        })),
        addressId: selectedAddress,
        paymentMethod: selectedPayment,
        totalAmount: window.orderTotal ? window.orderTotal.total : 0,
        source: orderData.source || 'cart'
    };
    
    // 显示提交中状态
    const $submitBtn = $('#btn-submit-order');
    const originalText = $submitBtn.html();
    $submitBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split me-2"></i>提交中...');
    
    // 添加调试信息
    console.log('提交订单数据:', submitData);
    
    // 调用API提交订单
    ajaxRequest('/api/orders/create', 'POST', submitData,
        function(response) {
            console.log('订单提交响应:', response);
            if (response.success) {
                showAlert('success', '订单提交成功！');
                
                // 清除购物车数据（如果是从购物车来的）
                if (orderData.source === 'cart') {
                    sessionStorage.removeItem('checkoutData');
                }
                
                // 跳转到订单列表页面
                setTimeout(() => {
                    window.location.href = `/user/orders`;
                }, 2000);
            } else {
                console.error('订单提交失败:', response);
                showAlert('error', response.message || '订单提交失败');
                $submitBtn.prop('disabled', false).html(originalText);
            }
        },
        function(error) {
            console.error('网络错误:', error);
            showAlert('error', '网络错误，请稍后重试');
            $submitBtn.prop('disabled', false).html(originalText);
        }
    );
}

// 显示错误信息
function showError(message) {
    $('#order-items-list').html(`
        <div class="text-center py-5">
            <i class="bi bi-exclamation-triangle text-warning display-1"></i>
            <h5 class="mt-3 text-muted">${message}</h5>
            <a href="/cart" class="btn btn-primary mt-3">返回购物车</a>
        </div>
    `);
}

// 加载用户地址列表
function loadUserAddresses() {
    ajaxRequest('/api/addresses', 'GET', null,
        function(response) {
            if (response.success && response.data) {
                renderAddressList(response.data);
            }
        },
        function(error) {
            console.error('加载地址列表失败:', error);
        }
    );
}

// 渲染地址列表
function renderAddressList(addresses) {
    const $container = $('#address-list');
    
    if (!addresses || addresses.length === 0) {
        $container.html(`
            <div class="text-center py-4">
                <i class="bi bi-geo-alt text-muted display-4"></i>
                <p class="text-muted mt-2">暂无收货地址</p>
                <button class="btn btn-primary" id="btn-add-first-address">添加收货地址</button>
            </div>
        `);
        
        // 重新绑定事件
        $('#btn-add-first-address').on('click', function() {
            showAddressForm();
        });
        return;
    }
    
    let html = '';
    addresses.forEach((address, index) => {
        const isSelected = address.is_default || index === 0;
        html += `
            <div class="address-item p-3 border rounded mb-3 ${isSelected ? 'address-selected' : ''}" data-address-id="${address.id}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center mb-2">
                            ${address.is_default ? '<span class="badge bg-primary me-2">默认</span>' : ''}
                            <strong>${address.province} ${address.city} ${address.district}</strong>
                        </div>
                        <div class="text-muted mb-2">${address.detail_address}</div>
                        <div class="d-flex align-items-center">
                            <span class="me-3">${address.receiver_name} ${address.receiver_phone}</span>
                            <div class="address-actions">
                                <button class="btn btn-sm btn-outline-primary me-2" onclick="editAddress(${address.id})">编辑</button>
                                ${!address.is_default ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteAddress(${address.id})">删除</button>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input address-radio" type="radio" name="selectedAddress" value="${address.id}" ${isSelected ? 'checked' : ''}>
                    </div>
                </div>
            </div>
        `;
    });
    
    $container.html(html);
}

// 保存地址到服务器
function saveAddressToServer(addressData, isEdit = false, addressId = null) {
    const url = isEdit ? `/api/addresses/${addressId}` : '/api/addresses';
    const method = isEdit ? 'PUT' : 'POST';
    
    ajaxRequest(url, method, addressData,
        function(response) {
            if (response.success) {
                showAlert('success', isEdit ? '地址更新成功' : '地址添加成功');
                
                // 重新加载地址列表
                loadUserAddresses();
                
                // 关闭模态框
                const modal = bootstrap.Modal.getInstance(document.getElementById('addressModal'));
                if (modal) {
                    modal.hide();
                }
            } else {
                showAlert('error', response.message || '操作失败');
            }
        },
        function(error) {
            showAlert('error', error || '网络错误，请稍后重试');
        }
    );
}

// 编辑地址
function editAddress(addressId) {
    // 获取地址信息
    ajaxRequest(`/api/addresses`, 'GET', null,
        function(response) {
            if (response.success && response.data) {
                const address = response.data.find(addr => addr.id === addressId);
                if (address) {
                    showAddressForm(address);
                }
            }
        },
        function(error) {
            showAlert('error', '获取地址信息失败');
        }
    );
}

// 删除地址
function deleteAddress(addressId) {
    if (confirm('确定要删除这个地址吗？')) {
        ajaxRequest(`/api/addresses/${addressId}`, 'DELETE', null,
            function(response) {
                if (response.success) {
                    showAlert('success', '地址删除成功');
                    loadUserAddresses();
                } else {
                    showAlert('error', response.message || '删除失败');
                }
            },
            function(error) {
                showAlert('error', '网络错误，请稍后重试');
            }
        );
    }
}

// 显示提示信息
function showAlert(type, message) {
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'error' ? 'alert-danger' : 
                      type === 'warning' ? 'alert-warning' : 'alert-info';
    
    const icon = type === 'success' ? 'bi-check-circle' : 
                 type === 'error' ? 'bi-exclamation-triangle' : 
                 type === 'warning' ? 'bi-exclamation-triangle' : 'bi-info-circle';
    
    const alertHtml = `
        <div class="alert ${alertClass} alert-dismissible fade show position-fixed" 
             style="top: 100px; right: 20px; z-index: 1050; min-width: 300px;">
            <i class="bi ${icon} me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    $('body').append(alertHtml);
    
    // 3秒后自动消失
    setTimeout(() => {
        $('.alert').fadeOut(300, function() {
            $(this).remove();
        });
    }, 3000);
}