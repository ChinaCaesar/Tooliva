# Tooliva Updater Metadata Spec (Windows)

## Purpose

Define a stable metadata contract for desktop client update checks and Tauri updater installation flow.

## Version Rules

- Use semantic version format: `MAJOR.MINOR.PATCH`.
- New release version MUST be strictly greater than currently published stable version.
- `channel` is required and currently supports: `stable`, `beta`.

## Required Fields

The release check endpoint MUST return (directly or inside `data`):

```json
{
  "available": true,
  "latestVersion": "0.1.1",
  "publishedAt": "2026-05-28T10:00:00Z",
  "notes": "Bug fixes and updater improvements",
  "downloadUrl": "https://cdn.example.com/desktop/Tooliva_0.1.1_x64-setup.exe",
  "channel": "stable",
  "platform": "windows"
}
```

## Compatibility Aliases

For backward compatibility, client may read aliases:

- `latest_version`, `version`, `tag`, `release_version` -> `latestVersion`
- `published_at`, `releaseDate`, `release_date`, `date` -> `publishedAt`
- `summary`, `description`, `content` -> `notes`
- `download_url`, `url`, `link` -> `downloadUrl`

## Validation Rules

- `latestVersion`: non-empty semantic version string.
- `downloadUrl`: required when `available=true`, must be HTTPS in production.
- `publishedAt`: ISO 8601 recommended.
- `notes`: optional but strongly recommended.
- `platform`: must match requesting client (`windows`).

## Release Pipeline Checks

Before publishing metadata:

1. Validate schema and required fields.
2. Validate `latestVersion` is greater than previous release.
3. Validate download URL returns HTTP 200 and expected file.
4. Validate channel/platform mapping.
5. Keep previous stable metadata for rollback.

## Rollback Policy

If current release is faulty:

1. Point metadata back to previous stable version.
2. Keep faulty installer for diagnostics, but stop surfacing it in metadata.
3. Re-run metadata validation before re-publish.
