import os
from dotenv import load_dotenv
from langchain.chat_models import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain

# 환경 변수 로드
load_dotenv()

# 환경 변수에서 제한 값 가져오기 (기본값 설정)
MAX_TOKENS = int(os.getenv("MAX_TOKENS", 500))
MAX_USER_INPUT = int(os.getenv("MAX_USER_INPUT", 1000))

# ChatOpenAI 모델 초기화 (max_tokens 추가)
llm = ChatOpenAI(
    openai_api_key=openai_api_key,
    model_name="gpt-3.5-turbo",
    temperature=0.7,
    max_tokens=MAX_TOKENS  # <--- 이 부분이 추가되었습니다!
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
        
        # 1. 종료 명령어 체크
        if user_input.lower() == 'quit':
            print("챗봇을 종료합니다.")
            break

        # 2. [민준님 제안] 입력 글자 수 제한 체크 (글자수 초과 시 아래 로직 건너뜀)
        if len(user_input) > MAX_USER_INPUT:
            print(f"\n[시스템] 질문이 너무 깁니다! ({len(user_input)}자)")
            print(f"최대 {MAX_USER_INPUT}자까지만 입력 가능합니다. 다시 입력해주세요.\n")
            continue
            
        # 3. 대화 예측 및 출력
        response = conversation.predict(input=user_input)
        print(f"Bot: {response}")

if __name__ == "__main__":
    main()

