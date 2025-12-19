// 登录页面JavaScript

$(document).ready(function() {
    const $loginForm = $('#loginForm');
    const $errorAlert = $('#errorAlert');
    
    // 表单提交处理
    $loginForm.on('submit', function(e) {
        e.preventDefault();
        
        // 清除之前的错误信息
        $errorAlert.addClass('d-none');
        $('.is-invalid').removeClass('is-invalid');
        
        const formData = {
            username: $('#username').val().trim(),
            password: $('#password').val(),
            rememberMe: $('#rememberMe').is(':checked')
        };
        
        // 基本验证
        if (!formData.username) {
            showFieldError('username', '请输入用户名');
            return;
        }
        
        if (!formData.password) {
            showFieldError('password', '请输入密码');
            return;
        }
        
        // 显示加载状态
        const $submitBtn = $loginForm.find('button[type="submit"]');
        const originalText = $submitBtn.html();
        $submitBtn.prop('disabled', true).html('<span class="loading"></span> 登录中...');
        
        // 发送登录请求
        ajaxRequest('/auth/login', 'POST', formData,
            function(response) {
                // 登录成功
                console.log('登录成功，响应:', response);
                showAlert('success', '登录成功，正在跳转...');
                
                // 获取重定向URL，优先使用服务器返回的URL
                const urlParams = new URLSearchParams(window.location.search);
                const redirect = response.redirectUrl || urlParams.get('redirect') || '/user/home';
                
                console.log('准备跳转到:', redirect);
                setTimeout(() => {
                    console.log('执行跳转');
                    window.location.href = redirect;
                }, 500);
            },
            function(message) {
                // 登录失败
                $errorAlert.removeClass('d-none').text(message);
                $submitBtn.prop('disabled', false).html(originalText);
            }
        );
    });
    
    // 显示字段错误
    function showFieldError(fieldName, message) {
        const $field = $('#' + fieldName);
        $field.addClass('is-invalid');
        $field.siblings('.invalid-feedback').text(message);
    }
});

