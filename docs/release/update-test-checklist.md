# Windows Updater Test Checklist

Use this checklist before each desktop release.

## A. Auto Check and Throttling

- [ ] A1. With `autoCheckUpdates=true`, app startup triggers automatic check.
- [ ] A2. With `autoCheckUpdates=false`, app startup does not trigger automatic check.
- [ ] A3. When update is available, auto-check prompt appears once.
- [ ] A4. Re-launch app on same day: no second auto prompt appears.
- [ ] A5. Simulate next day: auto prompt appears again.

## B. Manual Check

- [ ] B1. Settings "Check Updates" always triggers a check.
- [ ] B2. Manual check still shows result even after auto prompt was shown same day.
- [ ] B3. Up-to-date state message is correct.
- [ ] B4. Network failure state message is correct and recoverable.

## C. Install and Restart

- [ ] C1. Available update can be confirmed and starts in-app install.
- [ ] C2. Download/install/restart stages are visible to user.
- [ ] C3. App restarts into expected new version after successful install.
- [ ] C4. Installation failure shows retry path.

## D. Regression and Safety

- [ ] D1. Core tools still work after upgrade (image compress / video-to-gif / gif compress).
- [ ] D2. Existing user settings remain after update.
- [ ] D3. Update flow does not block normal app startup when updater service is unavailable.

## E. Rollback Drill

- [ ] E1. Update metadata can be pointed back to previous stable version.
- [ ] E2. Client no longer receives faulty release after rollback.
- [ ] E3. Previous stable installer remains downloadable and installable.

## Test Record

- Build version tested:
- Previous version upgraded from:
- Test environment:
- Tester:
- Date:
- Result summary:
