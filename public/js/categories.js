// 分类列表页：每个分类展示一行示例商品
$(document).ready(function() {
    loadAllCategories();
});

function loadAllCategories() {
    const $container = $('#all-categories');
    ajaxRequest('/api/categories', 'GET', null,
        function(response) {
            const categories = response.data || [];
            if (categories.length === 0) {
                $container.html(`
                    <div class="col-12 text-center py-5">
                        <i class="bi bi-folder-x" style="font-size: 4rem; color: var(--primary-light);"></i>
                        <p class="text-muted mt-3">暂无分类</p>
                    </div>
                `);
                return;
            }

            let html = '';
            categories.forEach(cat => {
                html += `
                    <div class="category-sample-block mb-3" data-cat-id="${cat.id}">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div class="d-flex align-items-center gap-2">
                                <button class="btn btn-sm btn-outline-secondary cat-toggle" data-cat-id="${cat.id}" aria-expanded="true" aria-controls="cat-collapse-${cat.id}" title="折叠/展开">
                                    <i class="bi bi-chevron-down"></i>
                                </button>
                                <a class="d-flex align-items-center gap-2 text-decoration-none ms-2" href="/category/${cat.id}">
                                    <i class="bi bi-${cat.icon || 'box'}" style="font-size:1.25rem;color:var(--primary-color);"></i>
                                    <span class="category-sample-title mb-0">${cat.name}</span>
                                </a>
                            </div>
                            <a class="text-decoration-none" href="/category/${cat.id}" style="color: var(--primary-color);">
                                更多 <i class="bi bi-arrow-right"></i>
                            </a>
                        </div>
                        <div id="cat-collapse-${cat.id}" class="cat-collapse show">
                            <div class="category-sample-row" id="cat-row-${cat.id}">
                                ${renderSamplePlaceholders()}
                            </div>
                        </div>
                    </div>
                `;
            });
            $container.html(html);

                // 构建顶部小分类栏
                const $mini = $('#category-mini-bar');
                if ($mini.length) {
                    let miniHtml = '';
                    categories.forEach(cat => {
                        miniHtml += `<a href="#" class="mini-cat-pill" data-cat-id="${cat.id}" title="${cat.name}">
                            <i class="bi bi-${cat.icon || 'grid-1x2'}"></i>
                            <span class="d-none d-sm-inline">${cat.name}</span>
                        </a>`;
                    });
                    $mini.html(miniHtml);

                    // 点击平滑滚动到对应分类块（如果被折叠则先展开）
                    $mini.off('click', '.mini-cat-pill').on('click', '.mini-cat-pill', function(e) {
                        e.preventDefault();
                        const id = $(this).data('cat-id');
                        const $block = $(`.category-sample-block[data-cat-id="${id}"]`);
                        if (!$block.length) return;
                        const $collapse = $(`#cat-collapse-${id}`);
                        if ($collapse.length && !$collapse.is(':visible')) {
                            // 展开折叠区再滚动
                            $collapse.slideDown(220);
                            // update toggle state
                            $block.find('.cat-toggle').attr('aria-expanded', 'true');
                        }
                        // 读取 CSS 变量 nav-height 作为偏移
                        const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 84;
                        const top = $block.offset().top - navH - 12;
                        $('html, body').animate({ scrollTop: top }, 360);
                        // active 状态
                        $mini.find('.mini-cat-pill').removeClass('active');
                        $(this).addClass('active');
                    });
                    

                }

                // 绑定折叠/展开行为（手风琴）
                $container.off('click', '.cat-toggle').on('click', '.cat-toggle', function(e) {
                    e.preventDefault();
                    const id = $(this).data('cat-id');
                    const $collapse = $(`#cat-collapse-${id}`);
                    if (!$collapse.length) return;
                    // Toggle with slide animation
                    if ($collapse.is(':visible')) {
                        $collapse.slideUp(200);
                        $(this).attr('aria-expanded', 'false');
                    } else {
                        $collapse.slideDown(200);
                        $(this).attr('aria-expanded', 'true');
                    }
                    // rotate icon
                    $(this).find('.bi').toggleClass('rotated');
                });

            // 逐个加载分类示例商品
            categories.forEach(cat => loadCategorySampleProducts(cat.id));
        },
        function(message) {
            $container.html(`<div class="col-12 text-danger">${message}</div>`);
        }
    );
}

function renderSamplePlaceholders() {
    return `
        <div class="loading-placeholder" style="width:180px;height:210px;border-radius:14px;"></div>
        <div class="loading-placeholder" style="width:180px;height:210px;border-radius:14px;"></div>
        <div class="loading-placeholder" style="width:180px;height:210px;border-radius:14px;"></div>
    `;
}

function loadCategorySampleProducts(categoryId) {
    const rowId = `#cat-row-${categoryId}`;
    ajaxRequest(`/api/products?category_id=${categoryId}&sort=created_at&order=DESC&limit=5`, 'GET', null,
        function(response) {
            const products = response.data || [];
            if (products.length === 0) {
                $(rowId).html(`<p class="text-muted mb-2">该分类暂无商品</p>`);
                return;
            }
            let items = '';
            products.forEach(product => {
                const imgSrc = product.image_url || '/images/product-default.svg';
                items += `
                    <a href="/product/${product.id}" class="product-card-link sample-product-card">
                        <article class="card product-card h-100">
                            <div class="product-image-wrap">
                                <img src="${imgSrc}"
                                     class="card-img-top product-image"
                                     alt="${(product.name||'商品').replace(/"/g,'') }"
                                     onerror="this.onerror=null;this.src='/images/product-default.svg'">
                            </div>
                            <div class="card-body d-flex flex-column">
                                <h5 class="card-title">${product.name}</h5>
                                <p class="card-text">${product.description || '优质商品'}</p>
                                <div class="d-flex align-items-center gap-2 mt-auto">
                                    <span class="product-price">${formatPrice(product.price)}</span>
                                </div>
                            </div>
                        </article>
                    </a>
                `;
            });
            $(rowId).html(items);
        },
        function() {
            $(rowId).html(`<p class="text-danger mb-2">加载失败</p>`);
        }
    );
}


