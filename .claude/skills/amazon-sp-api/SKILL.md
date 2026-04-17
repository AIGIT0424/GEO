---
name: amazon-sp-api
description: Use when writing or debugging code that calls Amazon Selling Partner API. Covers LWA auth, request signing, rate limits, pagination, and report polling.
---

# Amazon SP-API Integration

## Auth Flow

1. Exchange LWA refresh token for access token at `https://api.amazon.com/auth/o2/token`.
2. Cache access token in memory for ~55 minutes (tokens expire at 60).
3. On 403, refresh once before giving up.
4. All requests set `x-amz-access-token: <token>`.

## Request Conventions

- Base URL: `https://sellingpartnerapi-<region>.amazon.com`
  - NA: `sellingpartnerapi-na.amazon.com`
  - EU: `sellingpartnerapi-eu.amazon.com`
  - FE: `sellingpartnerapi-fe.amazon.com`
- Always pass `marketplaceIds` query param.
- Use `httpx.AsyncClient` with a shared client per logical unit of work.

## Rate Limits

- Every endpoint documents `Rate (requests per second)` and `Burst`. See `app/services/amazon/sp_api.py` and add `@retry` with exponential backoff.
- On 429, respect `x-amzn-RateLimit-Limit` header and back off for at least 1/limit seconds.

## Reports

Reports are asynchronous. Pattern:
1. `POST /reports/2021-06-30/reports` with `reportType` and `marketplaceIds`.
2. Poll `GET /reports/2021-06-30/reports/{reportId}` until `processingStatus == DONE`.
3. `GET /reports/2021-06-30/documents/{reportDocumentId}` to get a pre-signed URL.
4. Download and (usually) gunzip.

**Always run reports in Celery**, never in an HTTP handler.

## Pagination

Catalog and orders endpoints return `pagination.nextToken`. Loop until `nextToken` is absent. Cap at a max-page limit (e.g. 20) in interactive flows.

## Common marketplace IDs

| Region | Marketplace | ID |
| --- | --- | --- |
| NA | US | ATVPDKIKX0DER |
| NA | CA | A2EUQ1WTGCTBG2 |
| NA | MX | A1AM78C64UM0Y8 |
| EU | UK | A1F83G8C2ARO7P |
| EU | DE | A1PA6795UKMFR9 |
| EU | FR | A13V1IB3VIYZZH |
| FE | JP | A1VC38T7YXB528 |
| FE | AU | A39IBJ37TRP1C6 |
