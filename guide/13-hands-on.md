---
title: 第13章 総合ハンズオン
---

# 第13章 総合ハンズオン: 小規模WebサービスをCloudflareで本番設計する

## 1. ゴール

ここまでの内容を一つのシステムへ統合する。

作るもの:

```text
public.example.com  公開Frontend
api.example.com     Workers API
admin.example.com   Access保護管理画面
R2                   uploads
D1                   application DB
Queues               background job
WAF / Rate Limit     public protection
Observability        logs/traces
```

この演習は「全部Cloudflareを使うのが正解」という意味ではなく、各productがどうつながるか体験するためのreference architecture。

---

## 2. Architecture

<!-- visual:start -->
<!-- visual:end -->

---

## 3. Phase 0: Repository

<!-- visual:start -->
<!-- visual:end -->

例:

```text
cf-platform-lab/
  src/
    index.ts
  web/
  migrations/
  tests/
  wrangler.jsonc
  package.json
  README.md
```

Gitへ入れるもの:

- source
- wrangler config（secretなし）
- migration
- test
- architecture docs

入れないもの:

- API token
- production secret
- private key

---

## 4. Phase 1: DNS / TLS

### Checklist

- [ ] ZoneをCloudflareへ追加
- [ ] Existing DNS record差分確認
- [ ] Web recordsをProxied
- [ ] Mail recordsを適切にDNS only
- [ ] DNSSEC有効化
- [ ] `Full (strict)`
- [ ] HTTP→HTTPS
- [ ] Origin bypass pathを確認

### Verification

```bash
dig NS example.com +short
dig A public.example.com +short
curl -I https://public.example.com
```

---

## 5. Phase 2: Worker + Static Assets

```bash
npm create cloudflare@latest -- cf-platform-lab --framework=react
cd cf-platform-lab
```

またはAstro等、要件に合わせる。

### Routing principle

```text
Static assets -> asset first
/api/* -> Worker first
```

### Production hostname

`workers.dev`だけで終わらせずCustom Domainを設定する。

---

## 6. Phase 3: D1

Schema:

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);
```

### API

```text
GET  /api/posts
POST /api/posts
GET  /api/posts/:id
```

### Security

- Prepared statements
- Authentication
- Authorization
- Input validation
- Request body limit

D1を使っただけでauthorizationが自動実装されるわけではない。

---

## 7. Phase 4: R2 Upload

### Design

```text
Browser
 -> API auth
 -> Worker
 -> validate metadata
 -> R2 put
```

Public direct uploadを許す場合、presigned URL等のpatternも検討する。

### Validation

- MIME type
- Extensionを信用しない
- Size
- Filename normalization
- Object key collision
- Malware policy
- PII policy

### Delivery

R2 objectを直接publicにするか、Worker経由にするか、Imagesを使うか判断する。

---

## 8. Phase 5: Queue

Post作成後にnotificationを非同期化する。

```text
POST /api/posts
 -> D1 insert
 -> enqueue notification
 -> return 201 quickly

Queue consumer
 -> email/webhook
```

### Idempotency

message idを保存し、duplicate deliveryでも同じnotificationを複数送らない設計にする。

---

## 9. Phase 6: WAF

### Baseline

- Managed Rules
- Custom rule for obvious unwanted paths if needed
- Rate limit on login/write endpoints
- Security analytics review

### Avoid

```text
Block all foreign countries
```

のようなbusiness requirementなしの広いrule。

---

## 10. Phase 7: Admin Access

`admin.example.com` をAccessで保護。

### Minimum

- Organization IdPまたはlabではOTP
- Allowed users/groups
- Session duration

### Better

- MFA
- device posture
- separate admin hostname
- audit logs

Origin/admin application自身のauthorizationも残す。

Accessだけでrole model全体を代替しない。

---

## 11. Phase 8: Cache

### Static

Hash assets:

```http
Cache-Control: public, max-age=31536000, immutable
```

### HTML

公開contentだけCache Ruleを検討。

### API

```text
GET public content -> cache candidate
POST/write -> no cache
user-specific -> bypass/private
```

### Verification

```bash
curl -I https://public.example.com/assets/app.hash.js
```

2回実行し `CF-Cache-Status`を観察。

---

## 12. Phase 9: Images

Upload original:

```text
R2/original/...
```

Delivery:

```text
Cloudflare Images transformations
```

Frontendではdisplay sizeへ合わせたwidthを指定する。

計測:

- original bytes
- delivered bytes
- LCP
- transformation count

---

## 13. Phase 10: Observability

### Enable

Workers observability。

### Structured fields

```json
{
  "level": "info",
  "event": "post_created",
  "requestId": "...",
  "postId": 123,
  "durationMs": 25
}
```

### Never log

- password
- session token
- authorization header
- API token
- unnecessary PII

---

## 14. Phase 11: API Token / CI

CI token:

- Account/resource scopeを最小化
- deploymentに必要なpermissionsだけ
- Secret storeへ保存

Cache purge token:

- Cache Purgeだけ
- 対象zoneだけ

一つの万能tokenを使い回さない。

---

## 15. Phase 12: Security Test

### Test cases

```text
HTTP -> HTTPS
Invalid admin user -> denied
Valid admin -> allowed
SQL injection-like payload -> no SQL concatenation
11 login attempts -> rate limit expected behavior
Oversized upload -> reject
Wrong MIME -> reject
Missing auth -> 401
Other user's post edit -> 403
```

Cloudflare WAF testとapplication auth testを分ける。

---

## 16. Phase 13: Performance Test

Collect:

```text
TTFB
LCP
Total transfer
Image bytes
CF-Cache-Status
Cache hit ratio
Worker CPU
D1 rows read
```

### Before/After

Cloudflare setting変更前後で同一条件計測。

一回のChrome reloadだけで判断しない。

---

## 17. Phase 14: Failure Test

意図的に:

- External APIをtimeoutさせる
- Queue consumerをfail
- D1 error
- R2 object not found
- Invalid Access session

を再現する。

確認:

- User response
- Log
- Retry
- Alert
- Data consistency

---

## 18. Phase 15: Cost Check

Dashboard metricsから:

- Worker requests/CPU
- D1 rows read/write
- R2 storage/A/B operations
- Images transformation
- Queue operation

を確認する。

「free tierだから見る必要なし」ではなく、scaleした時のcost driverを早期に把握する。

---

# 実務導入チェックリスト

## DNS

- [ ] DNS inventory
- [ ] MX/SPF/DKIM/DMARC確認
- [ ] Proxy status確認
- [ ] DNSSEC

## TLS

- [ ] Full (strict)
- [ ] Origin certificate expiry management
- [ ] HTTPS redirect

## Origin

- [ ] Direct access policy
- [ ] Tunnel/FW/AOPのいずれか
- [ ] Health check

## Cache

- [ ] Static TTL
- [ ] HTML policy
- [ ] User-specific bypass
- [ ] Purge workflow

## Security

- [ ] WAF managed rules
- [ ] Custom rules reviewed
- [ ] Rate limiting
- [ ] Bot policy
- [ ] Turnstile server validation if used

## Zero Trust

- [ ] Admin Access
- [ ] IdP/MFA
- [ ] Service account policy
- [ ] Tunnel HA

## Workers

- [ ] Custom Domain/Route
- [ ] Secret management
- [ ] compatibility date policy
- [ ] limits reviewed

## Data

- [ ] KV consistency understood
- [ ] D1 indexes
- [ ] R2 access policy
- [ ] Queue idempotency
- [ ] backup/export

## Observability

- [ ] Worker Logs
- [ ] structured logs
- [ ] CF-Ray capture
- [ ] origin logs correlation
- [ ] alert/SLO

## Operations

- [ ] API tokens least privilege
- [ ] IaC where appropriate
- [ ] change review
- [ ] rollback
- [ ] disaster recovery

## Cost

- [ ] plan selection documented
- [ ] usage budget
- [ ] cost driver metrics
- [ ] lock-in decision documented

---

# 最終理解テスト

次のケースを設計できれば基礎卒業。

## Case 1

WordPress siteが遅い。画像10MB、HTML TTFB 700ms。

どの順で改善するか。

期待思考:

```text
Measure -> image optimize -> static cache -> HTML cache feasibility -> origin profiling -> Tiered/Argo if needed
```

## Case 2

Admin pageをVPNなしで社外から使いたい。

```text
Tunnel + Access + IdP/MFA + origin inbound closure
```

## Case 3

Global WorkerからTokyo PostgreSQLが遅い。

```text
Hyperdrive / Smart Placement / DB architecture evaluation
```

## Case 4

Feature flagを世界配信したい。変更反映は1分程度許容。

```text
KV candidate
```

## Case 5

Realtime chat roomで同じroomのuser間stateを順序制御したい。

```text
Durable Objects candidate
```

## Case 6

画像1TB/月をS3から配信してegress costが高い。

```text
R2 migration estimate + operations + Images + cache + migration cost
```

---

## 卒業後の専門トラック

### Security

- API Shield
- mTLS
- Bot Management
- DLP
- CASB
- Browser Isolation

### Network

- Magic Transit
- Spectrum
- Network Interconnect
- advanced Load Balancing

### Developer Platform

- Workflows
- Workers for Platforms
- Service Bindings
- Smart Placement
- Containers

### AI

- Workers AI
- AI Gateway
- Vectorize

### SaaS

- Cloudflare for SaaS
- Custom Hostnames
- Workers for Platforms

---

## 結論

Cloudflareの専門性は製品名を多く知ることではなく、

```text
Request enters where?
Which phase handles it?
Where is state stored?
What consistency is required?
What can bypass security?
What fails when this component is down?
What is the cost driver?
How do we observe and rollback it?
```

を一つのarchitectureとして答えられること。

この観点が身につけば、Cloudflareの新製品が増えても「どの層の何を解決する製品か」として理解できる。
