import sqlite3
import os

# 데이터베이스 파일 경로: 환경변수로 오버라이드 가능
DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), 'chatbot.db')
DB_PATH = os.getenv('DB_PATH', DEFAULT_DB_PATH)


def ensure_db_directory():
    db_dir = os.path.dirname(DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

def create_database():
    """데이터베이스 및 테이블 생성"""
    ensure_db_directory()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 스키마 파일 읽기 및 실행
    schema_path = os.path.join(os.path.dirname(__file__), 'database_schema.sql')
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema = f.read()

    cursor.executescript(schema)
    conn.commit()
    conn.close()
    print("데이터베이스가 성공적으로 생성되었습니다.")

def insert_sample_data():
    """샘플 데이터 삽입 예시"""
    ensure_db_directory()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 샘플 사용자 삽입
    cursor.execute("INSERT OR IGNORE INTO Users (username, email) VALUES (?, ?)", ('test_user', 'test@example.com'))

    # 샘플 대화 삽입
    cursor.execute("INSERT INTO Conversations (user_id, session_id) VALUES (?, ?)", (1, 'session_001'))

    # 샘플 메시지 삽입
    cursor.execute("INSERT INTO Messages (conversation_id, sender, content) VALUES (?, ?, ?)", (1, 'user', '안녕하세요!'))
    cursor.execute("INSERT INTO Messages (conversation_id, sender, content) VALUES (?, ?, ?)", (1, 'bot', '안녕하세요! 무엇을 도와드릴까요?'))

    conn.commit()
    conn.close()
    print("샘플 데이터가 삽입되었습니다.")

def query_messages(conversation_id):
    """특정 대화의 메시지 조회 예시"""
    ensure_db_directory()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT sender, content, timestamp FROM Messages
        WHERE conversation_id = ?
        ORDER BY timestamp
    """, (conversation_id,))

    messages = cursor.fetchall()
    conn.close()
    return messages

if __name__ == "__main__":
    create_database()
    insert_sample_data()

    # 조회 예시
    messages = query_messages(1)
    for msg in messages:
        print(f"{msg[0]}: {msg[1]} ({msg[2]})")
