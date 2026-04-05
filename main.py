import os
from dotenv import load_dotenv
from langchain.chat_models import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain

from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# 환경 변수 로드
load_dotenv()

# OpenAI API 키 설정 (환경 변수에서 가져옴)
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("OPENAI_API_KEY 환경 변수를 설정해주세요.")

# ChatOpenAI 모델 초기화
llm = ChatOpenAI(
    openai_api_key=openai_api_key,
    model_name="gpt-3.5-turbo",  # 또는 gpt-4
    temperature=0.7
)

# 대화 메모리 초기화
memory = ConversationBufferMemory()

# ConversationChain 생성
conversation = ConversationChain(
    llm=llm,
    memory=memory,
    verbose=False  # True로 설정하면 내부 과정 출력
)

def main():
    print("챗봇을 시작합니다. 'quit' 입력 시 종료됩니다.")
    while True:
        user_input = input("You: ")
        if user_input.lower() == 'quit':
            print("챗봇을 종료합니다.")
            break
        # 대화 예측
        response = conversation.predict(input=user_input)
        print(f"Bot: {response}")

app = FastAPI()

# CORS 설정 (모든 도메인 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#질문 데이터 형태 지정
class ChatRequest(BaseModel):
    question: str

@app.get("/")
def read_root():
    return {"message": "챗봇 API에 오신 것을 환영합니다!"}

@app.post("/chat")
def chat(request: ChatRequest):
    user_input = request.question
    response = conversation.predict(input=user_input)
    return {"response": response}


if __name__ == "__main__":
    main()