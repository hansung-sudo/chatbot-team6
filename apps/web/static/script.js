// 기본 설정
const DEFAULT_API_URL = 'http://localhost:8000/chat';

// DOM 요소들
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const apiUrlInput = document.getElementById('apiUrlInput');
const newChatBtn = document.getElementById('newChatBtn');
const conversationList = document.getElementById('conversationList');
const chatTitle = document.getElementById('chatTitle');
const sidebarToggle = document.getElementById('sidebarToggle');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const sidebar = document.getElementById('sidebar');
const chatbotWrapper = document.querySelector('.chatbot-wrapper');

// 상태 관리
let isLoading = false;
let apiUrl = DEFAULT_API_URL;
let currentConversationId = null;
let conversations = {}; // { id: { title, messages: [], timestamp } }
let sidebarOpen = false;

// 사이드바 토글 함수
function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    sidebar.classList.toggle('collapsed', !sidebarOpen);
    sidebarToggle.classList.toggle('open', sidebarOpen);
    sidebarToggle.classList.toggle('hidden', sidebarOpen);
    chatbotWrapper.classList.toggle('expanded', sidebarOpen);
    localStorage.setItem('chatbot_sidebar_open', sidebarOpen);
}

// 사이드바 닫기
function closeSidebar() {
    if (sidebarOpen) {
        toggleSidebar();
    }
}

// 초기화
window.addEventListener('DOMContentLoaded', () => {
    // localStorage에서 API URL 불러오기
    const savedApiUrl = localStorage.getItem('chatbot_api_url');
    if (savedApiUrl) {
        apiUrl = savedApiUrl;
        apiUrlInput.value = apiUrl;
    } else {
        apiUrlInput.value = DEFAULT_API_URL;
    }

    // 저장된 대화 목록 불러오기
    loadConversations();
    
    // 첫 대화가 없으면 새로 생성
    if (Object.keys(conversations).length === 0) {
        startNewConversation();
    } else if (!currentConversationId) {
        // 가장 최근 대화 선택
        const conversationIds = Object.keys(conversations).sort(
            (a, b) => conversations[b].timestamp - conversations[a].timestamp
        );
        selectConversation(conversationIds[0]);
    }

    renderConversationList();
    
    // 사이드바 초기 상태 로드
    sidebarOpen = localStorage.getItem('chatbot_sidebar_open') === 'true';
    if (sidebarOpen) {
        toggleSidebar();
    }
});

// localStorage에서 대화 목록 불러오기
function loadConversations() {
    const saved = localStorage.getItem('chatbot_conversations');
    if (saved) {
        conversations = JSON.parse(saved);
    }
}

// localStorage에 대화 목록 저장
function saveConversations() {
    localStorage.setItem('chatbot_conversations', JSON.stringify(conversations));
}

// 고유한 ID 생성
function generateId() {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 새 대화 시작
function startNewConversation() {
    const id = generateId();
    conversations[id] = {
        title: '새로운 대화',
        messages: [],
        timestamp: Date.now()
    };
    saveConversations();
    selectConversation(id);
    renderConversationList();
}

// 대화 선택
function selectConversation(id) {
    currentConversationId = id;
    chatMessages.innerHTML = '';
    chatTitle.textContent = conversations[id].title;
    
    // 메시지 표시
    conversations[id].messages.forEach(msg => {
        addMessage(msg.text, msg.sender, false);
    });

    renderConversationList();
    messageInput.focus();
}

// 대화 목록 렌더링
function renderConversationList() {
    conversationList.innerHTML = '';
    
    // 최신순으로 정렬
    const sortedIds = Object.keys(conversations).sort(
        (a, b) => conversations[b].timestamp - conversations[a].timestamp
    );

    sortedIds.forEach(id => {
        const conv = conversations[id];
        const item = document.createElement('div');
        item.className = `conversation-item ${id === currentConversationId ? 'active' : ''}`;
        
        const title = document.createElement('div');
        title.className = 'conversation-item-title';
        title.textContent = conv.title;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteConversation(id);
        };
        
        item.appendChild(title);
        item.appendChild(deleteBtn);
        item.onclick = () => selectConversation(id);
        
        conversationList.appendChild(item);
    });
}

// 대화 삭제
function deleteConversation(id) {
    if (Object.keys(conversations).length === 1) {
        alert('최소 하나의 대화는 유지되어야 합니다.');
        return;
    }
    
    delete conversations[id];
    saveConversations();
    
    if (id === currentConversationId) {
        const remainingIds = Object.keys(conversations);
        selectConversation(remainingIds[0]);
    }
    
    renderConversationList();
}

// 대화 제목 자동 생성 (첫 메시지 기반)
function updateConversationTitle(conversationId, message) {
    if (conversations[conversationId].title === '새로운 대화') {
        let title = message.substring(0, 30);
        if (message.length > 30) title += '...';
        conversations[conversationId].title = title;
        saveConversations();
        renderConversationList();
    }
}

// API URL 변경 저장
apiUrlInput.addEventListener('change', (e) => {
    apiUrl = e.target.value || DEFAULT_API_URL;
    localStorage.setItem('chatbot_api_url', apiUrl);
    console.log('API URL 업데이트:', apiUrl);
});

// 사이드바 토글 버튼
sidebarToggle.addEventListener('click', toggleSidebar);

// 사이드바 닫기 버튼
closeSidebarBtn.addEventListener('click', closeSidebar);

// 새 대화 버튼
newChatBtn.addEventListener('click', () => {
    startNewConversation();
});

// Ctrl+N으로 새 대화 시작
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.code === 'KeyN') {
        e.preventDefault();
        startNewConversation();
    }
});

// 폼 제출
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message || isLoading) return;

    // 사용자 메시지 추가
    addMessage(message, 'user');
    messageInput.value = '';
    messageInput.style.height = 'auto';

    // 대화에 메시지 저장
    conversations[currentConversationId].messages.push({ text: message, sender: 'user' });
    
    // 첫 메시지면 제목 업데이트
    if (conversations[currentConversationId].messages.length === 1) {
        updateConversationTitle(currentConversationId, message);
    }

    // API 호출
    await sendMessageToAPI(message);
});

// 메시지 추가 함수
function addMessage(text, sender, save = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text;
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // 현재 대화에 메시지 저장
    if (save) {
        conversations[currentConversationId].messages.push({ text, sender });
        saveConversations();
    }
    
    // 자동으로 맨 아래로 스크롤
    scrollToBottom();
}

// 스크롤 함수
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// API로 메시지 전송
async function sendMessageToAPI(message) {
    isLoading = true;
    sendBtn.disabled = true;
    loadingIndicator.classList.add('active');

    try {
        // 🔧 API 요청 형식을 수정하세요 (필요시)
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                // 필요시 추가 필드 작성
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // 🔧 응답 형식을 수정하세요 (필요시)
        // 예: data.response, data.text, data.result 등
        const botResponse = data.response || data.text || data.message || '응답을 받을 수 없습니다.';
        
        addMessage(botResponse, 'bot');
        
        // 대화 시간 업데이트
        conversations[currentConversationId].timestamp = Date.now();
        saveConversations();
        renderConversationList();

    } catch (error) {
        console.error('API 오류:', error);
        addMessage(`⚠️ 오류 발생: ${error.message}. API URL을 확인해주세요.`, 'bot');
    } finally {
        isLoading = false;
        sendBtn.disabled = false;
        loadingIndicator.classList.remove('active');
        messageInput.focus();
    }
}

// textarea 높이 자동 조절
messageInput.addEventListener('input', (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
});

// Enter 키로 전송 (Shift+Enter는 줄바꿈)
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
    }
});

// 개발용: 설정창 토글 (Ctrl+Shift+S)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyS') {
        const settings = document.querySelector('.chat-settings');
        settings.style.display = settings.style.display === 'flex' ? 'none' : 'flex';
    }
});

console.log('챗봇이 로드되었습니다.');
console.log('API URL:', apiUrl);
console.log('개발용 팁: Ctrl+Shift+S를 눌러 API URL 설정란을 열고 닫을 수 있습니다.');
