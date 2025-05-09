# 1. 공식 Python 이미지 기반
FROM python:3.12

# 2. 환경 변수 설정
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. 시스템 패키지 설치
RUN apt-get update
# && apt-get install -y \
#     build-essential \
#     libpq-dev \
#     netcat \
#     && rm -rf /var/lib/apt/lists/*

# 4. 작업 디렉토리 생성
WORKDIR /app

# 5. 의존성 복사 및 설치
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# 6. 프로젝트 소스 복사
COPY . .

# 7. 포트 설정 (gunicorn 기준)
EXPOSE 8000

# 8. 엔트리포인트 설정 (gunicorn or dev용 manage.py runserver)
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
