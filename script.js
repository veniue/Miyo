// script.js

document.addEventListener('DOMContentLoaded', () => {
    // ---- 元素获取 ----
    const characterSettingsBtn = document.getElementById('character-settings-btn');
    const characterModal = document.getElementById('character-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');
    const chatWindow = document.getElementById('chat-window');
    
    // API & 模型设置相关
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const apiUrlInput = document.getElementById('api-url-input');
    const apiKeyInput = document.getElementById('api-key-input');
    const modelSelect = document.getElementById('model-select');
    const fetchModelsBtn = document.getElementById('fetch-models-btn');

    // 角色设定相关
    const saveCharacterBtn = document.getElementById('save-character-btn');
    const charNameInput = document.getElementById('char-name');
    const charPromptTextarea = document.getElementById('char-prompt');

    // ---- 状态管理 ----
    let chatHistory = [];
    let currentSettings = {};
    let currentCharacter = {};

    // ---- 功能函数 ----

    // 1. 加载本地存储的数据
    function loadSettings() {
        const savedSettings = localStorage.getItem('aiChatSettings');
        if (savedSettings) {
            currentSettings = JSON.parse(savedSettings);
            apiUrlInput.value = currentSettings.apiUrl || '';
            apiKeyInput.value = currentSettings.apiKey || '';
        }
        const savedCharacter = localStorage.getItem('aiChatCharacter');
        if (savedCharacter) {
            currentCharacter = JSON.parse(savedCharacter);
            charNameInput.value = currentCharacter.name || '';
            charPromptTextarea.value = currentCharacter.prompt || '';
        }
    }

    // 2. 页面切换
    function switchPage(pageId) {
        pages.forEach(page => {
            page.classList.remove('active');
            if (page.id === pageId) {
                page.classList.add('active');
            }
        });
    }

    // 3. 渲染消息到聊天窗口
    function addMessageToWindow(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = message;
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight; // 自动滚动到底部
    }

    // 4. 拉取模型列表
    async function fetchModels() {
        const apiUrl = apiUrlInput.value.trim();
        const apiKey = apiKeyInput.value.trim();
        if (!apiUrl || !apiKey) {
            alert('请先填写反代地址和密匙');
            return;
        }

        // 通常模型列表的端点是 /v1/models
        const modelsUrl = apiUrl.endsWith('/') ? `${apiUrl}models` : `${apiUrl}/models`;

        try {
            const response = await fetch(modelsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP 错误! 状态: ${response.status}`);
            }

            const data = await response.json();
            modelSelect.innerHTML = ''; // 清空现有选项
            data.data.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.id;
                modelSelect.appendChild(option);
            });
            alert('模型列表拉取成功!');
        } catch (error) {
            console.error('拉取模型失败:', error);
            alert(`拉取模型失败: ${error.message}`);
        }
    }

    // 5. 发送聊天消息
    async function sendMessage() {
        const userMessage = messageInput.value.trim();
        if (!userMessage) return;

        addMessageToWindow(userMessage, 'user');
        messageInput.value = '';

        // 检查配置
        if (!currentSettings.apiUrl || !currentSettings.apiKey || !modelSelect.value) {
            alert('请先在“设置”中完成 API 地址、密匙配置并选择一个模型。');
            return;
        }
        if (!currentCharacter.prompt) {
            alert('请先点击右上角设定一个角色。');
            return;
        }

        // 构建请求体 (兼容 OpenAI API 格式)
        const systemMessage = { role: 'system', content: currentCharacter.prompt };
        const userMessages = chatHistory.map(msg => ({ role: msg.sender, content: msg.text }));
        const currentMessage = { role: 'user', content: userMessage };

        const requestBody = {
            model: modelSelect.value,
            messages: [systemMessage, ...userMessages, currentMessage],
            stream: false // 为简化，暂不使用流式传输
        };
        
        // 发送请求到反代地址
        const chatUrl = currentSettings.apiUrl.endsWith('/') ? `${currentSettings.apiUrl}chat/completions` : `${currentSettings.apiUrl}/chat/completions`;

        try {
            const response = await fetch(chatUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentSettings.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || `HTTP 错误! 状态: ${response.status}`);
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;
            
            addMessageToWindow(aiResponse, 'ai');

            // 更新聊天记录
            chatHistory.push({ sender: 'user', text: userMessage });
            chatHistory.push({ sender: 'assistant', text: aiResponse });

        } catch (error) {
            console.error('聊天请求失败:', error);
            addMessageToWindow(`发生错误: ${error.message}`, 'ai');
        }
    }


    // ---- 事件监听器 ----
    
    // 打开/关闭角色设定弹窗
    characterSettingsBtn.addEventListener('click', () => {
        characterModal.style.display = 'flex';
    });
    closeModalBtn.addEventListener('click', () => {
        characterModal.style.display = 'none';
    });
    window.addEventListener('click', (event) => {
        if (event.target == characterModal) {
            characterModal.style.display = 'none';
        }
    });

    // 底部导航切换
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const pageId = button.getAttribute('data-page');
            switchPage(pageId);
        });
    });

    // 保存全局设置
    saveSettingsBtn.addEventListener('click', () => {
        currentSettings = {
            apiUrl: apiUrlInput.value.trim(),
            apiKey: apiKeyInput.value.trim(),
        };
        localStorage.setItem('aiChatSettings', JSON.stringify(currentSettings));
        alert('设置已保存!');
    });

    // 保存角色设定
    saveCharacterBtn.addEventListener('click', () => {
        currentCharacter = {
            name: charNameInput.value.trim(),
            prompt: charPromptTextarea.value.trim()
        };
        localStorage.setItem('aiChatCharacter', JSON.stringify(currentCharacter));
        alert('角色已保存!');
        characterModal.style.display = 'none';
        // 清空当前聊天记录，因为角色变了
        chatHistory = [];
        chatWindow.innerHTML = ''; 
    });

    // 拉取模型
    fetchModelsBtn.addEventListener('click', fetchModels);

    // 发送消息
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    // ---- 初始化 ----
    loadSettings();
    switchPage('chat-page'); // 默认显示聊天页面
});
