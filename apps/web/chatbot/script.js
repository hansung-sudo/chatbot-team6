// 기본 설정
const DEFAULT_STORAGE_API_BASE_URL = (() => {
    if (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null') {
        return window.location.origin;
    }
    return 'http://localhost:8000';
})();

// DOM 요소들
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const storageApiBaseInput = document.getElementById('storageApiBaseInput');
const newChatBtn = document.getElementById('newChatBtn');
const conversationList = document.getElementById('conversationList');
const chatTitle = document.getElementById('chatTitle');
const sidebarToggle = document.getElementById('sidebarToggle');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const sidebar = document.getElementById('sidebar');
const chatbotWrapper = document.querySelector('.chatbot-wrapper');

// 상태 관리
let isLoading = false;
let storageApiBaseUrl = DEFAULT_STORAGE_API_BASE_URL;
let currentConversationId = null;
let conversations = []; // [{ conversation_id, title, start_time, message_count }]
let sidebarOpen = false;

function normalizeBaseUrl(url) {
    return (url || '').trim().replace(/\/+$/, '');
}

async function isStorageApiAvailable(baseUrl) {
    if (!baseUrl) return false;
    try {
        const response = await fetch(`${baseUrl}/health`);
        if (!response.ok) return false;
        const data = await response.json();
        return data && data.status === 'OK';
    } catch {
        return false;
    }
}

async function resolveStorageApiBaseUrl(preferredUrl) {
    const candidates = [
        normalizeBaseUrl(preferredUrl),
        normalizeBaseUrl(DEFAULT_STORAGE_API_BASE_URL),
        normalizeBaseUrl(typeof window !== 'undefined' ? window.location?.origin : ''),
        'http://127.0.0.1:8000',
        'http://localhost:8000',
        'http://127.0.0.1:8004',
        'http://localhost:8004',
    ].filter((url, idx, arr) => url && arr.indexOf(url) === idx);

    for (const candidate of candidates) {
        if (await isStorageApiAvailable(candidate)) {
            return candidate;
        }
    }

    throw new Error(`Storage API 연결 실패. 확인한 주소: ${candidates.join(', ')}`);
}

function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    sidebar.classList.toggle('collapsed', !sidebarOpen);
    sidebarToggle.classList.toggle('open', sidebarOpen);
    sidebarToggle.classList.toggle('hidden', sidebarOpen);
    chatbotWrapper.classList.toggle('expanded', sidebarOpen);
    localStorage.setItem('chatbot_sidebar_open', sidebarOpen);
}

function closeSidebar() {
    if (sidebarOpen) {
        toggleSidebar();
    }
}

function saveSettings() {
    localStorage.setItem('chatbot_storage_api_base_url', storageApiBaseUrl);
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text;

    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function renderConversationList() {
    conversationList.innerHTML = '';

    conversations.forEach((conv) => {
        const id = conv.conversation_id;
        const item = document.createElement('div');
        item.className = `conversation-item ${id === currentConversationId ? 'active' : ''}`;

        const title = document.createElement('div');
        title.className = 'conversation-item-title';
        title.textContent = conv.title || `대화 #${id}`;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.type = 'button';
        deleteBtn.textContent = 'x';
        deleteBtn.title = '대화 삭제';
        deleteBtn.onclick = async (e) => {
            e.stopPropagation();
            await handleDeleteConversation(id);
        };

        item.appendChild(title);
        item.appendChild(deleteBtn);
        item.onclick = () => selectConversation(id);
        conversationList.appendChild(item);
    });
}

async function handleDeleteConversation(conversationId) {
    const ok = confirm('이 대화를 삭제하시겠습니까?');
    if (!ok) return;

    try {
        await deleteConversationById(conversationId);
        await refreshConversationList();

        if (conversations.length === 0) {
            currentConversationId = null;
            chatMessages.innerHTML = '';
            chatTitle.textContent = '새로운 대화';
            renderConversationList();
            return;
        }

        if (currentConversationId === conversationId) {
            await selectConversation(conversations[0].conversation_id);
        } else {
            renderConversationList();
        }
    } catch (error) {
        alert(`대화 삭제 실패: ${error.message}`);
    }
}

async function fetchConversations() {
    const response = await fetch(`${storageApiBaseUrl}/conversations`);
    if (!response.ok) {
        throw new Error(`대화 목록 조회 실패: ${response.status}`);
    }
    const data = await response.json();
    conversations = Array.isArray(data.conversations) ? data.conversations : [];
}

async function createConversation() {
    const response = await fetch(`${storageApiBaseUrl}/conversations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
    });

    if (!response.ok) {
        throw new Error(`대화 생성 실패: ${response.status}`);
    }

    const data = await response.json();
    return data.conversation_id;
}

async function fetchConversationMessages(conversationId) {
    const response = await fetch(`${storageApiBaseUrl}/chat/messages/${conversationId}`);
    if (!response.ok) {
        throw new Error(`메시지 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data.messages) ? data.messages : [];
}

async function deleteConversationById(conversationId) {
    const response = await fetch(`${storageApiBaseUrl}/conversations/${conversationId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error(`대화 삭제 실패: ${response.status}`);
    }
}

async function buildConversationHistoryForAI(conversationId, latestUserMessage = '') {
    if (!conversationId) {
        return latestUserMessage ? [{ role: 'user', content: latestUserMessage }] : [];
    }

    const messages = await fetchConversationMessages(conversationId);
    const history = messages.map((msg) => ({
        role: msg.sender === 'bot' ? 'assistant' : 'user',
        content: msg.content,
    }));

    if (latestUserMessage) {
        history.push({ role: 'user', content: latestUserMessage });
    }

    return history;
}

async function saveChatPairToDB(conversationId, userMessage, aiResponse) {
    const response = await fetch(`${storageApiBaseUrl}/chat/save`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            conversation_id: conversationId,
            user_message: userMessage,
            ai_response: aiResponse,
        }),
    });

    if (!response.ok) {
        throw new Error(`DB 저장 실패: ${response.status}`);
    }
}

async function saveSingleMessageToDB(conversationId, sender, content, messageType = 'text') {
    const response = await fetch(`${storageApiBaseUrl}/chat/message`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            conversation_id: conversationId,
            sender,
            content,
            message_type: messageType,
        }),
    });

    if (!response.ok) {
        throw new Error(`메시지 저장 실패: ${response.status}`);
    }
}

async function generateAiReply(conversationId, userMessage) {
    const response = await fetch(`${storageApiBaseUrl}/chat/reply`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            conversation_id: conversationId,
            user_message: userMessage,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI 응답 생성 실패: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const answer = data?.reply?.trim();
    if (!answer) {
        throw new Error('AI 응답이 비어 있습니다.');
    }
    return answer;
}

async function generateConversationTitle(firstQuestion) {
    const response = await fetch(`${storageApiBaseUrl}/chat/title`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            first_question: firstQuestion,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`대화 제목 생성 실패: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const title = data?.title?.trim();
    if (!title) {
        throw new Error('대화 제목이 비어 있습니다.');
    }

    return title;
}

async function updateConversationTitle(conversationId, title) {
    const response = await fetch(`${storageApiBaseUrl}/conversations/${conversationId}/title`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            title,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`대화 제목 저장 실패: ${response.status} ${errorText}`);
    }
}

async function selectConversation(id) {
    currentConversationId = id;
    chatMessages.innerHTML = '';

    const selected = conversations.find((conv) => conv.conversation_id === id);
    chatTitle.textContent = selected?.title || `대화 #${id}`;

    try {
        const messages = await fetchConversationMessages(id);
        if (messages.length === 0) {
            await deleteConversationById(id);
            await refreshConversationList();

            if (conversations.length === 0) {
                currentConversationId = null;
                chatMessages.innerHTML = '';
                chatTitle.textContent = '새로운 대화';
                renderConversationList();
                return;
            }

            await selectConversation(conversations[0].conversation_id);
            return;
        }

        messages.forEach((msg) => {
            renderMessage(msg.content, msg.sender);
        });
    } catch (error) {
        renderMessage(`메시지 로드 오류: ${error.message}`, 'bot');
    }

    renderConversationList();
    messageInput.focus();
}

async function startNewConversation() {
    currentConversationId = null;
    chatMessages.innerHTML = '';
    chatTitle.textContent = '새로운 대화';
    renderConversationList();
    messageInput.focus();
}

async function refreshConversationList() {
    await fetchConversations();
    renderConversationList();
}

window.addEventListener('DOMContentLoaded', async () => {
    const savedStorageApiBaseUrl = localStorage.getItem('chatbot_storage_api_base_url');

    storageApiBaseUrl = normalizeBaseUrl(savedStorageApiBaseUrl || DEFAULT_STORAGE_API_BASE_URL);

    storageApiBaseInput.value = storageApiBaseUrl;

    sidebarOpen = localStorage.getItem('chatbot_sidebar_open') === 'true';
    if (sidebarOpen) {
        toggleSidebar();
    }

    try {
        storageApiBaseUrl = await resolveStorageApiBaseUrl(storageApiBaseUrl);
        storageApiBaseInput.value = storageApiBaseUrl;
        saveSettings();

        await refreshConversationList();

        if (conversations.length === 0) {
            currentConversationId = null;
            chatMessages.innerHTML = '';
            chatTitle.textContent = '새로운 대화';
            renderConversationList();
        } else {
            await selectConversation(conversations[0].conversation_id);
        }
    } catch (error) {
        renderMessage(`초기화 오류: ${error.message}. Storage API 서버를 먼저 실행해주세요.`, 'bot');
    }
});

storageApiBaseInput.addEventListener('change', (e) => {
    storageApiBaseUrl = normalizeBaseUrl(e.target.value || DEFAULT_STORAGE_API_BASE_URL);
    storageApiBaseInput.value = storageApiBaseUrl;
    saveSettings();
});

sidebarToggle.addEventListener('click', toggleSidebar);
closeSidebarBtn.addEventListener('click', closeSidebar);
newChatBtn.addEventListener('click', () => {
    startNewConversation();
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.code === 'KeyN') {
        e.preventDefault();
        startNewConversation();
    }
});

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const message = messageInput.value.trim();
    if (!message || isLoading) {
        return;
    }

    isLoading = true;
    sendBtn.disabled = true;
    loadingIndicator.classList.add('active');

    try {
        renderMessage(message, 'user');
        messageInput.value = '';
        messageInput.style.height = 'auto';

        const isNewConversation = !currentConversationId;
        if (!currentConversationId) {
            currentConversationId = await createConversation();
        }

        // 첫 질문을 즉시 저장해서 사이드바 제목이 사용자 첫 질문으로 반영되게 합니다.
        await saveSingleMessageToDB(currentConversationId, 'user', message);

        if (isNewConversation) {
            try {
                const generatedTitle = await generateConversationTitle(message);
                await updateConversationTitle(currentConversationId, generatedTitle);
                chatTitle.textContent = generatedTitle;
            } catch (titleError) {
                console.warn('대화 제목 생성/저장 실패:', titleError);
            }
        }

        await refreshConversationList();

        const aiReply = await generateAiReply(currentConversationId, message);
        renderMessage(aiReply, 'bot');
        await saveSingleMessageToDB(currentConversationId, 'bot', aiReply);
        await refreshConversationList();
    } catch (error) {
        renderMessage(`오류 발생: ${error.message}`, 'bot');
    } finally {
        isLoading = false;
        sendBtn.disabled = false;
        loadingIndicator.classList.remove('active');
        messageInput.focus();
    }
});

messageInput.addEventListener('input', (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
});

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        if (e.isComposing || e.keyCode === 229) {
            return;
        }
        e.preventDefault();
        if (typeof chatForm.requestSubmit === 'function') {
            chatForm.requestSubmit();
        } else {
            chatForm.dispatchEvent(new Event('submit'));
        }
    }
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyS') {
        const settings = document.querySelector('.chat-settings');
        settings.style.display = settings.style.display === 'flex' ? 'none' : 'flex';
    }
});

console.log('DB 연동 챗봇 UI가 로드되었습니다.');
