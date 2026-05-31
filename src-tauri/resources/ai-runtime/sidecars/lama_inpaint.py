from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import tempfile
import time
import urllib.request
from pathlib import Path


def emit(**payload):
    print(json.dumps(payload, ensure_ascii=True), flush=True)


def debug_logs_enabled() -> bool:
    return os.environ.get("TOOLIVA_DEBUG_LOG", "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
        "debug",
    }


def download_model(args: argparse.Namespace) -> int:
    model_path = Path(args.model_path)
    torch_home = Path(args.torch_home)
    checkpoint_path = torch_home / "hub" / "checkpoints" / model_path.name
    model_path.parent.mkdir(parents=True, exist_ok=True)
    checkpoint_path.parent.mkdir(parents=True, exist_ok=True)

    if model_path.exists() and model_path.stat().st_size > 0:
        if not checkpoint_path.exists():
            shutil.copy2(model_path, checkpoint_path)
        emit(event="progress", stage="ready", downloaded_bytes=model_path.stat().st_size, total_bytes=model_path.stat().st_size)
        return 0

    tmp = model_path.with_suffix(model_path.suffix + ".download")
    if tmp.exists():
        tmp.unlink()

    request = urllib.request.Request(args.model_url, headers={"User-Agent": "Tooliva/AIModelDownloader"})
    with urllib.request.urlopen(request, timeout=30) as response:
        total = int(response.headers.get("Content-Length") or 0)
        done = 0
        emit(event="progress", stage="downloading", downloaded_bytes=0, total_bytes=total)
        with tmp.open("wb") as handle:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                handle.write(chunk)
                done += len(chunk)
                emit(event="progress", stage="downloading", downloaded_bytes=done, total_bytes=total)

    tmp.replace(model_path)
    shutil.copy2(model_path, checkpoint_path)
    size = model_path.stat().st_size
    emit(event="progress", stage="ready", downloaded_bytes=size, total_bytes=size)
    return 0


def check_runtime(args: argparse.Namespace) -> int:
    os.environ["TORCH_HOME"] = str(Path(args.torch_home))
    modules = {
        "cv2": "opencv-python-headless",
        "numpy": "numpy",
        "PIL": "pillow",
    }
    if args.require_lama:
        modules["torch"] = "torch"
        modules["iopaint"] = "iopaint"
    missing = []
    for module_name, package_name in modules.items():
        try:
            __import__(module_name)
        except Exception as exc:
            missing.append({"module": module_name, "package": package_name, "error": str(exc)})
    if missing:
        emit(event="runtime-check", ready=False, missing=missing)
        return 2
    device = "cpu"
    torch_version = ""
    if args.require_lama:
        import torch

        device = "cuda" if torch.cuda.is_available() else "cpu"
        torch_version = getattr(torch, "__version__", "")

    emit(
        event="runtime-check",
        ready=True,
        device=device,
        torch_version=torch_version,
    )
    return 0


def parse_regions(raw: str):
    data = json.loads(raw)
    regions = []
    for item in data:
        x = max(0.0, min(1.0, float(item["x"])))
        y = max(0.0, min(1.0, float(item["y"])))
        w = max(0.0, min(1.0 - x, float(item["width"])))
        h = max(0.0, min(1.0 - y, float(item["height"])))
        if w > 0 and h > 0:
            regions.append((x, y, w, h))
    if not regions:
        raise ValueError("No valid inpaint regions")
    return regions


class LamaInpaintService:
    def __init__(self, torch_home: str):
        os.environ["TORCH_HOME"] = str(Path(torch_home))
        os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")
        self.torch_home = torch_home
        self._runtime_loaded = False
        self._lama_loaded = False
        self.device = "cpu"
        self.model = None
        self.cv2 = None
        self.np = None
        self.Image = None
        self.ImageDraw = None
        self.ImageFilter = None
        self.HDStrategy = None
        self.LDMSampler = None
        self.Config = None

    def load_runtime(self, detect_torch: bool = False):
        if self._runtime_loaded:
            return
        started = time.perf_counter()
        import cv2
        import numpy as np
        from PIL import Image, ImageDraw, ImageFile, ImageFilter

        ImageFile.LOAD_TRUNCATED_IMAGES = True

        if detect_torch:
            import torch

            configure_torch_runtime(torch)
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.cv2 = cv2
        self.np = np
        self.Image = Image
        self.ImageDraw = ImageDraw
        self.ImageFilter = ImageFilter
        self._runtime_loaded = True
        emit_perf(stage="load-runtime", duration_ms=elapsed_ms(started), device=self.device)

    def load_lama(self):
        if self._lama_loaded:
            return
        started = time.perf_counter()
        self.load_runtime()
        import torch
        from iopaint.model_manager import ModelManager
        from iopaint.schema import HDStrategy, LDMSampler, InpaintRequest as Config

        configure_torch_runtime(torch)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = ModelManager(name="lama", device=self.device)
        self.HDStrategy = HDStrategy
        self.LDMSampler = LDMSampler
        self.Config = Config
        self._lama_loaded = True
        emit_perf(stage="load-lama", duration_ms=elapsed_ms(started), device=self.device)

    def inpaint(self, input_path: str, output_path: str, regions_raw: str, output_format: str, mode: str = "standard", request_id=None):
        total_started = time.perf_counter()
        self.load_runtime()

        image_path = Path(input_path)
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        regions = parse_regions(regions_raw)
        profile = resolve_profile(mode, self.device)

        stage_started = time.perf_counter()
        image = self.Image.open(image_path).convert("RGB")
        emit_perf(id=request_id, stage="decode-image", duration_ms=elapsed_ms(stage_started), width=image.width, height=image.height)

        stage_started = time.perf_counter()
        crop_box = compute_crop_box(image.size, regions, margin=profile["margin"])
        crop_image = image.crop(crop_box)
        crop_mask = self.Image.new("L", crop_image.size, 0)
        draw = self.ImageDraw.Draw(crop_mask)
        left, top, _, _ = crop_box
        for x, y, w, h in regions:
            x1 = int(round(x * image.width)) - left
            y1 = int(round(y * image.height)) - top
            x2 = int(round((x + w) * image.width)) - left
            y2 = int(round((y + h) * image.height)) - top
            draw.rectangle([x1, y1, x2, y2], fill=255)
        emit_perf(
            id=request_id,
            stage="prepare-crop-mask",
            duration_ms=elapsed_ms(stage_started),
            crop_width=crop_image.width,
            crop_height=crop_image.height,
            regions=len(regions),
            backend=profile["backend"],
            algorithm=profile["algorithm"],
            mode=mode,
        )

        stage_started = time.perf_counter()
        if profile["backend"] == "lama":
            result_image = self.run_lama(crop_image, crop_mask, profile, request_id=request_id)
        else:
            result_image = self.run_cv2(crop_image, crop_mask, profile, request_id=request_id)
        emit_perf(id=request_id, stage="inpaint-backend", duration_ms=elapsed_ms(stage_started), backend=profile["backend"], algorithm=profile["algorithm"])

        stage_started = time.perf_counter()
        final_image = image.copy()
        paste_mask = build_paste_mask(crop_mask, profile["blend"], self.ImageFilter)
        final_image.paste(result_image, crop_box[:2], paste_mask)
        emit_perf(id=request_id, stage="compose", duration_ms=elapsed_ms(stage_started))

        format_name = output_format.upper()
        if format_name == "JPG":
            format_name = "JPEG"
        fd, tmp_name = tempfile.mkstemp(prefix=output_path.name, suffix=".tmp", dir=str(output_path.parent))
        os.close(fd)
        tmp = Path(tmp_name)
        try:
            stage_started = time.perf_counter()
            save_output_image(final_image, tmp, format_name)
            emit_perf(id=request_id, stage="encode-output", duration_ms=elapsed_ms(stage_started), format=format_name, output_bytes=tmp.stat().st_size if tmp.exists() else 0)
            stage_started = time.perf_counter()
            tmp.replace(output_path)
            emit_perf(id=request_id, stage="replace-output", duration_ms=elapsed_ms(stage_started))
        finally:
            if tmp.exists():
                tmp.unlink()
        emit_perf(id=request_id, stage="total", duration_ms=elapsed_ms(total_started), output_path=str(output_path))

    def run_cv2(self, crop_image, crop_mask, profile, request_id=None):
        stage_started = time.perf_counter()
        mask = self.np.array(crop_mask)
        kernel_size = max(1, int(profile["mask_expand"]))
        if kernel_size > 1:
            kernel = self.np.ones((kernel_size, kernel_size), self.np.uint8)
            mask = self.cv2.dilate(mask, kernel, iterations=1)
        rgb = self.np.array(crop_image)
        bgr = self.cv2.cvtColor(rgb, self.cv2.COLOR_RGB2BGR)
        emit_perf(id=request_id, stage="cv2-preprocess", duration_ms=elapsed_ms(stage_started), crop_width=crop_image.width, crop_height=crop_image.height)
        if profile["algorithm"] == "hybrid":
            stage_started = time.perf_counter()
            telea = self.cv2.inpaint(bgr, mask, float(profile["radius"]), self.cv2.INPAINT_TELEA)
            emit_perf(id=request_id, stage="cv2-telea", duration_ms=elapsed_ms(stage_started), radius=profile["radius"])
            stage_started = time.perf_counter()
            ns = self.cv2.inpaint(bgr, mask, float(profile["radius"]), self.cv2.INPAINT_NS)
            emit_perf(id=request_id, stage="cv2-ns", duration_ms=elapsed_ms(stage_started), radius=profile["radius"])
            stage_started = time.perf_counter()
            alpha = (mask.astype(self.np.float32) / 255.0)[:, :, None]
            blended = self.cv2.addWeighted(telea, 0.72, ns, 0.28, 0)
            result = (blended * alpha + bgr * (1.0 - alpha)).astype(self.np.uint8)
            emit_perf(id=request_id, stage="cv2-blend", duration_ms=elapsed_ms(stage_started))
        else:
            algorithm = self.cv2.INPAINT_NS if profile["algorithm"] == "ns" else self.cv2.INPAINT_TELEA
            stage_started = time.perf_counter()
            result = self.cv2.inpaint(bgr, mask, float(profile["radius"]), algorithm)
            emit_perf(id=request_id, stage=f"cv2-{profile['algorithm']}", duration_ms=elapsed_ms(stage_started), radius=profile["radius"])
        return self.Image.fromarray(self.cv2.cvtColor(result, self.cv2.COLOR_BGR2RGB))

    def run_lama(self, crop_image, crop_mask, profile, request_id=None):
        stage_started = time.perf_counter()
        emit_perf(id=request_id, stage="lama-load-start", duration_ms=0, device=self.device)
        self.load_lama()
        emit_perf(id=request_id, stage="lama-ensure-loaded", duration_ms=elapsed_ms(stage_started), device=self.device)
        stage_started = time.perf_counter()
        model_image, model_mask, scale = resize_for_inference(
            crop_image,
            crop_mask,
            max_side=profile["max_side"],
            image_module=self.Image,
        )
        emit_perf(id=request_id, stage="lama-resize-input", duration_ms=elapsed_ms(stage_started), model_width=model_image.width, model_height=model_image.height, scale=scale)
        config = self.Config(
            ldm_steps=profile["steps"],
            ldm_sampler=self.LDMSampler.ddim,
            hd_strategy=self.HDStrategy.ORIGINAL,
            hd_strategy_crop_margin=profile["margin"],
            hd_strategy_crop_trigger_size=profile["max_side"],
            hd_strategy_resize_limit=profile["max_side"],
        )
        stage_started = time.perf_counter()
        emit_perf(id=request_id, stage="lama-forward-start", duration_ms=0, device=self.device)
        result = self.model(self.np.array(model_image), self.np.array(model_mask), config)
        emit_perf(id=request_id, stage="lama-forward", duration_ms=elapsed_ms(stage_started), device=self.device)
        if result.dtype in [self.np.float64, self.np.float32]:
            result = self.np.clip(result, 0, 255).astype(self.np.uint8)
        result_image = self.Image.fromarray(self.cv2.cvtColor(result, self.cv2.COLOR_BGR2RGB))
        if scale != 1.0:
            stage_started = time.perf_counter()
            result_image = result_image.resize(crop_image.size, self.Image.Resampling.LANCZOS)
            emit_perf(id=request_id, stage="lama-resize-output", duration_ms=elapsed_ms(stage_started))
        return result_image


def compute_crop_box(image_size, regions, margin: int):
    width, height = image_size
    x1 = width
    y1 = height
    x2 = 0
    y2 = 0
    for x, y, w, h in regions:
        x1 = min(x1, int(round(x * width)))
        y1 = min(y1, int(round(y * height)))
        x2 = max(x2, int(round((x + w) * width)))
        y2 = max(y2, int(round((y + h) * height)))
    x1 = max(0, x1 - margin)
    y1 = max(0, y1 - margin)
    x2 = min(width, x2 + margin)
    y2 = min(height, y2 + margin)
    if x2 <= x1 or y2 <= y1:
        return (0, 0, width, height)
    return (x1, y1, x2, y2)


def resolve_profile(mode: str, device: str):
    normalized = (mode or "standard").strip().lower()
    if device == "cuda":
        profiles = {
            "fast": {"backend": "cv2", "algorithm": "telea", "radius": 3, "mask_expand": 3, "max_side": 768, "margin": 24, "blend": 5, "steps": 25},
            "standard": {"backend": "cv2", "algorithm": "hybrid", "radius": 4, "mask_expand": 5, "max_side": 1024, "margin": 32, "blend": 6, "steps": 35},
            "quality": {"backend": "lama", "algorithm": "telea", "radius": 5, "mask_expand": 5, "max_side": 1400, "margin": 96, "blend": 12, "steps": 50},
        }
    else:
        profiles = {
            "fast": {"backend": "cv2", "algorithm": "telea", "radius": 3, "mask_expand": 3, "max_side": 384, "margin": 20, "blend": 4, "steps": 20},
            "standard": {"backend": "cv2", "algorithm": "hybrid", "radius": 4, "mask_expand": 5, "max_side": 512, "margin": 28, "blend": 6, "steps": 25},
            "quality": {"backend": "lama", "algorithm": "telea", "radius": 5, "mask_expand": 5, "max_side": 768, "margin": 72, "blend": 10, "steps": 35},
        }
    return profiles.get(normalized, profiles["standard"])


def resize_for_inference(image, mask, max_side: int, image_module):
    width, height = image.size
    longest = max(width, height)
    if longest <= max_side:
        return image, mask, 1.0
    scale = max_side / float(longest)
    target = (max(1, int(round(width * scale))), max(1, int(round(height * scale))))
    return (
        image.resize(target, image_module.Resampling.LANCZOS),
        mask.resize(target, image_module.Resampling.NEAREST),
        scale,
    )


def build_paste_mask(mask, blend_radius: int, image_filter):
    if blend_radius <= 0:
        return mask
    expanded = mask.filter(image_filter.MaxFilter(size=blend_radius * 2 + 1))
    return expanded.filter(image_filter.GaussianBlur(radius=blend_radius / 2))


def save_output_image(image, path: Path, format_name: str):
    if format_name == "PNG":
        image.save(path, format=format_name, compress_level=1, optimize=False)
    elif format_name == "JPEG":
        image.save(path, format=format_name, quality=95, subsampling=0, optimize=False)
    else:
        image.save(path, format=format_name)


def elapsed_ms(started: float) -> int:
    return int(round((time.perf_counter() - started) * 1000))


def emit_perf(**payload):
    if not debug_logs_enabled():
        return
    payload["event"] = "perf"
    emit(**payload)


def configure_torch_runtime(torch):
    if getattr(torch, "cuda", None) is not None and torch.cuda.is_available():
        return
    cpu_count = os.cpu_count() or 1
    thread_count = max(1, min(cpu_count, max(1, cpu_count - 1)))
    try:
        torch.set_num_threads(thread_count)
    except Exception:
        pass
    try:
        torch.set_num_interop_threads(1)
    except Exception:
        pass


def process_image(args: argparse.Namespace) -> int:
    output_path = Path(args.output)
    emit(event="progress", stage="inpainting", percent=40, message="Applying local inpainting")
    service = LamaInpaintService(args.torch_home)
    service.inpaint(args.input, args.output, args.regions, args.format, args.mode)
    emit(event="progress", stage="done", percent=100, output_path=str(output_path))
    return 0


def run_worker(args: argparse.Namespace) -> int:
    service = LamaInpaintService(args.torch_home)
    service.load_runtime(detect_torch=args.require_lama)
    torch_version = ""
    if args.require_lama:
        import torch

        torch_version = getattr(torch, "__version__", "")

    emit(event="worker-ready", device=service.device, torch_version=torch_version)
    for line in sys.stdin.buffer:
        raw = line.decode("utf-8", errors="replace").strip()
        if not raw:
            continue
        request = {}
        try:
            request = json.loads(raw)
            request_id = request.get("id")
            command = request.get("command")
            if command == "shutdown":
                emit(id=request_id, ok=True)
                return 0
            if command != "inpaint-image":
                raise ValueError(f"Unsupported worker command: {command}")
            emit_perf(
                id=request_id,
                stage="request-received",
                duration_ms=0,
                mode=request.get("mode", "standard"),
                format=request.get("format", "png"),
                regions=len(request.get("regions", [])),
            )
            service.inpaint(
                input_path=request["input"],
                output_path=request["output"],
                regions_raw=json.dumps(request["regions"], ensure_ascii=False),
                output_format=request.get("format", "png"),
                mode=request.get("mode", "standard"),
                request_id=request_id,
            )
            emit(id=request_id, ok=True, output_path=request["output"])
        except Exception as exc:
            emit(id=request.get("id"), ok=False, error=str(exc))
            print(str(exc), file=sys.stderr, flush=True)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="lama_inpaint.py")
    sub = parser.add_subparsers(dest="command", required=True)

    dl = sub.add_parser("download-model")
    dl.add_argument("--model-url", required=True)
    dl.add_argument("--model-path", required=True)
    dl.add_argument("--torch-home", required=True)

    check = sub.add_parser("check-runtime")
    check.add_argument("--torch-home", required=True)
    check.add_argument("--require-lama", action="store_true")

    run = sub.add_parser("inpaint-image")
    run.add_argument("--input", required=True)
    run.add_argument("--output", required=True)
    run.add_argument("--regions", required=True, help="JSON array of relative x/y/width/height regions")
    run.add_argument("--format", choices=["png", "jpg", "jpeg", "webp", "bmp"], default="png")
    run.add_argument("--mode", choices=["standard", "quality"], default="standard")
    run.add_argument("--torch-home", required=True)

    worker = sub.add_parser("worker")
    worker.add_argument("--torch-home", required=True)
    worker.add_argument("--require-lama", action="store_true")

    args = parser.parse_args()
    try:
        if args.command == "download-model":
            return download_model(args)
        if args.command == "check-runtime":
            return check_runtime(args)
        if args.command == "inpaint-image":
            return process_image(args)
        if args.command == "worker":
            return run_worker(args)
    except Exception as exc:
        emit(event="error", message=str(exc))
        print(str(exc), file=sys.stderr, flush=True)
        return 1
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
