FROM python:3.12-slim-bookworm AS dependencies
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
COPY requirements.txt ./
ARG PIP_NO_INDEX=0
RUN --mount=type=bind,source=.wheels,target=/wheels \
    pip install --no-cache-dir --prefix=/install --find-links=/wheels -r requirements.txt

FROM python:3.12-slim-bookworm AS runtime
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 HOST=0.0.0.0 PORT=8000
WORKDIR /app
RUN groupadd --gid 10001 webdemo \
    && useradd --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin webdemo
COPY --from=dependencies /install /usr/local
COPY app ./app
COPY knowledge ./knowledge
USER 10001:10001
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health',timeout=3)"]
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]

FROM runtime AS test
COPY tests ./tests
CMD ["python", "-m", "unittest", "discover", "-s", "tests", "-v"]

FROM runtime AS production
