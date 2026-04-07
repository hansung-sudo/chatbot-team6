# Chatbot Team 6

FastAPI, SQLite, 그리고 OpenAI를 사용하는 챗봇 서비스입니다.  
웹 UI와 API를 하나의 Docker 이미지에서 함께 제공하고, 대화 내역은 SQLite에 저장합니다.

## 아키텍처

```text
Browser -> FastAPI server
          -> Static Web UI (/)
          -> Chat API (/chat/*, /conversations, /health)
          -> SQLite DB (/data/chatbot.db)
          -> OpenAI API
```

- 웹 UI: `apps/web/chatbot`
- API 서버: `apps/api/chat_api.py`
- 데이터 저장소: SQLite
- 실행 방식: Docker Compose

## 결과물

- 웹 페이지에서 대화 입력 및 응답 확인 가능
- 대화 목록, 메시지 저장/조회 가능
- 서버 `.env` 기반 OpenAI 응답 생성
- 로컬 실행과 배포 실행을 같은 이미지로 처리

## 빠른 시작

1. `.env` 파일을 준비합니다.

```env
OPENAI_API_KEY=your_openai_api_key_here
MODEL_NAME=gpt-4o-mini
DB_PATH=/data/chatbot.db
```

2. Docker Compose로 실행합니다.

```bash
docker compose up -d --build
```

3. 아래 주소에 접속합니다.

- 웹: `http://localhost:8001/`
- API 문서: `http://localhost:8001/docs`
- 헬스 체크: `http://localhost:8001/health`

## 배포

- 배포용 설정은 `docker-compose.prod.yml`을 사용합니다.
- SQLite 데이터는 `chatbot-data` 볼륨에 유지됩니다.

## 접속 경로

- 웹: `http://localhost:8001/`
- API 문서: `http://localhost:8001/docs`

## 라이선스

MIT
