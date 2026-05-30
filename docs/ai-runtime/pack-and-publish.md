# AI Runtime Pack And Publish

## CDN should contain

The desktop installer should **not** include the heavy AI runtime payload.
Upload these artifacts to CDN separately:

1. `manifest.json`
2. `ai-runtime.zip`
3. `big-lama.pt`

Recommended layout:

```text
https://cdn.example.com/ai-runtime/
  manifest.json
  windows-x64/1.0.0/ai-runtime.zip

https://cdn.example.com/ai-models/
  lama/big-lama.pt
```

## What goes into `ai-runtime.zip`

Package the contents of `src-tauri/resources/ai-runtime/` with this final structure:

```text
python/
sidecars/
```

Required files:

```text
python/python.exe
or
python/Scripts/python.exe

sidecars/lama_inpaint.py
```

Do not include:

- `__pycache__/`
- `*.pyc`
- model files such as `big-lama.pt`

## Generate package and manifest

Run from the repository root:

```powershell
.\scripts\package-ai-runtime.ps1 `
  -RuntimeVersion 1.0.0 `
  -MinAppVersion 0.1.0 `
  -PackageBaseUrl "https://cdn.example.com/ai-runtime" `
  -ModelBaseUrl "https://cdn.example.com/ai-models" `
  -ModelFilePath "D:\releases\big-lama.pt"
```

Generated output:

```text
dist/ai-runtime/1.0.0/
  ai-runtime.zip
  manifest.generated.json
  stage/
```

`manifest.generated.json` already includes:

- runtime package size
- runtime package SHA256
- runtime package URL
- model URL
- model SHA256 and size when `-ModelFilePath` is provided

## Upload sequence

1. Upload `dist/ai-runtime/<version>/ai-runtime.zip`
2. Upload `big-lama.pt`
3. Rename or copy `manifest.generated.json` to the CDN manifest path
4. Set `.env.production`:

```env
VITE_AI_RUNTIME_MANIFEST_URL=https://cdn.example.com/ai-runtime/manifest.json
VITE_AI_RUNTIME_BASE_URL=https://cdn.example.com/ai-runtime
```

## Validation checklist

1. `ai-runtime.zip` can be extracted and contains `python/` and `sidecars/`
2. `sidecars/lama_inpaint.py` exists after extraction
3. `python/python.exe` or `python/Scripts/python.exe` exists after extraction
4. `manifest.json` package URL and model URL are publicly reachable
5. SHA256 values in manifest match uploaded files
6. A clean Windows client can enter AI mode, pass environment checks, and see install metadata
