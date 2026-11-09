# Stooq CSV validation regression

Run from the repository root with Node.js 22.18+ (native TypeScript stripping):

    node --test server/tests/stooq.test.mjs

No installation, API key, server, port or live data is required. The tests import
only the Stooq provider; its Yahoo import is type-only. Every fetch is replaced
with an in-memory CSV response and restored after each test. No database,
portfolio route, application entrypoint or production file is loaded.

Missing/non-finite close values reject quotes. Missing/non-finite OHLC values
skip historical rows. Optional quote fields become null, historical volume
falls back to zero, and explicit finite zero values remain zero. CRLF and HTTP
error behavior are covered. Fixtures are synthetic parser inputs, not recorded
market observations.

This test is a separate dependency-free regression command, not part of the
existing Vitest test discovery. It does not establish live-provider or UI health.
