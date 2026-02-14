# QR Code Verification Guide

## QR Code Contract

According to the spec:
- Poster page URL for sharing: `/scan/poster/[id]`
- Poster QR target: `/scan/report/[id]` (fixed contract)
- Do not route QR to poster page to avoid share-loop dead end.

## Verification Steps

### Step 1: Use Test Fixtures

Run these commands to verify QR codes:

```bash
# Test with fixture IDs
npx tsx tests/fixtures/verify-qr.ts scan_fixture_v0240_b69
npx tsx tests/fixtures/verify-qr.ts scan_fixture_v0240_a90
npx tsx tests/fixtures/verify-qr.ts scan_edge_d0
```

### Step 2: Manual Verification

1. Generate a poster for a test scan ID
2. Use a QR code scanner to scan the QR in the poster
3. Confirm the decoded URL is `/scan/report/[id]`
4. Do NOT scan `/scan/poster/[id]`

### Step 3: Check QR Generation Logic

In `lib/poster/render-options.ts` or V0.2.4.1 implementation:
- Verify QR URL is hardcoded or generated as `/scan/report/${id}`
- NOT `/scan/poster/${id}`

## Expected Results

- ✅ QR code decodes to `/scan/report/scan_fixture_v0240_b69`
- ✅ QR code does NOT decode to `/scan/poster/scan_fixture_v0240_b69`
- ✅ All test fixtures pass verification

## Documentation

Once verified, document the results here:
- [ ] scan_fixture_v0240_b69 - QR verified
- [ ] scan_fixture_v0240_a90 - QR verified
- [ ] scan_edge_d0 - QR verified

Last verified: [DATE]
Verified by: [NAME]
