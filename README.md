# LangChain Chatbot with OpenAI and Memory

이 프로젝트는 Python의 LangChain 라이브러리를 사용하여 OpenAI API와 연결된 기본적인 챗봇입니다. 이전 대화 내용을 기억하는 메모리 기능을 포함합니다. FastAPI를 통해 웹 API로도 사용할 수 있습니다.

## 요구사항

- Python 3.8 이상
- OpenAI API 키

## 설치

1. 저장소를 클론하거나 파일을 다운로드합니다.
2. 가상 환경을 생성하고 활성화합니다 (권장):
   ```
   python -m venv venv
   venv\Scripts\activate  # Windows
   ```
3. 의존성을 설치합니다:
   ```
   pip install -r requirements.txt
   ```

## 설정

1. `.env` 파일을 생성하고 OpenAI API 키를 설정합니다:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```
   - OpenAI API 키는 [OpenAI 웹사이트](https://platform.openai.com/)에서 얻을 수 있습니다.

## 데이터베이스 초기화

대화 내역을 저장하려면 데이터베이스를 먼저 생성하세요:
```
python database.py
```
이 명령은 `chatbot.db` 파일을 생성하고 샘플 데이터를 삽입합니다.

## 실행

### 명령줄 챗봇
터미널에서 다음 명령을 실행합니다:
```
python main.py
```
챗봇이 시작되면 "You: " 프롬프트가 나타납니다. 메시지를 입력하고 Enter를 누르세요. 챗봇이 응답합니다. 종료하려면 'quit'를 입력하세요.

### 웹 API (FastAPI)
API 서버를 실행하려면:
```
uvicorn apps.api.chat_api:app --reload
```
서버가 http://127.0.0.1:8000 에서 시작됩니다. 브라우저에서 http://127.0.0.1:8000/docs 로 Swagger UI에 접근하여 API를 테스트할 수 있습니다.

#### API 엔드포인트 (저장 전용)
- `POST /chat/save`: 프론트엔드에서 받은 사용자 질문과 AI 답변을 DB에 저장.
- `GET /chat/messages/{conversation_id}`: 특정 대화의 메시지 조회.
- `GET /health`: API 상태 확인.

#### API 사용 예시 (JavaScript)
```javascript
// 저장 요청 (AI 답변은 프론트 또는 다른 백엔드에서 생성된 값을 전달)
fetch('http://127.0.0.1:8000/chat/save', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({
      conversation_id: 1,
      user_message: '안녕하세요!',
      ai_response: '안녕하세요. 무엇을 도와드릴까요?'
   })
}).then(res => res.json()).then(data => console.log(data));
```

## 기능

- 사용자 질문/AI 답변 대화 내역 저장 (SQLite)
- 간단한 명령줄 인터페이스 및 웹 API
- 프론트엔드 연동 가능

## 문제 해결

- **데이터베이스 오류**: `python database.py`를 먼저 실행하세요.
- **포트 충돌**: uvicorn 실행 시 `--port 8001`로 포트 변경.
- **모듈 오류**: 모든 의존성이 설치되었는지 확인하세요 (`pip install -r requirements.txt`).

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.