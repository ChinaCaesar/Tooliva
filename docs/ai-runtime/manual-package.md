# AI Runtime Manual Package

## Goal

Prepare the local AI runtime as files that users can download manually and then import inside Tooliva.

This workflow does not rely on any remote manifest, CDN metadata, or in-app runtime download.

## Output Files

The manual distribution should provide:

1. `ai-runtime.7z`
2. `big-lama.pt`

The desktop app installs the runtime only after the user selects the local runtime archive file.
The LaMA model is imported only after the user selects the local `.pt` file.

## Package the Runtime

Run from the repository root:

```powershell
.\scripts\package-ai-runtime.ps1 -RuntimeVersion 1.0.0
```

Optional: copy the model into the same output folder for release handoff.

```powershell
.\scripts\package-ai-runtime.ps1 `
  -RuntimeVersion 1.0.0 `
  -ModelFilePath "D:\releases\big-lama.pt"
```

Default output:

```text
dist/ai-runtime/1.0.0/
  ai-runtime.7z
  manual-import-notes.txt
  big-lama.pt   # only when -ModelFilePath is provided
```

## Runtime Package Layout

`ai-runtime.7z` must contain one of these layouts:

```text
python/
sidecars/
```

or

```text
python-base/
python-site-packages/
sidecars/
```

Required files:

```text
sidecars/lama_inpaint.py
python/python.exe
```

or

```text
sidecars/lama_inpaint.py
python-base/python.exe
python-site-packages/torch/__init__.py
python-site-packages/torch/version.py
```

## User Flow

1. User downloads `ai-runtime.7z`.
2. User opens Tooliva settings and imports the local runtime package.
3. User downloads `big-lama.pt`.
4. User imports the local model file in settings.

## Validation Checklist

1. `ai-runtime.7z` extracts successfully.
2. The runtime contains `sidecars/lama_inpaint.py`.
3. The runtime contains a valid Python layout.
4. `big-lama.pt` is distributed as a separate local file.
5. A clean Windows client can import both files without any network dependency.

## Compatibility

- New packaging defaults to `ai-runtime.7z` because it compresses the current full AI runtime well below the 2 GB single-file limit.
- The desktop app still accepts legacy `ai-runtime.zip` packages for backward compatibility.
- The desktop installer now bundles its own `7za.exe`, so end users do not need to install any external archive tool before importing the AI runtime.
