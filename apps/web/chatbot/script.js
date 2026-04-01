// 기본 설정
const DEFAULT_API_URL = 'http://localhost:8000/chat';

// DOM 요소들
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const apiUrlInput = document.getElementById('apiUrlInput');

// 상태 관리
let isLoading = false;
let apiUrl = DEFAULT_API_URL;

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
});

// API URL 변경 저장
apiUrlInput.addEventListener('change', (e) => {
    apiUrl = e.target.value || DEFAULT_API_URL;
    localStorage.setItem('chatbot_api_url', apiUrl);
    console.log('API URL 업데이트:', apiUrl);
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

    // API 호출
    await sendMessageToAPI(message);
});

// 메시지 추가 함수
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text;
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
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
