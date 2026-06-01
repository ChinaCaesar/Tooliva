# AI Enhancement Tutorial

## Overview

Tooliva provides two watermark removal modes:

- Fast mode: works locally out of the box and does not require any AI files.
- AI enhancement mode: requires a local AI runtime package and the `big-lama.pt` model, but delivers better results on complex backgrounds and more natural-looking repairs.

All files stay on the local device. Nothing is uploaded to a server during runtime import, model import, or processing.

## What You Need

Prepare these two files before you start:

1. `ai-runtime.7z` or a compatible legacy `ai-runtime.zip`
2. `big-lama.pt`

If you are packaging the runtime yourself, see [manual-package.md](/F:/Vibe%20Coding/Tools/docs/ai-runtime/manual-package.md).

## System Requirements

Before installing the AI runtime, make sure the device meets these baseline requirements:

- Windows 10/11 64-bit
- At least 8 GB free RAM
- At least 8 GB free disk space

## Install the AI Runtime

1. Open Tooliva.
2. Go to `Settings`.
3. Find the `AI enhancement` section.
4. Click `Install AI enhancement runtime` if the runtime is not installed yet.
5. Select your local `ai-runtime.7z` or `ai-runtime.zip` package.
6. Wait for extraction and installation to finish.

After a successful import, the runtime status should change to installed.

## Import the LaMA Model

1. Stay on the `Settings` page.
2. In the `AI enhancement` section, find the model area.
3. Click `Import LaMA model`.
4. Select the local `big-lama.pt` file.
5. Wait for the import to complete.

After the import finishes, the model status should show that the LaMA model is ready.

## Start Using AI Enhancement Mode

1. Open the image watermark removal or video watermark removal tool.
2. In `Processing mode`, switch from `Fast mode` to `AI enhancement mode`.
3. Select the file you want to process.
4. Mark the watermark area as needed.
5. Start the task and wait for the repair result.

Recommended usage:

- Use fast mode for plain backgrounds, corner watermarks, and small watermark areas.
- Use AI enhancement mode for complex textures, busy scenes, and cases where you want smoother repair results.

## Storage Location

By default, Tooliva stores imported AI files under the current app install directory.

Runtime data is stored under:

```text
<install-dir>/ToolivaAI/runtime/
```

Model data is stored under:

```text
<install-dir>/ToolivaAI/models/
```

You can also switch both locations to custom writable folders from `Settings`.

## Replace the Runtime or Model

If you need to update or replace a file later:

- Use `Replace` in the runtime area to remove the current runtime and import a new package.
- Use `Replace` in the model area to remove the current model and import another `big-lama.pt` file.

Because replacement removes the current local copy first, make sure you have the correct new file ready before continuing.

## Troubleshooting

### Runtime package cannot be imported

Check the following:

- The selected file is `ai-runtime.7z` or `ai-runtime.zip`.
- The package was built with the expected runtime layout.
- The target disk has enough free space.

### LaMA model not found

If Tooliva says the model is missing, import `big-lama.pt` again from the `Settings` page.

### AI mode is unavailable

AI enhancement mode requires both of these to be ready:

- The AI runtime is installed.
- The LaMA model has been imported.

If either item is missing, complete the import steps first.

## Notes for Release or Handoff

For user delivery, keep the desktop installer and AI files separate:

- Main app installer
- `ai-runtime.7z`
- `big-lama.pt`

This keeps the desktop installer smaller and lets users install AI enhancement only when they need it.
