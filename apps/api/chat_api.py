from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from openai import OpenAI
import sqlite3
import os
import uuid

app = FastAPI(title="AI Chat Storage API", description="대화 내역 기록 및 조회 전용 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 데이터베이스 경로: 환경변수로 오버라이드 가능
DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'chatbot.db')
DB_PATH = os.getenv("DB_PATH", DEFAULT_DB_PATH)


def ensure_db_directory() -> None:
    db_dir = os.path.dirname(DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)


ensure_db_directory()

# --- Pydantic 모델 (데이터 규격) ---

class ChatSaveRequest(BaseModel):
    conversation_id: int
    user_message: str
    ai_response: str  # 프론트엔드에서 생성된 답변을 받아옵니다.

class MessageRequest(BaseModel):
    conversation_id: int
    sender: str  # "user" or "bot"
    content: str
    message_type: str = "text"

class ConversationCreateRequest(BaseModel):
    user_id: int | None = None
    session_id: str | None = None

class ChatReplyRequest(BaseModel):
    conversation_id: int
    user_message: str

class ConversationTitleRequest(BaseModel):
    first_question: str

# --- 데이터베이스 유틸리티 함수 ---

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def conversation_exists(conversation_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM Conversations WHERE conversation_id = ?", (conversation_id,))
    exists = cursor.fetchone() is not None
    conn.close()
    return exists

def create_conversation(user_id: int | None = None, session_id: str | None = None) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    real_session_id = session_id or f"session_{uuid.uuid4().hex[:12]}"
    cursor.execute(
        "INSERT INTO Conversations (user_id, session_id) VALUES (?, ?)",
        (user_id, real_session_id)
    )
    conversation_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return conversation_id

def delete_conversation(conversation_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM Messages WHERE conversation_id = ?", (conversation_id,))
    cursor.execute("DELETE FROM Conversations WHERE conversation_id = ?", (conversation_id,))
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    return deleted > 0

def save_message(conversation_id: int, sender: str, content: str, message_type: str = "text"):
    """메시지 한 건을 DB에 저장합니다."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO Messages (conversation_id, sender, content, message_type)
        VALUES (?, ?, ?, ?)
    """, (conversation_id, sender, content, message_type))
    conn.commit()
    conn.close()

def get_conversation_messages_for_ai(conversation_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT sender, content
        FROM Messages
        WHERE conversation_id = ?
        ORDER BY timestamp ASC, message_id ASC
    """, (conversation_id,))
    rows = cursor.fetchall()
    conn.close()

    messages = []
    for sender, content in rows:
        role = "assistant" if sender == "bot" else "user"
        messages.append({"role": role, "content": content})
    return messages

def generate_ai_reply_from_env(conversation_id: int, latest_user_message: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="서버에 OPENAI_API_KEY가 설정되지 않았습니다.")

    model_name = os.getenv("MODEL_NAME", "gpt-4o-mini").strip() or "gpt-4o-mini"
    history = get_conversation_messages_for_ai(conversation_id)
    latest_user_message = (latest_user_message or "").strip()

    if latest_user_message:
        if not history or history[-1].get("role") != "user" or history[-1].get("content") != latest_user_message:
            history.append({"role": "user", "content": latest_user_message})

    if not history:
        raise HTTPException(status_code=400, detail="대화 이력이 없어 AI 응답을 생성할 수 없습니다.")

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {
                "role": "system",
                "content": "You are a helpful assistant. Reply in Korean unless the user requests another language.",
            },
            *history,
        ],
    )
    reply = (response.choices[0].message.content or "").strip() if response.choices else ""
    if not reply:
        raise HTTPException(status_code=502, detail="OpenAI 응답이 비어 있습니다.")
    return reply

def _clean_generated_title(title: str) -> str:
    cleaned = (title or "").strip()
    cleaned = cleaned.replace("\n", " ").replace("\r", " ")
    cleaned = cleaned.strip(" \"'`")
    for prefix in ("제목:", "타이틀:", "Title:", "title:"):
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix):].strip()
    return cleaned

def generate_conversation_title_from_first_question(first_question: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="서버에 OPENAI_API_KEY가 설정되지 않았습니다.")

    question = (first_question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="first_question이 비어 있습니다.")

    model_name = os.getenv("TITLE_MODEL_NAME", os.getenv("MODEL_NAME", "gpt-4o-mini")).strip() or "gpt-4o-mini"
    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=model_name,
        temperature=0.2,
        max_tokens=24,
        messages=[
            {
                "role": "system",
                "content": (
                    "You create short Korean conversation titles. "
                    "Return only the title, without quotes, numbering, or explanations. "
                    "Keep it under 20 characters when possible."
                ),
            },
            {
                "role": "user",
                "content": f"첫 질문: {question}\n이 대화를 대표하는 짧은 제목을 만들어줘.",
            },
        ],
    )

    raw_title = (response.choices[0].message.content or "").strip() if response.choices else ""
    title = _clean_generated_title(raw_title)
    if not title:
        raise HTTPException(status_code=502, detail="대화 제목 생성 결과가 비어 있습니다.")

    return title

# --- API 엔드포인트 ---

@app.post("/chat/save", summary="대화 내역 세트 저장")
def save_chat_history(request: ChatSaveRequest):
    """
    [핵심 기능] 
    프론트엔드에서 보낸 '사용자 질문'과 'AI 답변'을 동시에 DB에 기록합니다.
    """
    try:
        if not conversation_exists(request.conversation_id):
            raise HTTPException(status_code=404, detail="conversation_id가 존재하지 않습니다.")

        # 1. 사용자 메시지 저장
        save_message(request.conversation_id, "user", request.user_message)
        
        # 2. AI 응답 저장
        save_message(request.conversation_id, "bot", request.ai_response)
        
        return {"status": "success", "message": "대화 내역이 성공적으로 저장되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"저장 중 오류 발생: {str(e)}")

@app.post("/chat/message", summary="단일 메시지 저장")
def save_single_message(request: MessageRequest):
    """사용자/봇 메시지 한 건을 저장합니다."""
    if request.sender not in ["user", "bot"]:
        raise HTTPException(status_code=400, detail="sender는 'user' 또는 'bot'이어야 합니다.")

    if not conversation_exists(request.conversation_id):
        raise HTTPException(status_code=404, detail="conversation_id가 존재하지 않습니다.")

    try:
        save_message(request.conversation_id, request.sender, request.content, request.message_type)
        return {"status": "success", "message": "메시지가 저장되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"메시지 저장 중 오류 발생: {str(e)}")

@app.post("/chat/reply", summary="AI 응답 생성")
def chat_reply(request: ChatReplyRequest):
    """DB 대화 이력과 서버 .env 키를 사용해 AI 응답을 생성합니다."""
    if not conversation_exists(request.conversation_id):
        raise HTTPException(status_code=404, detail="conversation_id가 존재하지 않습니다.")

    try:
        reply = generate_ai_reply_from_env(request.conversation_id, request.user_message)
        return {"reply": reply}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 응답 생성 중 오류 발생: {str(e)}")

@app.post("/chat/title", summary="첫 질문 기반 대화 제목 생성")
def chat_title(request: ConversationTitleRequest):
    """첫 질문을 기반으로 짧은 대화 제목을 생성합니다."""
    try:
        title = generate_conversation_title_from_first_question(request.first_question)
        return {"title": title}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"대화 제목 생성 중 오류 발생: {str(e)}")

@app.get("/conversations", summary="대화 목록 조회")
def get_conversations():
    """사이드바용 대화 목록을 최신순으로 가져옵니다."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            c.conversation_id,
            c.start_time,
            (
                SELECT m.content
                FROM Messages m
                WHERE m.conversation_id = c.conversation_id AND m.sender = 'user'
                ORDER BY m.timestamp ASC, m.message_id ASC
                LIMIT 1
            ) AS first_user_message,
            (
                SELECT COUNT(*)
                FROM Messages m2
                WHERE m2.conversation_id = c.conversation_id
            ) AS message_count
        FROM Conversations c
        ORDER BY c.start_time DESC, c.conversation_id DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    conversations = []
    for row in rows:
        conversation_id, start_time, first_user_message, message_count = row
        title = (first_user_message[:30] + "...") if first_user_message and len(first_user_message) > 30 else (first_user_message or f"대화 #{conversation_id}")
        conversations.append({
            "conversation_id": conversation_id,
            "title": title,
            "start_time": start_time,
            "message_count": message_count,
        })

    return {"conversations": conversations}

@app.post("/conversations", summary="대화 생성")
def create_conversation_api(request: ConversationCreateRequest):
    """새 대화를 만들고 conversation_id를 반환합니다."""
    try:
        conversation_id = create_conversation(request.user_id, request.session_id)
        return {"conversation_id": conversation_id}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="중복된 session_id입니다.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"대화 생성 중 오류 발생: {str(e)}")

@app.delete("/conversations/{conversation_id}", summary="대화 삭제")
def delete_conversation_api(conversation_id: int):
    """대화와 연결된 메시지를 함께 삭제합니다."""
    if not conversation_exists(conversation_id):
        raise HTTPException(status_code=404, detail="conversation_id가 존재하지 않습니다.")

    try:
        deleted = delete_conversation(conversation_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="삭제할 대화가 없습니다.")
        return {"status": "success", "message": "대화가 삭제되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"대화 삭제 중 오류 발생: {str(e)}")

@app.get("/chat/messages/{conversation_id}", summary="대화 내역 조회")
def retrieve_messages(conversation_id: int):
    """특정 대화방의 모든 메시지를 시간순으로 가져옵니다."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT message_id, sender, content, timestamp FROM Messages
        WHERE conversation_id = ?
        ORDER BY timestamp ASC
    """, (conversation_id,))
    messages = cursor.fetchall()
    conn.close()
    
    return {"messages": [
        {"id": msg[0], "sender": msg[1], "content": msg[2], "time": msg[3]} 
        for msg in messages
    ]}

@app.get("/health", summary="서버 상태 체크")
def health_check():
    return {"status": "OK", "mode": "storage-only"}

WEB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "web", "chatbot"))

if os.path.isdir(WEB_DIR):
    app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
