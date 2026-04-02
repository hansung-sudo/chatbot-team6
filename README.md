# LangChain Chatbot with OpenAI and Memory

이 프로젝트는 Python의 LangChain 라이브러리를 사용하여 OpenAI API와 연결된 기본적인 챗봇입니다. 이전 대화 내용을 기억하는 메모리 기능을 포함합니다.

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

## 실행

터미널에서 다음 명령을 실행합니다:
```
python main.py
```

챗봇이 시작되면 "You: " 프롬프트가 나타납니다. 메시지를 입력하고 Enter를 누르세요. 챗봇이 응답합니다.

종료하려면 'quit'를 입력하세요.

## 기능

- OpenAI의 GPT 모델을 사용한 자연어 응답
- 이전 대화 내용 기억 (ConversationBufferMemory 사용)
- 간단한 명령줄 인터페이스

## 문제 해결

- **API 키 오류**: `.env` 파일에 올바른 OPENAI_API_KEY가 설정되어 있는지 확인하세요.
- **모듈 오류**: 모든 의존성이 설치되었는지 확인하세요 (`pip install -r requirements.txt`).
- **네트워크 오류**: 인터넷 연결과 OpenAI API 접근 권한을 확인하세요.

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.