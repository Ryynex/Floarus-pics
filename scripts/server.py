#!/usr/bin/env python3
"""
scripts/server.py
=================
Lightweight FastAPI Microservice for Florus Skin Isolation & Micro-Pass.
Deployable on Render, Railway, Modal, or Hugging Face Spaces (Free Tier).

Usage:
  pip install fastapi uvicorn
  python scripts/server.py
"""

import base64
import os
import sys
import tempfile
import time
import cv2
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Import core detection logic from generate_skin_mask
from generate_skin_mask import (
    load_image,
    detect_face_landmarks,
    build_skin_mask,
    apply_local_skin_enhancement,
)

app = FastAPI(title="Florus Skin Isolation Microservice", version="1.0.0")


class DetectRequest(BaseModel):
    image_url: str
    local_pass: bool = False


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "florus-skin-detector"}


@app.post("/detect")
def detect_and_mask(req: DetectRequest):
    t0 = time.time()
    try:
        img = load_image(req.image_url)
        h, w, _ = img.shape

        face_found, points, bbox = detect_face_landmarks(img)
        mask = build_skin_mask(img, face_found, points, bbox)

        # Encode mask to PNG base64
        _, mask_buffer = cv2.imencode(".png", mask)
        mask_base64 = base64.b64encode(mask_buffer).decode("utf-8")

        enhanced_base64 = None
        if req.local_pass and face_found:
            enhanced = apply_local_skin_enhancement(img, mask)
            _, enh_buffer = cv2.imencode(".png", enhanced)
            enhanced_base64 = base64.b64encode(enh_buffer).decode("utf-8")

        elapsed_ms = round((time.time() - t0) * 1000, 2)
        return {
            "status": "success",
            "face_detected": bool(face_found),
            "bbox": list(bbox) if bbox else None,
            "mask_base64": mask_base64,
            "enhanced_base64": enhanced_base64,
            "dimensions": {"width": w, "height": h},
            "elapsed_ms": elapsed_ms,
        }
    except Exception as e:
        elapsed_ms = round((time.time() - t0) * 1000, 2)
        raise HTTPException(
            status_code=500,
            detail={"status": "error", "error": str(e), "elapsed_ms": elapsed_ms},
        )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
