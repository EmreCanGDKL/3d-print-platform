import argparse
import json
import os
from pathlib import Path

import numpy as np
import tensorflow as tf
import uvicorn
from fastapi import FastAPI, File, UploadFile
from PIL import Image


IMAGE_SIZE = (224, 224)
app = FastAPI(title="PrintForge Quality AI")
model: tf.keras.Model | None = None
labels: list[str] = []


def normalize_label(label: str) -> str:
    value = label.strip().lower().replace(" ", "_").replace("-", "_")
    aliases = {
        "no_defect": "healthy",
        "normal": "healthy",
        "good": "healthy",
        "layer_shifting": "layer_shift",
        "layer_shift": "layer_shift",
        "cracking": "cracking",
        "off_platform": "off_platform",
        "offplatform": "off_platform",
        "warping": "warping",
        "stringing": "stringing",
    }
    return aliases.get(value, value)


def preprocess_image(image_file: UploadFile) -> np.ndarray:
    image = Image.open(image_file.file).convert("RGB").resize(IMAGE_SIZE)
    array = np.asarray(image, dtype=np.float32)
    return np.expand_dims(array, axis=0)


def load_model_files(model_path: str, labels_path: str) -> None:
    global model, labels
    model = tf.keras.models.load_model(Path(model_path).resolve())
    labels = json.loads(Path(labels_path).resolve().read_text(encoding="utf-8"))


@app.on_event("startup")
async def load_model_from_environment():
    model_path = os.getenv("PRINT_QUALITY_MODEL_PATH")
    labels_path = os.getenv("PRINT_QUALITY_LABELS_PATH")
    if model_path and labels_path:
      load_model_files(model_path, labels_path)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "modelLoaded": model is not None and bool(labels),
        "labels": labels,
    }


@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    if model is None or not labels:
        return {"key": "healthy", "confidence": 0.0}

    batch = preprocess_image(image)
    probabilities = model.predict(batch, verbose=0)[0]
    index = int(np.argmax(probabilities))
    confidence = float(probabilities[index])
    return {
        "key": normalize_label(labels[index]),
        "confidence": confidence,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the trained PrintForge quality model.")
    parser.add_argument("--model", required=True)
    parser.add_argument("--labels", required=True)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5055)
    args = parser.parse_args()

    load_model_files(args.model, args.labels)

    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
