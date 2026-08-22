# routes/voice.py
from flask import Blueprint, request, jsonify
import os
import tempfile
from datetime import datetime

voice_bp = Blueprint("voice", __name__, url_prefix="/api/voice")

@voice_bp.post("/transcribe")
def transcribe():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file"}), 400

    audio = request.files['audio']
    if not audio.filename:
        return jsonify({"error": "Empty file"}), 400

    try:
        import groq
        client = groq.Groq(api_key=os.getenv("GROQ_API_KEY"))

        fd, temp_path = tempfile.mkstemp(suffix=".webm")
        os.close(fd)
        
        try:
            audio.save(temp_path)
            with open(temp_path, "rb") as f:
                transcription = client.audio.transcriptions.create(
                    model="whisper-large-v3-turbo",
                    file=f,
                    language="en",
                    temperature=0.0
                )
            return jsonify({"transcript": transcription.text.strip()}), 200
        finally:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

    except Exception as e:
        return jsonify({"error": str(e)}), 500