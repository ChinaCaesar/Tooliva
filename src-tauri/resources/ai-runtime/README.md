# AI Runtime

This directory contains the local runtime source used to build the offline AI runtime package.

Expected packaged layout:

```text
resources/ai-runtime/
  python/                 # portable Python runtime, bundled by release packaging
  sidecars/
    lama_inpaint.py       # stable sidecar entrypoint
    requirements.txt      # Python dependencies for the portable runtime
```

The desktop installer does not bundle the large runtime payload or the LaMA model.
Instead, users download these files separately and import them manually inside the app.

Imported model files are stored under:

```text
<install-dir>/ToolivaAI/models/
  lama/big-lama.pt
  _torch/hub/checkpoints/big-lama.pt
```

The `_torch` directory is shared by iopaint/PyTorch so future image and video watermark removal can reuse the same imported LaMA model. Users can override the runtime/model directories from the Settings page if they prefer a custom writable location.

## Development setup

Run from the repository root:

```powershell
.\scripts\setup-ai-runtime.ps1
```

This creates `src-tauri/resources/ai-runtime/python` and installs the AI dependencies into that project runtime. The application intentionally does not fall back to the system Python, because the packaged desktop app must use the same self-contained runtime.
