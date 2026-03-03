# Python Whisper Server

Simple local Whisper server using Flask.

## Requirements
- Python 3.9+
- ffmpeg installed and available on PATH

## Setup
```bash
cd python-whisper-server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run
```bash
python server.py
```

Default URL: http://localhost:9000

## Endpoints
- GET /health
- POST /transcribe (multipart form with file field "audio")

## Model
Set a different model with:
```bash
WHISPER_MODEL=small python server.py
```
