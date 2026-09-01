---
title: 第12章 料金・プラン
---

# 第12章 料金・プラン・設計判断

## 1. 学習目標

Cloudflareは「無料でかなり使える」一方、製品ごとに課金軸が違う。

専門家として重要なのは価格表暗記ではなく、**何がcost driverかをarchitectureから説明できること**。

本章の価格は2026-08-31時点の公式情報を基準にする。契約前には必ず再確認する。

---

## 2. Network/CDN plan

<!-- visual:start -->
<!-- visual:end -->

Cloudflare公式pricing pageでは2026-08-31時点で概ね:

| Plan | 月額表示 |
|---|---:|
| Free | $0 |
| Pro | $20/月 annual billing または $25 monthly |
| Business | $200/月 annual billing または $250 monthly |
| Contract | Custom |

※税・契約条件・地域等を除く。最新pricing pageを参照。

### Freeでも含まれるcore

Pricing page上では:

- DNS
- CDN
- Unmetered DDoS Protection
- Universal SSL
- WAF

等がFreeから示されている。

ただしadvanced rule count、bot機能、support、SLA、詳細security機能はplan差がある。

---

## 3. Zero Trust料金

2026-08-31のpricing pageでは:

| Tier | 概要 |
|---|---|
| Free | 50 usersまで |
| Pay-as-you-go | $7/user/month |
| Contract | custom |

小規模teamではAccess/Tunnelを試しやすい。

しかし「50 users以下なら全Zero Trust機能がenterprise同等」という意味ではない。Log retention、advanced security、support等に差がある。

---

## 4. Workersのcost model

Official pricing pageではPaidのusage単価として:

- Requests: $0.30 / million
- CPU time: $0.02 / million CPU ms

Free:

- 100,000 requests/day
- 10ms CPU/request等のlimit

が示されている。

### Cost driver

```text
Total cost ≈ request count + CPU usage + attached services
```

External fetch待ち時間とCPU timeを混同しない。

### Cost optimization

- Static assetsをWorker codeより先にserve
- unnecessary Worker invocationを減らす
- heavy JSON transformを避ける
- caching
- async processingへQueuesを利用

---

## 5. R2料金

2026-08-07時点の公式R2 pricing:

### Standard

| Metric | Price |
|---|---:|
| Storage | $0.015 / GB-month |
| Class A | $4.50 / million |
| Class B | $0.36 / million |
| Egress | Free |

### Free included

- 10 GB-month
- 1M Class A/month
- 10M Class B/month

### 設計上の意味

Video/image/file配信でegressが大きいarchitectureではAWS S3等とのcost差が出やすい。

一方、small filesを極端に多く操作するworkloadではoperation costを見なければならない。

---

## 6. D1料金

2026年公式pricing:

### Workers Free

- Rows read: 5M/day
- Rows written: 100k/day
- Storage: 5GB total

### Workers Paid included + overage

- First 25B rows read/month included, then $0.001 / million rows
- First 50M rows written/month included, then $1.00 / million rows
- First 5GB included, then $0.75 / GB-month

### Cost architecture

Query countではなく**rows scanned/written**が重要。

```sql
SELECT * FROM logs WHERE user_id = ?;
```

indexなし:

```text
large scan -> higher rows read + slower
```

indexあり:

```text
small scan -> cheaper + faster
```

Performance tuningとcost tuningが同じ方向を向きやすい。

---

## 7. Queues料金

2026年公式:

- Free: 10,000 operations/day included
- Paid: 1M operations/month included + $0.40/million operations

Operationはmessage size 64KB単位、write/read/delete等で数える。

### 注意

「batch 100 messagesなら1 operation」ではない。

Batchingはconsumer invocationを減らしてもqueue operationsはmessage単位でcountされる。

---

## 8. Images料金

2026-07-08の公式pricing:

### Free

- 5,000 unique transformations/month

### Paid

- First 5,000 included
- $0.50 / 1,000 unique transformations/month
- Images hosted storage: $5 / 100,000 stored/month
- Delivery: $1 / 100,000 delivered/month

R2をstorageに使いImages transformationだけ使う構成ではR2 + Images両方の料金を見る。

---

## 9. 「Egress無料」をどうbusiness valueへ変えるか

Egress costが大きいservice:

- image-heavy media
- audio/podcast
- software download
- model/dataset distribution
- UGC files

ではR2がfinancial advantageを持ちやすい。

ただしmigration costもある。

### 評価式

```text
Cloudflare monthly savings
= existing egress cost
- R2 storage/operations
- migration/ops cost
- added Cloudflare services
```

「AWSより安い」という抽象論ではなく、実トラフィック量で計算する。

---

## 10. Free / Pro / Businessの選び方

### Free

向く:

- personal
- prototype
- small non-critical site
- learning

### Pro

向く:

- professional website
- stronger optimization/security feature requirement
- business-criticalまでは行かないsite

### Business

向く:

- online business
- SLA/support/advanced capabilityが必要
- downtime costが高い

### Contract/Enterprise

向く:

- mission-critical
- advanced WAF/Bot/API security
- enterprise support
- account-level controls
- compliance requirements

Feature単体でなく「停止した時のbusiness loss」を含めてplanを選ぶ。

---

## 11. Total Cost of Ownership

<!-- visual:start -->
<!-- visual:end -->

Cloudflare導入の価値はbillだけでなく人件費を含む。

```text
TCO = Cloudflare bill
    + Origin/cloud bill
    + Engineering operation hours
    + Security operation hours
    + Incident cost
    + Migration cost
```

### 例

VPN appliance 2台 + certificate更新 + firewall rule + remote access supportをAccess/Tunnelへ寄せて運用工数が減るなら、Cloudflare licenseが増えてもTCOが下がることがある。

---

## 12. Lock-in評価

Cloudflareへ深く寄せるほどdevelopment velocityは上がるが、移行costも上がる。

### Low lock-in

- DNS
- CDN
- WAF
- R2 S3 API

### Medium

- Workers Web APIs
- D1 SQLite SQL
- Hyperdrive

### Highになりやすい

- Durable Objects architecture
- Cloudflare-specific bindings across entire domain model
- Access-centric internal architecture
- complex Ruleset dependency

### 対策

- Domain logicをplatform adapterから分離
- Standard APIsを優先
- data export pathを持つ
- config as code
- migration runbook

---

## 13. Architecture Decision Matrix

| 要件 | 推奨候補 | 理由 |
|---|---|---|
| WordPressを高速化 | DNS/CDN/Cache/WAF | Originを残して前段改善 |
| SPA + API | Workers + Static Assets | single deployment |
| Content site | Astro on Workers | static-first |
| Large media | R2 + Images/CDN | egress advantage |
| Small relational app | D1 | serverless SQL |
| Existing PostgreSQL | Workers + Hyperdrive | DB migration不要 |
| Internal admin | Tunnel + Access | inbound exposure削減 |
| Realtime room | Durable Objects | coordination |
| Email/background job | Queues | async |
| Multi-origin failover | Load Balancing | health-based routing |

---

## 14. KPIへの接続

### Performance

- p75/p95 TTFB
- LCP
- cache hit ratio

### Reliability

- Availability
- 5xx rate
- failover time

### Security

- WAF blocked attack
- false positive rate
- compromised account incidents

### Cost

- Origin egress
- Worker CPU/request
- D1 rows read
- R2 operations

### Business

- CVR
- bounce rate
- support cost
- incident downtime cost

Cloudflare導入の説明を「速くなります」で終わらせず、business outcomeへつなぐ。

---

# ハンズオン12: 月額試算

想定:

```text
Monthly page views: 1,000,000
Static asset transfer: 2 TB
R2 storage: 100 GB
R2 reads: 5,000,000
Worker requests: 2,000,000
D1 rows read: 500,000,000
```

手順:

1. Cloudflare official pricingでcurrent unit price取得
2. Included usageを引く
3. R2 storage/operations計算
4. Worker request/CPU estimate
5. D1 rows read/write estimate
6. Existing cloud egress costと比較
7. Engineering migration hoursを追加

### 必須: Rangeで出す

CPU time等は事前に不明なので:

```text
Best / Expected / Worst
```

の3scenarioで見積もる。

---

## 15. よくある誤り

- Egress free = service全体free
- Free planでbusiness-critical productionを無条件推奨
- Worker request数だけ見てCPUを無視
- D1 query countだけ見てrows readを無視
- Image transformation数を無視
- SaaS billだけ比較して運用工数を無視
- Lock-inを「悪」とだけ評価する

---

## 理解チェック

- R2のcost driverを説明できるか。
- D1でindexがcostを下げる理由は何か。
- Zero TrustのFree tierとEnterpriseを同一視できない理由は何か。
- Cloudflare lock-inを技術的に分解できるか。
- Cloudflare導入効果をbusiness KPIへつなげられるか。

---

## 公式ドキュメント

- Cloudflare plans: https://www.cloudflare.com/plans/
- Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- R2 pricing: https://developers.cloudflare.com/r2/pricing/
- D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Queues pricing: https://developers.cloudflare.com/queues/platform/pricing/
- Images pricing: https://developers.cloudflare.com/images/pricing/
