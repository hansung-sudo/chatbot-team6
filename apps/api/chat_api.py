from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import sqlite3
import os

app = FastAPI(title="AI Chat Storage API", description="대화 내역 기록 및 조회 전용 API")

# 데이터베이스 경로 (기존 설정 유지)
DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'chatbot.db')

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

# --- 데이터베이스 유틸리티 함수 ---

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def save_message(conversation_id: int, sender: str, content: str, message_type: str = "text"):
    """메시지 한 건을 DB에 저장합니다."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO Messages (conversation_id, sender, content, message_type)
        VALUES (?, ?, ?)
    """, (conversation_id, sender, content)) # message_type 컬럼이 테이블에 있다면 포함
    conn.commit()
    conn.close()

# --- API 엔드포인트 ---

@app.post("/chat/save", summary="대화 내역 세트 저장")
def save_chat_history(request: ChatSaveRequest):
    """
    [핵심 기능] 
    프론트엔드에서 보낸 '사용자 질문'과 'AI 답변'을 동시에 DB에 기록합니다.
    """
    try:
        # 1. 사용자 메시지 저장
        save_message(request.conversation_id, "user", request.user_message)
        
        # 2. AI 응답 저장
        save_message(request.conversation_id, "bot", request.ai_response)
        
        return {"status": "success", "message": "대화 내역이 성공적으로 저장되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"저장 중 오류 발생: {str(e)}")

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