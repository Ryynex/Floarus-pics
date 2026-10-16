#!/usr/bin/env python3
"""
scripts/generate_skin_mask.py
=============================
Automated Local Face & Skin Isolation + Skin Micro-Pass Engine for Florus.pics.

Phase 2: Automated Local Face & Skin Isolation (Cost: ₹0.00)
- Uses MediaPipe FaceLandmarker (478 3D landmarks) / OpenCV Cascade fallback.
- Operates on a fast 640px normalized proxy for <20ms inference time on CPU.
- Re-projects normalized coordinates [0.0, 1.0] to full native output resolution (e.g. 1920x2400).
- Extracts facial boundary convex hull + downward neck trapezoid expansion.
- Applies resolution-adaptive dilation (>=15px) + Gaussian blur (>=21px) for seamless alpha blending.

Phase 3: The Skin Micro-Pass
- Option A: Generates feathered PNG mask for fal-ai/flux-general/inpainting (strength 0.28-0.35).
- Option B: 100% Local High-Frequency Frequency Separation & Micro-Pore Injection (Cost: ₹0.00).

Outputs machine-readable JSON to stdout for Node.js / Next.js backend integration.
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import cv2
import numpy as np


def find_or_download_model(model_dir=None):
    """Locates face_landmarker.task or downloads it from Google's CDN if missing."""
    search_paths = [
        model_dir,
        os.path.join(os.path.dirname(__file__), "face_landmarker.task"),
        os.path.join(os.getcwd(), "scripts", "face_landmarker.task"),
        os.path.join(os.getcwd(), "face_landmarker.task"),
    ]
    for p in search_paths:
        if p and os.path.isfile(p):
            return p

    target_path = os.path.join(os.path.dirname(__file__), "face_landmarker.task")
    if not os.path.exists(target_path):
        url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
        try:
            urllib.request.urlretrieve(url, target_path)
            return target_path
        except Exception as e:
            root_path = os.path.join(os.getcwd(), "face_landmarker.task")
            if os.path.isfile(root_path):
                return root_path
            raise RuntimeError(f"Could not locate or download face_landmarker.task: {e}")
    return target_path


def load_image(image_input):
    """Loads an image from local path or remote URL."""
    if image_input.startswith("http://") or image_input.startswith("https://"):
        req = urllib.request.Request(
            image_input,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FlorusSkinPass/1.0"}
        )
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
        arr = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    else:
        img = cv2.imread(image_input)
    if img is None:
        raise ValueError(f"Failed to read image from {image_input}")
    return img


def detect_face_landmarks(img, model_path=None):
    """
    Detects face landmarks using downsampled inference for ultra-fast CPU execution (<30ms).
    Returns normalized landmarks and reprojects them to full-resolution coordinates.
    """
    h, w, _ = img.shape
    face_found = False
    points = []
    bbox = None

    # Downsample proxy for inference speed (max dim 640px)
    max_dim = max(h, w)
    if max_dim > 640:
        scale = 640.0 / max_dim
        small_w = max(1, int(round(w * scale)))
        small_h = max(1, int(round(h * scale)))
        proxy_img = cv2.resize(img, (small_w, small_h), interpolation=cv2.INTER_AREA)
    else:
        proxy_img = img

    # 1. MediaPipe Tasks (MediaPipe >= 1.0)
    try:
        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision
        import mediapipe as mp

        task_path = find_or_download_model(model_path)
        base_options = python.BaseOptions(model_asset_path=task_path)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
            num_faces=1,
        )
        with vision.FaceLandmarker.create_from_options(options) as detector:
            rgb_proxy = cv2.cvtColor(proxy_img, cv2.COLOR_BGR2RGB)
            mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_proxy)
            result = detector.detect(mp_img)
            if result.face_landmarks and len(result.face_landmarks) > 0:
                face_found = True
                lm = result.face_landmarks[0]
                # Normalized coordinates remapped to full image dimensions
                points = np.array([[int(round(p.x * w)), int(round(p.y * h))] for p in lm], dtype=np.int32)
    except Exception:
        pass

    # 2. Legacy MediaPipe solutions fallback
    if not face_found:
        try:
            import mediapipe as mp
            if hasattr(mp, "solutions") and hasattr(mp.solutions, "face_mesh"):
                with mp.solutions.face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1) as face_mesh:
                    results = face_mesh.process(cv2.cvtColor(proxy_img, cv2.COLOR_BGR2RGB))
                    if results.multi_face_landmarks:
                        face_found = True
                        lm = results.multi_face_landmarks[0].landmark
                        points = np.array([[int(round(p.x * w)), int(round(p.y * h))] for p in lm], dtype=np.int32)
        except Exception:
            pass

    # 3. OpenCV Haar Cascade Fallback
    if not face_found:
        try:
            gray = cv2.cvtColor(proxy_img, cv2.COLOR_BGR2GRAY)
            cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            face_cascade = cv2.CascadeClassifier(cascade_path)
            faces = face_cascade.detectMultiScale(gray, 1.25, 4, minSize=(40, 40))
            if len(faces) > 0:
                faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
                px, py, pw, ph = faces[0]
                face_found = True
                scale_x = w / float(proxy_img.shape[1])
                scale_y = h / float(proxy_img.shape[0])
                bbox = (
                    int(round(px * scale_x)),
                    int(round(py * scale_y)),
                    int(round(pw * scale_x)),
                    int(round(ph * scale_y))
                )
        except Exception:
            pass

    if face_found and len(points) > 0:
        min_x = int(np.min(points[:, 0]))
        max_x = int(np.max(points[:, 0]))
        min_y = int(np.min(points[:, 1]))
        max_y = int(np.max(points[:, 1]))
        bbox = (min_x, min_y, max_x - min_x, max_y - min_y)

    return face_found, points, bbox


def build_skin_mask(img, face_found, points, bbox):
    """
    Constructs the soft feathered binary skin mask covering face and exposed neck.
    """
    h, w, _ = img.shape
    mask = np.zeros((h, w), dtype=np.uint8)
    if not face_found:
        return mask

    if len(points) > 0:
        # Extract convex hull of facial boundary points
        hull = cv2.convexHull(points)
        cv2.fillConvexPoly(mask, hull, 255)

        # Neck expansion: identify bottom points of the jaw
        bx, by, bw, bh = bbox
        neck_top_left = [int(bx + bw * 0.22), int(by + bh * 0.95)]
        neck_top_right = [int(bx + bw * 0.78), int(by + bh * 0.95)]
        neck_bottom_right = [int(bx + bw * 0.88), int(min(h - 1, by + bh * 1.38))]
        neck_bottom_left = [int(bx + bw * 0.12), int(min(h - 1, by + bh * 1.38))]

        neck_polygon = np.array([neck_top_left, neck_top_right, neck_bottom_right, neck_bottom_left], dtype=np.int32)
        cv2.fillConvexPoly(mask, neck_polygon, 255)

    elif bbox is not None:
        bx, by, bw, bh = bbox
        center = (int(bx + bw / 2), int(by + bh / 2))
        axes = (int(bw * 0.54), int(bh * 0.65))
        cv2.ellipse(mask, center, axes, 0, 0, 360, 255, -1)

        neck_pts = np.array([
            [int(bx + bw * 0.25), int(by + bh * 0.88)],
            [int(bx + bw * 0.75), int(by + bh * 0.88)],
            [int(bx + bw * 0.85), int(min(h - 1, by + bh * 1.35))],
            [int(bx + bw * 0.15), int(min(h - 1, by + bh * 1.35))]
        ], dtype=np.int32)
        cv2.fillConvexPoly(mask, neck_pts, 255)

    # Resolution-adaptive dilation & Gaussian blur for seamless alpha blending
    kernel_size = max(15, int(round(w * 0.0075)))
    if kernel_size % 2 == 0:
        kernel_size += 1
    blur_size = max(21, int(round(w * 0.011)))
    if blur_size % 2 == 0:
        blur_size += 1

    kernel = np.ones((kernel_size, kernel_size), np.uint8)
    mask = cv2.dilate(mask, kernel, iterations=1)
    mask = cv2.GaussianBlur(mask, (blur_size, blur_size), 0)

    return mask


def apply_local_skin_enhancement(img, mask):
    """
    Option B: 100% Local High-Frequency Frequency Separation & Micro-Pore Injection (Cost: ₹0.00).
    Decomposes the image into low and high frequencies, injects natural organic epidermal micro-texture,
    and alpha-blends the enhancement strictly inside the skin mask. Saree & background are 100% untouched.
    """
    h, w, _ = img.shape
    float_img = img.astype(np.float32)

    # 1. Micro-contrast frequency separation
    blurred = cv2.GaussianBlur(float_img, (0, 0), sigmaX=1.5, sigmaY=1.5)
    high_freq = float_img - blurred
    enhanced_skin = float_img + 1.25 * high_freq

    # 2. Organic dermal micro-pore noise
    np.random.seed(42)
    noise = np.random.normal(loc=0.0, scale=3.5, size=(h, w)).astype(np.float32)
    noise_smooth = cv2.GaussianBlur(noise, (3, 3), 0.5)

    # Modulate noise by skin luminance
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    lum_weight = np.clip(np.sin(np.pi * (gray / 255.0)), 0.2, 1.0)
    for c in range(3):
        enhanced_skin[:, :, c] += noise_smooth * lum_weight * 0.75

    enhanced_skin = np.clip(enhanced_skin, 0, 255).astype(np.uint8)

    # 3. Alpha blend using the feathered skin mask
    alpha = (mask.astype(np.float32) / 255.0)[:, :, np.newaxis]
    result = (float_img * (1.0 - alpha) + enhanced_skin.astype(np.float32) * alpha).astype(np.uint8)

    return result


def main():
    parser = argparse.ArgumentParser(description="Florus Skin Isolation & Micro-Pass Engine")
    parser.add_argument("--input", required=True, help="Input image file path or URL")
    parser.add_argument("--output_mask", required=False, default=None, help="Output file path for mask PNG")
    parser.add_argument("--enhanced_output", required=False, default=None, help="Output path for local micro-pass image")
    parser.add_argument("--local_pass", action="store_true", help="Apply Option B local micro-pass")
    parser.add_argument("--model_path", required=False, default=None, help="Custom path to face_landmarker.task")
    args = parser.parse_args()

    start_time = time.time()
    try:
        img = load_image(args.input)
        h, w, _ = img.shape

        face_found, points, bbox = detect_face_landmarks(img, args.model_path)
        mask = build_skin_mask(img, face_found, points, bbox)

        if args.output_mask:
            os.makedirs(os.path.dirname(os.path.abspath(args.output_mask)), exist_ok=True)
            cv2.imwrite(args.output_mask, mask)

        if args.local_pass and args.enhanced_output:
            if face_found:
                enhanced = apply_local_skin_enhancement(img, mask)
            else:
                enhanced = img
            os.makedirs(os.path.dirname(os.path.abspath(args.enhanced_output)), exist_ok=True)
            cv2.imwrite(args.enhanced_output, enhanced)

        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        response = {
            "status": "success",
            "face_detected": bool(face_found),
            "bbox": list(bbox) if bbox else None,
            "mask_path": os.path.abspath(args.output_mask) if args.output_mask and face_found else None,
            "enhanced_path": os.path.abspath(args.enhanced_output) if args.enhanced_output and args.local_pass else None,
            "dimensions": {"width": w, "height": h},
            "elapsed_ms": elapsed_ms
        }
        print(json.dumps(response))
        sys.exit(0)

    except Exception as e:
        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        error_response = {
            "status": "error",
            "error": str(e),
            "face_detected": False,
            "elapsed_ms": elapsed_ms
        }
        print(json.dumps(error_response))
        sys.exit(1)


if __name__ == "__main__":
    main()
