# How-to 가이드

## 가상 환경 활성화하기

on Windows
```bash
venv\Scripts\activate.bat
```

on Linux
```bash
source venv/bin/activate
```

아나콘다 환경은 사용하지 마시오

아나콘다 비활성화하기
```bash
conda deactivate
```


## 커밋 메시지 규칙
참고 : https://velog.io/@chojs28/Git-%EC%BB%A4%EB%B0%8B-%EB%A9%94%EC%8B%9C%EC%A7%80-%EA%B7%9C%EC%B9%99


|타입 이름|내용|
|FEAT|새로운 기능에 대한 커밋|
|FIX|버그 수정에 대한 커밋|
|BUILD|빌드 관련 파일 수정 / 모듈 설치 또는 삭제에 대한 커밋|
|CHORE|그 외 자잘한 수정에 대한 커밋|
|CI|ci 관련 설정 수정에 대한 커밋|
|DOCS|문서 수정에 대한 커밋|
|STYLE|코드 스타일 혹은 포맷 등에 관한 커밋|
|REFACTOR|코드 리팩토링에 대한 커밋|
|TEST|테스트 코드 수정에 대한 커밋|
|PERF|성능 개선에 대한 커밋|

## 서버 실행 시
기본적으로 서버 실행 시 디버그 모드로 시행됨.
따라서 로컬에서 시행되니 오리온 서버에서 실행되지 않는다고 놀라지 말것.

만약 배포 상태에서 실행시 3000번 포트를 사용할 것.

서버 실행 명령어
```bash
python manage.py runserver
```