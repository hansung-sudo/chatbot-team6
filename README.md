# Chatbot Team 6

FastAPI, SQLite, 그리고 OpenAI 또는 Ollama를 사용하는 챗봇 서비스입니다.  
웹 UI와 API를 하나의 Docker 이미지에서 함께 제공하고, 대화 내역은 SQLite에 저장합니다.

## 기술 스택

- `Python 3.12`
- `FastAPI`, `Uvicorn`
- `LangChain`, `langchain-openai`, `langchain-community`
- `OpenAI API` 또는 `Ollama`
- `SQLite`
- `HTML`, `CSS`, `JavaScript`
- `Docker`, `Docker Compose`
- `GitHub Actions`

## 아키텍처

```text
Browser -> FastAPI server
          -> Static Web UI (/)
          -> Chat API (/chat/*, /conversations, /health)
          -> SQLite DB (/data/chatbot.db)
          -> OpenAI API / Ollama
```

- 웹 UI: `apps/web/chatbot`
- API 서버: `apps/api/chat_api.py`
- 데이터 저장소: SQLite
- 실행 방식: Docker Compose

## 결과물

- 웹 페이지에서 대화 입력 및 응답 확인 가능
- 대화 목록, 메시지 저장/조회 가능
- 서버 `.env` 기반 OpenAI 또는 Ollama 응답 생성
- 로컬 실행과 배포 실행을 같은 이미지로 처리
- 서비스: `https://chatbot.yeoun.org/`
- API 문서: `https://chatbot.yeoun.org/docs`

## 빠른 시작

1. `.env` 파일을 준비합니다.

```env
OPENAI_API_KEY=your_openai_api_key_here
MODEL_NAME=gpt-4o-mini
OPENAI_BASE_URL=
LLM_PROVIDER=openai
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
DB_PATH=/data/chatbot.db
```

Ollama를 쓰려면 아래처럼 설정하면 됩니다.

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma4:e2b
```

Ollama의 OpenAI 호환 엔드포인트를 사용하므로, 서버는 기본적으로 `/v1` 경로를 붙여 호출합니다.

Docker 컨테이너 밖에서 실행 중인 Ollama를 연결할 때는 `OLLAMA_BASE_URL=http://host.docker.internal:11434`처럼 호스트 주소를 사용하세요.

2. Docker Compose로 실행합니다.

```bash
docker compose up -d --build
```

3. 아래 주소에 접속합니다.

- 웹: `http://localhost:8001/`
- API 문서: `http://localhost:8001/docs`
- 헬스 체크: `http://localhost:8001/health`

## 배포

- 배포용 설정은 `docker-compose.prod.yml`을 사용하여 CI/CD합니다.
- SQLite 데이터는 `chatbot-data` 볼륨에 유지됩니다.

## 접속 경로

- 웹: `http://localhost:8001/`
- API 문서: `http://localhost:8001/docs`

## 라이선스

MIT
