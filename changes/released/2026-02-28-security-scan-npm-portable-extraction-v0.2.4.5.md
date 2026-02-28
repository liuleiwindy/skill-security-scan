# Change Record: npm Portable Extraction Patch v0.2.4.5

## 0. Links

- Spec: `/Users/lei_liu/Documents/Code/skill-store/skill-security-scan/specs/released/2026-02-28-security-scan-npm-portable-extraction-v0.2.4.5.md`

## 1. Change Summary

1. npm tarball extraction no longer shells out to system `tar`.
2. Added in-process tar parsing path to improve runtime portability on serverless.
3. Updated npm intake tests to use generated tgz fixtures instead of mocked tar subprocess.

## 2. Files

1. `/Users/lei_liu/Documents/Code/skill-store/skill-security-scan/lib/scan/npm.ts`
2. `/Users/lei_liu/Documents/Code/skill-store/skill-security-scan/tests/npm.test.ts`

## 3. Verification

1. `npm test`
2. `npm run build`
