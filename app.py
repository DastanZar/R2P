"""
R2P Backend — Flask server for PDF upload and text extraction.
Serves the frontend and provides a /api/upload-pdf endpoint.
"""

import os
import tempfile
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pdfplumber

app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)

# Max upload size: 10 MB
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

ALLOWED_EXTENSIONS = {"pdf"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file using pdfplumber."""
    text_parts = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n\n".join(text_parts)


@app.route("/")
def serve_index():
    return send_from_directory(".", "index.html")


@app.route("/api/upload-pdf", methods=["POST"])
def upload_pdf():
    """Accept a PDF file upload, extract text, and return it."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Only PDF files are supported"}), 400

    try:
        # Save to a temporary file for processing
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        # Extract text
        text = extract_text_from_pdf(tmp_path)

        # Clean up temp file
        os.unlink(tmp_path)

        if not text.strip():
            return jsonify({
                "error": "Could not extract text from this PDF. It may be image-based or empty."
            }), 422

        return jsonify({"text": text, "filename": file.filename})

    except Exception as e:
        return jsonify({"error": f"Failed to process PDF: {str(e)}"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
