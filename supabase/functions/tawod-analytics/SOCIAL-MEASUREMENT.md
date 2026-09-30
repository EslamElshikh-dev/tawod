# Social measurement contract

The dashboard measures TikTok, Instagram, Facebook and X website sessions immediately. Native account reach, views, interactions and follower snapshots require reports from authorized accounts. The public dashboard never has provider credentials and never claims an OAuth connection from opening an authorization link.

## Evidence and scope

- The shared attribution function classifies exact UTM aliases, exact paid media names and domain-bound referrers. A social UTM plus Google click identifier is an explicit attribution conflict. `unpaid` is not a paid medium; `chatgpt.com` is not `t.co`.
- Fresh campaign entries start separate website sessions. Direct sessions after expiry do not inherit historical Google click IDs. A contact after idle expiry includes a page event for its new session.
- Website summary, source, device and daily totals use the same session cohort. Daily buckets use the session's first page timestamp in Riyadh. Native reports have their own date range and time zone, always visible separately.
- Social website analysis receives the exact website window start/end. Native snapshots are never summed across accounts, overlapping scopes, dates or platforms. A blank metric remains unavailable. A numeric zero remains zero.
- Qualified opportunities are current reviewed outcomes linked to the actual referral events of website sessions. Website clicks alone do not establish a conversation, customer, revenue or ad ROAS.

## Import / server delivery

Admin CSV import uses `social_reports_import` with a signed admin token and an allowed admin origin. The CSV template and preview are available under **السوشيال ميديا → استيراد تقرير أداء الحساب**. It is a normalized account-period template, not an automatic parser for every platform's changing exports. Reports can be corrected by importing a newer extraction for the same account/scope/period.

Trusted source adapters can use `social_reports_sync`. Provision a separate private `social_media` sync key in `tawod_sync_keys` (SHA-256 hash only, enabled), keep the raw value in the server secret store as `TAWOD_SOCIAL_SYNC_KEY`, and run `node scripts/social-reports-sync.mjs reports.json`. No key is provisioned or schedule enabled by this change. A source adapter and account authorization are required before automatic native reports can arrive.

Body: `{"mode":"social_reports_sync","syncKey":"<server secret>","rows":[...]}`. Both entry points validate the entire batch before a single atomic database import. Duplicate records in a batch are rejected; older extractions cannot overwrite newer reports. Maximum 200 rows / transport file 1 MB. Provider access keys are never accepted as report fields.

Each row:

| Field | Contract |
|---|---|
| platform | `tiktok`, `instagram`, `facebook`, `x` |
| account_id / account_name | Actual authorized account identifier / display name |
| period_start / period_end | Inclusive ISO dates `YYYY-MM-DD`, real range, at most 366 days, no future end |
| time_zone | Source's actual IANA report zone, e.g. `Asia/Riyadh` |
| scope | `organic`, `paid`, or `combined`; avoid adding overlapping scopes |
| source_name | Actual platform/report/connector provenance |
| observed_at | Extraction timestamp in ISO format with `Z` or an explicit offset |
| aggregation | Must be `account_period`; daily sums and lifetime post counters are rejected |
| reach / views / impressions / interactions / profile_visits / link_clicks | Nullable, safe nonnegative integer account totals as supplied for that period |
| followers_start / followers_end | Nullable account snapshots at the corresponding period boundaries |
| spend / currency | Optional nonnegative amount with a three-letter uppercase currency; no currency blending |
| metric_definitions | Optional source definitions for the supplied metrics (JSON API only) |

`input_kind` is set by the authenticated route (`platform_export` for admin import, `connector` for server delivery), not trusted from the client. Stored reports are protected by RLS and explicit service-role grants; anon/authenticated cannot read, write or call the report RPCs.

The dashboard's Windsor buttons provide current discovered authorization URLs. After authorization, discover that connector's actual accounts and fields before implementing its source adapter. Do not route other businesses' connected advertising accounts into Tawod.

## Verification

`npm run test:social-attribution` verifies tracker session continuity, source changes, Google attribution cleanup, idle-contact context and preview exclusion without network writes. `npm run test:sales-workspace` runs the actual Edge handler with isolated PostgreSQL, including report import/auth, atomicity, update order, attribution parity, >15 sources, midnight reconciliation, true new/repeat visitor distinctions and matched website/social time bounds.
