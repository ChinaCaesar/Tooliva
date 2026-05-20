# AI Runtime

This directory is the shared runtime home for local AI tools.

Expected packaged layout:

```text
resources/ai-runtime/
  python/                 # portable Python runtime, bundled by release packaging
  sidecars/
    lama_inpaint.py       # stable sidecar entrypoint
    requirements.txt      # Python dependencies for the portable runtime
```

Large model files are not bundled into the installer. They are downloaded on first use to the app data model store:

```text
<app-data>/ai-models/
  lama/big-lama.pt
  _torch/hub/checkpoints/big-lama.pt
```

The `_torch` directory is shared by iopaint/PyTorch so future image and video watermark removal can reuse the same LaMA model without another download.

## Development setup

Run from the repository root:

```powershell
.\scripts\setup-ai-runtime.ps1
```

This creates `src-tauri/resources/ai-runtime/python` and installs the AI dependencies into that project runtime. The application intentionally does not fall back to the system Python, because the packaged desktop app must use the same self-contained runtime.
