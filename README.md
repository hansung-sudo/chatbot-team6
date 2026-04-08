# Chatbot Team 6

FastAPI + SQLite + OpenAI 기반 챗봇 서비스입니다.
웹 UI와 API를 하나의 서버에서 제공하며, 대화 내역은 SQLite에 저장됩니다.

## 주요기능

- 웹 채팅 UI 제공
- 대화 생성/삭제 및 목록 조회
- 메시지 저장/조회
- 저장된 대화 이력을 기반으로 OpenAI 응답 생성

## 프로젝트 메커니즘

- 브라우저가 FastAPI 서버에 요청을 보냅니다.
- 서버는 정적 웹 UI를 제공하고, API 요청을 처리합니다.
- 대화/메시지는 SQLite에 저장됩니다.
- AI 응답 생성 시 DB 대화 이력을 읽고 OpenAI API를 호출합니다.

## 실행방법

1. 루트 경로에 .env 파일을 생성합니다.
```
OPENAI_API_KEY=your_openai_api_key_here
MODEL_NAME=gpt-4o-mini
DB_PATH=/data/chatbot.db
```
2. Docker Compose로 실행합니다.
```
docker compose up -d --build
```
3. 로컬 Python 실행이 필요하면 아래 순서로 실행합니다.
```
pip install -r requirements.txt
python database.py
uvicorn apps.api.chat_api:app --host 0.0.0.0 --port 8000 --reload
```

## 접속 주소

- Docker 실행 시
    - 웹: http://localhost:8001/
    - Swagger: http://localhost:8001/docs
    - Health: http://localhost:8001/health
- 로컬 Python 실행 시
    - 웹: http://localhost:8000/
    - Swagger: http://localhost:8000/docs
