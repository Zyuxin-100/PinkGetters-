// 首页JavaScript

$(document).ready(function() {
    // 加载商品分类
    loadCategories();
    
    // 加载热榜
    loadHotRank();
    
    // 加载推荐商品
    loadFeaturedProducts();
    
    // 加载最新商品
    loadLatestProducts();
});

// 加载热销/大家都在看
function loadHotRank() {
    ajaxRequest('/api/products?sort=created_at&order=DESC&limit=10', 'GET', null,
        function(response) {
            renderHotRank(response.data || []);
        },
        function(message) {
            $('#hot-rank-list').html(`<div class="text-center text-danger py-4">${message}</div>`);
        }
    );
}

function renderHotRank(products) {
    const $wrap = $('#hot-rank-list');
    if (!products.length) {
        $wrap.html(`<div class="text-center text-muted py-4">暂无热榜商品</div>`);
        return;
    }
        let html = '<ul class="list-unstyled mb-0 hot-rank-ul">';
    products.forEach((p, idx) => {
            const thumb = p.image_url || '/images/product-default.svg';
            const sold = p.sold ? `· 已售 ${p.sold}` : '';
            html += `
            <li class="hot-rank-item d-flex align-items-center gap-3" onclick="window.location.href='/product/${p.id}'">
                <div class="hot-rank-order ${idx < 3 ? 'top' : ''}">${idx + 1}</div>
                <img class="hot-rank-thumb" src="${thumb}" alt="${(p.name||'').replace(/"/g,'')}" onerror="this.src='/images/product-default.svg'">
                <div class="flex-grow-1">
                    <div class="hot-rank-title" title="${(p.name||'').replace(/"/g,'')}">${p.name}</div>
                    <div class="d-flex align-items-center justify-content-between">
                        <div class="hot-rank-price">¥${formatPrice(p.price)}</div>
                        <div class="hot-rank-meta text-muted small">${sold}</div>
                    </div>
                </div>
            </li>
            `;
    });
    html += '</ul>';
    $wrap.html(html);
}

// 加载商品分类
function loadCategories() {
    ajaxRequest('/api/categories', 'GET', null,
        function(response) {
            const categories = response.data || [];
            const $container = $('#categories-scroll-view');
            
            if (categories.length === 0) {
                $container.html(`
                    <div class="text-center py-5 w-100">
                        <i class="bi bi-folder-x" style="font-size: 4rem; color: var(--primary-light);"></i>
                        <p class="text-muted mt-3">暂无分类</p>
                    </div>
                `);
                return;
            }
            
            // Render all categories as horizontal slots
            let html = '';
            categories.forEach(category => {
                html += `
                    <div class="cat-slot">
                        <div class="category-card">
                            <i class="bi bi-${category.icon || 'box'}"></i>
                            <h5>${category.name}</h5>
                            <a href="/category/${category.id}" class="btn btn-sm">查看商品</a>
                        </div>
                    </div>
                `;
            });

            $container.html(html);
        },
        function(message) {
            $('#categories-scroll-view').html(`<div class="text-danger w-100"><p class="text-danger">${message}</p></div>`);
        }
    );
}

// 加载推荐商品（按最新排序，取前4个）
function loadFeaturedProducts() {
    console.debug('[index] loading featured products');
    ajaxRequest('/api/products?sort=created_at&order=DESC&limit=10', 'GET', null,
        function(response) {
            console.debug('[index] featured products response:', response);
            renderProducts(response.data || [], '#featured-products');
        },
        function(message) {
            console.warn('[index] load featured products error:', message);
            $('#featured-products').html(`<div class="col-12 text-danger">${message}</div>`);
        }
    );
}

// 加载最新商品（按创建时间降序，取前8个）
function loadLatestProducts() {
    console.debug('[index] loading latest products');
    ajaxRequest('/api/products?sort=created_at&order=DESC&limit=20', 'GET', null,
        function(response) {
            console.debug('[index] latest products response:', response);
            renderProducts(response.data || [], '#latest-products');
        },
        function(message) {
            console.warn('[index] load latest products error:', message);
            $('#latest-products').html(`<div class="col-12 text-danger">${message}</div>`);
        }
    );
}

// 渲染商品列表
function renderProducts(products, containerSelector) {
    const $container = $(containerSelector);
    
    if (products.length === 0) {
        $container.html(`
            <div class="col-12 text-center py-5">
                <i class="bi bi-inbox" style="font-size: 4rem; color: var(--primary-light);"></i>
                <p class="text-muted mt-3">暂无商品，敬请期待</p>
            </div>
        `);
        return;
    }
    
    let html = '<div class="row g-4">';
    products.forEach(product => {
        //加载真正的商品图
        const imgSrc = product.image_url;

        html += `
            <div class="col-6 col-sm-4 col-md-3 col-lg-2-4" role="listitem">
                <a href="/product/${product.id}" class="product-card-link" aria-label="查看 ${product.name}">
                    <article class="card product-card h-100">
                        <div class="product-image-wrap">
                            <img src="${imgSrc}"
                                 class="card-img-top product-image"
                                 alt="${(product.name||'商品').replace(/"/g,'') }"
                                 onerror="this.onerror=null;this.src='/images/product-default.svg'">
                        </div>
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${product.name}</h5>
                            <p class="card-text">${product.description || '优质商品，值得拥有'}</p>
                            <div class="d-flex align-items-center gap-2 mt-auto">
                                <span class="product-price">${formatPrice(product.price)}</span>
                            </div>
                        </div>
                    </article>
                </a>
            </div>
        `;
    });
    html += '</div>';
    
    $container.html(html);
}

