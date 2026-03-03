import io
import os
import tempfile

from flask import Flask, jsonify, request
from flask_cors import CORS
import whisper

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

MODEL_NAME = os.environ.get("WHISPER_MODEL", "base")
model = whisper.load_model(MODEL_NAME)


@app.post("/transcribe")
def transcribe():
    if "audio" not in request.files:
        return jsonify({"error": "missing-audio"}), 400

    audio_file = request.files["audio"]
    if audio_file.filename == "":
        return jsonify({"error": "empty-filename"}), 400

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        audio_file.save(tmp)
        temp_path = tmp.name

    try:
        result = model.transcribe(temp_path)
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass

    return jsonify({"text": result.get("text", "").strip()})


@app.get("/health")
def health():
    return jsonify({"status": "ok", "model": MODEL_NAME})


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "9000"))
    app.run(host=host, port=port)
