-- AI 챗봇 대화 내역 저장을 위한 데이터베이스 스키마 (SQLite 기준)
-- 이 파일을 실행하여 테이블을 생성하세요.

-- Users 테이블 생성 (사용자 정보)
CREATE TABLE IF NOT EXISTS Users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversations 테이블 생성 (대화 세션)
CREATE TABLE IF NOT EXISTS Conversations (
    conversation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    session_id VARCHAR(255) UNIQUE,
    title TEXT,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- Messages 테이블 생성 (메시지 내역)
CREATE TABLE IF NOT EXISTS Messages (
    message_id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER,
    sender VARCHAR(10) CHECK (sender IN ('user', 'bot')),
    content TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message_type VARCHAR(50) DEFAULT 'text',
    FOREIGN KEY (conversation_id) REFERENCES Conversations(conversation_id)
);

-- 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON Conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON Messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON Messages(timestamp);
