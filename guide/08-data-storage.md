---
title: 第8章 Data・Storage
---

# 第8章 Data / Storage: KV・R2・D1・Durable Objects・Queues・Hyperdrive

## 1. 学習目標

Cloudflare Developer Platformでは「DBはD1」と決め打ちしない。

データの性質によって最適なサービスが異なる。

---

## 2. まず選択表

<!-- visual:start -->
<!-- visual:end -->

| 製品 | データ型 | 整合性/特徴 | 得意 |
|---|---|---|---|
| KV | Key-Value | Eventually consistent | read-heavy config/cache |
| R2 | Object | Strong consistency | images/files/backups |
| D1 | SQL/SQLite | relational DB | application data |
| Durable Objects | state + compute | strongly consistent per object | coordination/realtime |
| Queues | messages | at-least-once | async jobs |
| Hyperdrive | external DB accelerator | pooling/cache | PostgreSQL/MySQL接続 |

---

# Part A: Workers KV

## 3. KVのアーキテクチャ

KVはglobal low-latency key-value storeだが、すべてのCloudflare Edgeへ常時full replicationしているわけではない。

データはcentral storesへwriteされ、readされた場所へcacheされる。

```text
Write
 ↓
Central storage
 ↓
Regional / Edge cache on demand
```

### Consistency

KVはeventually consistent。

公式ドキュメントでは、別locationで以前の値がcacheされている場合、更新の可視化に60秒以上かかる場合がある。

### 向く用途

- Feature flags
- Config
- allowlist / denylist
- user preferences
- cache
- infrequently updated metadata

### 向かない用途

- Bank balance
- Inventory decrement
- unique sequential counter
- immediate read-after-write必須
- same keyへの高頻度write

---

# Part B: R2

## 4. R2とは

S3-compatible object storage。

主な特徴:

- Strong consistency
- Internet egress feeなし
- S3 API compatible
- Workers binding
- public/private bucket
- Standard / Infrequent Access storage classes

### 2026年時点の料金例

Standard:

- Storage: $0.015 / GB-month
- Class A: $4.50 / million
- Class B: $0.36 / million
- Internet Egress: Free

Free tier:

- 10 GB-month
- Class A 1M/month
- Class B 10M/month

料金は変更され得るので最新公式を確認する。

### Egress無料の意味

「何をしても無料」ではない。

費用要因:

- storage capacity
- Class A operations
- Class B operations
- Infrequent Access retrieval
- Images transformations等の周辺service

---

## 5. R2の用途

- User uploads
- CMS images
- Podcast/audio files
- Backup artifacts
- Data lake object
- Build assets
- ML dataset/model artifact

大量のobjectをpublic配信する場合、R2 + Worker + Cache/Imagesの構成が強い。

```text
Browser
 ↓
Cloudflare Cache / Images
 ↓ miss
Worker
 ↓ binding
R2
```

---

# Part C: D1

## 6. D1とは

SQLite compatibilityを持つserverless SQL database。

特徴:

- Workers binding
- SQL
- Prepared statements
- Time Travel
- Global Read Replication
- scale-to-zero billing model

### Billing model

D1は主にrows read / rows written / storageで課金される。

そのためindex設計はperformanceだけでなくcostにも直結する。

```sql
SELECT * FROM users WHERE email = ?;
```

`email` indexがなければ大量row scanになり得る。

Indexがあればrows readを減らせる。

---

## 7. D1 Prepared Statements

必ずparameter bindingを基本にする。

```ts
const user = await env.DB
  .prepare('SELECT id, name FROM users WHERE email = ?')
  .bind(email)
  .first();
```

String concatenationでSQLを作るのは避ける。

---

## 8. Read Replication

D1 read replicasはprimaryのcopyをglobal regionへ配置しread latencyを下げる。

Writeはprimaryへ行く。

replicaはasynchronous replicationなので、そのままではstale read問題がある。

D1 Sessions APIはbookmarkを用いてsequential consistencyを提供する。

### Read-your-own-writes例

```text
User writes profile
↓ primary
bookmark B100
↓
Next read with B100
↓ replica waits until >= B100
↓
returns updated profile
```

Global read replicationをONにしただけではなく、Sessions APIの使い方が重要。

---

# Part D: Durable Objects

## 9. Durable Objectsとは

Durable Objectはcompute + durable storageを一体化したstateful primitive。

各objectはglobally unique identityを持ち、同じobjectへrequestを集約できる。

特徴:

- strong consistency
- storage colocated with compute
- coordination
- single-threaded concurrency model
- millions of objectsをlogical partitionとして利用可能

### 向く用途

- Chat room
- Collaborative document
- WebSocket room
- Rate limiter state
- Session coordinator
- Game room
- Leader/lock-like coordination

### D1との違い

D1はrelational data queryが中心。

Durable Objectsは「特定key/objectへ世界中からrequestを集め、順序/coordinationを持って処理する」ことが強い。

---

# Part E: Queues

## 10. Queues

非同期message processing。

```text
HTTP request
 ↓
Producer Worker
 ↓ enqueue
Queue
 ↓
Consumer Worker
 ↓
Email / DB / external API
```

### Delivery guarantee

Queuesはdefaultでat-least-once delivery。

つまりmessageは失われにくい代わりに、稀にduplicate deliveryされる可能性がある。

Consumerはidempotentにする。

### Idempotency

```ts
message.id = crypto.randomUUID();
```

DB insertやpayment/email APIでidempotency keyとして使う。

### Retry / DLQ

Consumer failure時はretryされる。一定retry超過後にDead Letter Queueへ送る構成が可能。

---

# Part F: Hyperdrive

## 11. Hyperdrive

既存PostgreSQL/MySQL等へWorkersから接続する際のlatency/connection問題を緩和する。

主な機能:

- Edge側connection setup短縮
- Origin DB近くのconnection pool
- Read query cache

### なぜ必要か

Global Workerからsingle-region DBへ直接接続すると、

- TCP handshake
- TLS
- DB auth
- Query RTT

が距離の影響を受ける。

Hyperdriveはconnection poolingでこれを減らす。

### Cache注意

Hyperdrive read query cacheはwrite時に自動invalidateされない。read-after-writeが必要な処理はcache disabled configuration等を使う設計が必要。

---

## 12. 選定フロー

<!-- visual:start -->
{% include archify-diagram.html src="/assets/diagrams/08_data_decision_flow.html" title="Data製品の選定フロー" summary="データ形式だけでなく、読み書き頻度・整合性・同期/非同期・既存DB接続の有無から選ぶ。" %}
<!-- visual:end -->

```text
File/blob?
  -> R2

Simple key-value, read-heavy?
  -> KV

Relational SQL?
  -> D1

Existing Postgres/MySQLを維持?
  -> Hyperdrive

Per-room/user/entity coordination?
  -> Durable Objects

Background processing?
  -> Queues
```

一つだけを選ぶ必要はない。

例: SaaS app

```text
D1: users / billing metadata
R2: uploaded files
KV: feature flags
DO: live collaboration room
Queues: email/webhook jobs
```

---

# ハンズオン8-A: D1 CRUD

## Step 1 DB作成

```bash
npx wrangler d1 create cf-learning-db
```

出力されたbinding設定を `wrangler.jsonc` へ追加する。

## Step 2 schema

`schema.sql`

```sql
CREATE TABLE notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notes_created_at ON notes(created_at);
```

## Step 3 Migration / execute

WranglerのD1 commandsでlocal/remoteを明確に分けて実行する。

## Step 4 Worker

```ts
interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/api/notes') {
      const result = await env.DB
        .prepare('SELECT id, title, body, created_at FROM notes ORDER BY id DESC LIMIT 100')
        .all();
      return Response.json(result.results);
    }

    if (request.method === 'POST' && url.pathname === '/api/notes') {
      const input = await request.json<{ title: string; body: string }>();
      const result = await env.DB
        .prepare('INSERT INTO notes (title, body) VALUES (?, ?) RETURNING id')
        .bind(input.title, input.body)
        .first();
      return Response.json(result, { status: 201 });
    }

    return new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
```

---

# ハンズオン8-B: R2 Binding

## Bucket作成

```bash
npx wrangler r2 bucket create cf-learning-assets
```

binding例:

```jsonc
{
  "r2_buckets": [
    {
      "binding": "ASSETS_BUCKET",
      "bucket_name": "cf-learning-assets"
    }
  ]
}
```

Worker:

```ts
const object = await env.ASSETS_BUCKET.get('hello.txt');
if (!object) return new Response('Not Found', { status: 404 });
return new Response(object.body);
```

Public upload endpointを作る場合はauthentication、content type validation、size limits、malware scanning方針を設計する。

---

# ハンズオン8-C: Queue設計

Producer:

```ts
await env.EMAIL_QUEUE.send({
  id: crypto.randomUUID(),
  type: 'welcome-email',
  userId,
});
```

Consumer:

```ts
export default {
  async queue(batch: MessageBatch<EmailJob>, env: Env) {
    for (const message of batch.messages) {
      await processEmailIdempotently(message.body);
      message.ack();
    }
  },
};
```

重複実行を前提に設計する。

---

## 13. Cost/Performanceの設計ポイント

### KV

Same key high-frequency writeを避ける。

### R2

Object size、operation count、cache hit ratioを見る。

### D1

Rows readをmetricsで見る。Indexでscanを減らす。

### Queues

Batchはconsumer invocation削減に役立つが、message単位operation課金は別。

### Hyperdrive

Cache freshnessとconnection pool sizeをDB特性に合わせる。

---

## 14. よくある誤り

- KVをstrong consistency DBとして使う
- R2のEgress無料を総額無料と誤解する
- D1でindexを張らずfull scanする
- Queue consumerをnon-idempotentにする
- Durable Objectを単なるkey-value DB扱いする
- Hyperdrive cacheでread-after-write問題を無視する

---

## 理解チェック

- KVが向かないtransaction例を説明できるか。
- R2の費用要因を挙げられるか。
- D1 indexがcostへ影響する理由を説明できるか。
- Durable Objectsがrealtime coordinationに向く理由は何か。
- At-least-once deliveryで必要なアプリ設計は何か。
- HyperdriveがDB接続latencyを減らす仕組みを説明できるか。

---

## 公式ドキュメント

- KV architecture: https://developers.cloudflare.com/kv/concepts/how-kv-works/
- R2: https://developers.cloudflare.com/r2/
- R2 architecture: https://developers.cloudflare.com/r2/how-r2-works/
- R2 pricing: https://developers.cloudflare.com/r2/pricing/
- D1: https://developers.cloudflare.com/d1/
- D1 Workers API: https://developers.cloudflare.com/d1/worker-api/
- D1 read replication: https://developers.cloudflare.com/d1/best-practices/read-replication/
- Durable Objects: https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/
- Queues delivery guarantees: https://developers.cloudflare.com/queues/reference/delivery-guarantees/
- Hyperdrive: https://developers.cloudflare.com/hyperdrive/concepts/how-hyperdrive-works/
