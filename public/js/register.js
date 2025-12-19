// 注册页面JavaScript

$(document).ready(function() {
    const $registerForm = $('#registerForm');
    const $errorAlert = $('#errorAlert');
    
    // 辅助函数：显示字段错误
    function showFieldError(fieldName, message) {
        const $field = $('#' + fieldName);
        $field.addClass('is-invalid');
        $field.next('.invalid-feedback').text(message);
    }

    // 辅助函数：清除字段错误
    function clearFieldError(fieldName) {
        const $field = $('#' + fieldName);
        $field.removeClass('is-invalid is-valid');
        $field.next('.invalid-feedback').empty();
    }
    
    // 辅助函数：显示字段成功
    function showFieldSuccess(fieldName) {
        const $field = $('#' + fieldName);
        $field.removeClass('is-invalid').addClass('is-valid');
    }
    
    // 检查用户名是否可用
    function checkUsernameAvailability(username) {
        if (!username || username.length < 3) return;
        
        ajaxRequest('/auth/check-username', 'POST', { username },
            function(response) {
                if (response.available) {
                    showFieldSuccess('username');
                } else {
                    showFieldError('username', response.message);
                }
            },
            function(error) {
                console.error('检查用户名失败:', error);
            }
        );
    }
    
    // 检查邮箱是否可用
    function checkEmailAvailability(email) {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
        
        ajaxRequest('/auth/check-email', 'POST', { email },
            function(response) {
                if (response.available) {
                    showFieldSuccess('email');
                } else {
                    showFieldError('email', response.message);
                }
            },
            function(error) {
                console.error('检查邮箱失败:', error);
            }
        );
    }
    
    // 显示详细错误信息
    function showDetailedErrors(mainMessage, errorFields) {
        const $errorAlert = $('#errorAlert');
        const $errorMessage = $('#errorMessage');
        const $errorList = $('#errorList');
        
        $errorMessage.text(mainMessage);
        
        if (errorFields && errorFields.length > 0) {
            const fieldNames = {
                'username': '用户名',
                'email': '邮箱',
                'phone': '手机号',
                'password': '密码',
                'confirmPassword': '确认密码'
            };
            
            let listHtml = '';
            errorFields.forEach(error => {
                const fieldDisplayName = fieldNames[error.field] || error.field;
                listHtml += `<li><strong>${fieldDisplayName}:</strong> ${error.message}</li>`;
            });
            
            $errorList.html(listHtml).removeClass('d-none');
        } else {
            $errorList.addClass('d-none');
        }
        
        $errorAlert.removeClass('d-none');
    }
    
    // 显示简单错误信息
    function showSimpleError(message) {
        const $errorAlert = $('#errorAlert');
        const $errorMessage = $('#errorMessage');
        const $errorList = $('#errorList');
        
        $errorMessage.text(message);
        $errorList.addClass('d-none');
        $errorAlert.removeClass('d-none');
    }
    
    // 清除所有错误信息
    function clearAllErrors() {
        const $errorAlert = $('#errorAlert');
        const $errorMessage = $('#errorMessage');
        const $errorList = $('#errorList');
        
        $errorAlert.addClass('d-none');
        $errorMessage.text('');
        $errorList.addClass('d-none').empty();
        
        // 清除所有字段的错误状态
        $('.form-control').removeClass('is-invalid is-valid');
        $('.invalid-feedback').empty();
    }
    
    // 实时验证单个字段的函数
    function validateField(fieldName) {
        let isValid = true;
        const value = $('#' + fieldName).val().trim();
        const password = $('#password').val();
        const confirmPassword = $('#confirmPassword').val();
        
        clearFieldError(fieldName); // 每次验证前先清除错误

        switch (fieldName) {
            case 'username':
                if (!value) {
                    showFieldError(fieldName, '请输入用户名');
                    isValid = false;
                } else if (value.length < 3 || value.length > 20) {
                    showFieldError(fieldName, '用户名长度应在3-20个字符之间');
                    isValid = false;
                } else if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(value)) {
                    showFieldError(fieldName, '用户名只能包含字母、数字、下划线和中文');
                    isValid = false;
                }
                break;
                
            case 'email':
                if (!value) {
                    showFieldError(fieldName, '请输入邮箱地址');
                    isValid = false;
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    showFieldError(fieldName, '请输入正确的邮箱格式');
                    isValid = false;
                }
                break;

            case 'password':
                if (!value) {
                    showFieldError(fieldName, '请输入密码');
                    isValid = false;
                } else if (value.length < 6 || value.length > 20) {
                    showFieldError(fieldName, '密码长度应在6-20个字符之间');
                    isValid = false;
                } else if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,20}$/.test(value)) {
                    showFieldError(fieldName, '密码必须包含至少一个字母和一个数字');
                    isValid = false;
                }
                // 如果密码字段发生变化，且确认密码字段已有内容，也要验证确认密码
                if (confirmPassword && password !== confirmPassword) {
                    validateField('confirmPassword');
                }
                break;

            case 'confirmPassword':
                if (!confirmPassword) {
                    showFieldError(fieldName, '请确认密码');
                    isValid = false;
                } else if (password !== confirmPassword) {
                    showFieldError(fieldName, '两次输入的密码不一致');
                    isValid = false;
                }
                break;
                
            case 'phone':
                // 手机号是可选的，但如果填写了就要验证格式
                if (value && !/^1[3-9]\d{9}$/.test(value)) {
                    showFieldError(fieldName, '请输入正确的手机号码');
                    isValid = false;
                }
                break;
        }

        return isValid;
    }

    // --- 实时检测绑定 ---
    // 绑定到 blur (失去焦点) 事件，当用户完成输入切换到其他字段时触发
    $('#username').on('blur', function() {
        const username = $(this).val().trim();
        if (validateField('username')) {
            // 只有基本验证通过后才检查可用性
            setTimeout(() => checkUsernameAvailability(username), 300);
        }
    });
    
    $('#email').on('blur', function() {
        const email = $(this).val().trim();
        if (validateField('email')) {
            // 只有基本验证通过后才检查可用性
            setTimeout(() => checkEmailAvailability(email), 300);
        }
    });

    // 绑定到 input (输入) 事件，实时检查密码长度和确认密码是否一致
    $('#password').on('input', function() {
        validateField('password');
    });

    $('#confirmPassword').on('input', function() {
        validateField('confirmPassword');
    });
    
    $('#phone').on('blur', function() {
        validateField('phone');
    });
    // --- 实时检测绑定结束 ---


    // 表单提交处理 (最终校验)
    $registerForm.on('submit', function(e) {
        e.preventDefault();
        
        // 清除之前的错误信息
        clearAllErrors();
        
        // 重新运行所有字段验证 (作为最终校验)
        const isUserValid = validateField('username');
        const isEmailValid = validateField('email');
        const isPasswordValid = validateField('password');
        const isConfirmValid = validateField('confirmPassword');
        const isPhoneValid = validateField('phone');
        
        // 只有所有字段都通过时，才继续
        if (!(isUserValid && isEmailValid && isPasswordValid && isConfirmValid && isPhoneValid)) {
            // 滚动到第一个错误字段
            const firstInvalid = $('.is-invalid').first();
            if (firstInvalid.length) {
                $('html, body').animate({
                    scrollTop: firstInvalid.offset().top - 100 
                }, 300);
            }
            return;
        }

        const formData = {
            username: $('#username').val().trim(),
            email: $('#email').val().trim(),
            password: $('#password').val(),
            confirmPassword: $('#confirmPassword').val(),
            phone: $('#phone').val().trim() || null
        };
        
        // 显示加载状态
        const $submitBtn = $registerForm.find('button[type="submit"]');
        const originalText = $submitBtn.html();
        $submitBtn.prop('disabled', true).html('<span class="loading"></span> 注册中...');
        
        // 发送注册请求
        ajaxRequest('/auth/register', 'POST', formData,
            function(response) {
                // 注册成功
                showAlert('success', '注册成功，请登录！', 2000);
                setTimeout(() => {
                    window.location.href = '/auth/login';
                }, 1200);
            },
            function(errorMessage, xhr) {
                // 注册失败 - 处理字段级别的错误
                $submitBtn.prop('disabled', false).html(originalText);
                
                try {
                    const response = xhr.responseJSON || JSON.parse(xhr.responseText || '{}');
                    
                    if (response.fieldErrors && response.errors) {
                        // 显示字段级别的错误
                        let hasErrors = false;
                        const errorFields = [];
                        
                        Object.keys(response.errors).forEach(fieldName => {
                            showFieldError(fieldName, response.errors[fieldName]);
                            errorFields.push({
                                field: fieldName,
                                message: response.errors[fieldName]
                            });
                            hasErrors = true;
                        });
                        
                        if (hasErrors) {
                            // 滚动到第一个错误字段
                            const firstInvalid = $('.is-invalid').first();
                            if (firstInvalid.length) {
                                $('html, body').animate({
                                    scrollTop: firstInvalid.offset().top - 100 
                                }, 300);
                            }
                            
                            // 显示详细的错误汇总
                            showDetailedErrors(response.message || '请检查并修正以下错误', errorFields);
                        }
                    } else {
                        // 显示一般错误信息
                        showSimpleError(response.message || errorMessage);
                    }
                } catch (e) {
                    // 解析失败，显示原始错误信息
                    $errorAlert.removeClass('d-none').text(errorMessage);
                }
            }
        );
    });
});