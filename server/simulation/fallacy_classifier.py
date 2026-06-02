#!/usr/bin/env python3
"""
fallacy_classifier.py - RoBERTa-based fallacy classification microservice

Endpoints:
- POST /classify - Classify text for fallacies
- GET  /health    - Health check
- GET  /labels    - Get supported labels
"""

from flask import Flask, request, jsonify
from functools import wraps
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import os

app = Flask(__name__)

MODEL_NAME = "MidhunKanadan/roberta-large-fallacy-classification"
MODEL = None
TOKENIZER = None

LABEL_MAPPING = {
    "equivocation": "CU-FALLACY-EQUIVOCATION",
    "faulty_generalization": "CU-FALLACY-FAULTY-GENERALIZATION",
    "fallacy_of_logic": "CU-FALLACY-LOGIC",
    "ad_populum": "CU-FALLACY-AD-POPULUM",
    "circular_reasoning": "CU-FALLACY-CIRCULAR-REASONING",
    "false_dilemma": "CU-FALLACY-FALSE-DICHOTOMY",
    "false_causality": "CU-FALLACY-FALSE-CAUSALITY",
    "fallacy_of_extension": "CU-FALLACY-EXTENSION",
    "fallacy_of_credibility": "CU-FALLACY-CREDIBILITY",
    "fallacy_of_relevance": "CU-FALLACY-RELEVANCE",
    "intentional": "CU-FALLACY-INTENTIONAL",
    "appeal_to_emotion": "CU-FALLACY-EMOTIONAL-REASONING",
    "ad_hominem": "CU-FALLACY-AD-HOMINEM",
}

FALLACY_LABELS = [
    "Ad Hominem",
    "Ad Populum",
    "Appeal to Emotion",
    "Circular Reasoning",
    "Equivocation",
    "Fallacy of Credibility",
    "Fallacy of Extension",
    "Fallacy of Logic",
    "Fallacy of Relevance",
    "False Causality",
    "False Dilemma",
    "Faulty Generalization",
    "Intentional",
]

CONFIDENCE_THRESHOLD = 0.25


def load_model():
    """Load model and tokenizer"""
    global MODEL, TOKENIZER
    if MODEL is None:
        print(f"Loading {MODEL_NAME}...")
        TOKENIZER = AutoTokenizer.from_pretrained(MODEL_NAME)
        MODEL = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
        DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
        MODEL = MODEL.to(DEVICE)
        MODEL.eval()
        print(f"Model loaded on {DEVICE}")
    return MODEL, TOKENIZER


def classify_text(text: str, threshold: float = CONFIDENCE_THRESHOLD) -> list[dict]:
    """Classify a single text for fallacies"""
    model, tokenizer = load_model()
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

    inputs = tokenizer(
        text, return_tensors="pt", truncation=True, padding=True, max_length=128
    ).to(DEVICE)

    with torch.no_grad():
        logits = model(**inputs).logits
        probs = F.softmax(logits, dim=-1)[0]

    results = []
    for i, score in enumerate(probs):
        label = model.config.id2label[i]
        confidence = score.item()
        if confidence >= threshold:
            mapped_label = LABEL_MAPPING.get(label, label)
            results.append(
                {
                    "label": label,
                    "mappedLabel": mapped_label,
                    "confidence": round(confidence, 4),
                }
            )

    results.sort(key=lambda x: x["confidence"], reverse=True)
    return results


@app.route("/classify", methods=["POST"])
def classify():
    """Classify text for fallacies"""
    data = request.get_json() or {}
    texts = data.get("texts", [])

    if isinstance(texts, str):
        texts = [texts]

    if not texts:
        return jsonify({"error": "No text provided"}), 400

    results = []
    for text in texts:
        if len(text.strip()) < 5:
            results.append({"text": text, "fallacies": [], "error": "Text too short"})
            continue

        try:
            fallacies = classify_text(text)
            results.append({"text": text, "fallacies": fallacies, "error": None})
        except Exception as e:
            results.append({"text": text, "fallacies": [], "error": str(e)})

    return jsonify({"results": results})


@app.route("/classify-single", methods=["POST"])
def classify_single():
    """Classify a single text - simpler endpoint"""
    data = request.get_json() or {}
    text = data.get("text", "")

    if len(text.strip()) < 5:
        return jsonify({"error": "Text too short"}), 400

    try:
        fallacies = classify_text(text)
        return jsonify(
            {
                "text": text,
                "fallacies": fallacies,
                "maxConfidence": fallacies[0]["confidence"] if fallacies else 0,
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    """Health check"""
    try:
        model, _ = load_model()
        return jsonify(
            {
                "status": "ok",
                "model": MODEL_NAME,
                "device": "cuda" if torch.cuda.is_available() else "cpu",
            }
        )
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route("/labels", methods=["GET"])
def labels():
    """Get supported labels"""
    return jsonify(
        {
            "labels": FALLACY_LABELS,
            "mapping": LABEL_MAPPING,
        }
    )


@app.route("/fallacy-data", methods=["GET"])
def fallacy_data():
    """Serve the fallacy dataset"""
    import json
    from pathlib import Path

    data_path = Path(__file__).parent.parent.parent / "fallacy_data.json"
    if data_path.exists():
        with open(data_path, "r", encoding="utf-8") as f:
            return jsonify(json.load(f))
    return jsonify({"error": "Dataset not found"}), 404


@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


def run_classifier(host: str = "0.0.0.0", port: int = 5002):
    """Run the classifier service"""
    app.run(host=host, port=port, debug=False, threaded=True)


if __name__ == "__main__":
    port = int(os.environ.get("FALLACY_PORT", 5002))
    run_classifier(port=port)
