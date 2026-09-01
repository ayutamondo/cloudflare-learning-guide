---
title: 第3章 CDN・キャッシュ・パフォーマンス
---

# 第3章 CDN・Cache・パフォーマンス設計

## 1. 学習目標

キャッシュはCloudflareで最も効果が大きい一方、事故も起こしやすい領域。この章では「キャッシュをONにする」ではなく、HTTPキャッシュモデルとCloudflare Cacheを分けて理解する。

到達目標:

- Browser CacheとEdge Cacheを区別できる
- `Cache-Control` とCloudflare Cache Rulesの関係を説明できる
- `CF-Cache-Status` を使って原因調査できる
- HTMLを安全にキャッシュする条件を設計できる
- Tiered Cacheの目的を説明できる
- Imagesと通常Cacheの違いを理解する
- キャッシュ削除を運用フローへ組み込める

---

## 2. Cacheの基本モデル

<!-- visual:start -->
<!-- visual:end -->

キャッシュには最低でも2層ある。

```text
Browser Cache
    ↓ miss
Cloudflare Edge Cache
    ↓ miss
Origin
```

### Browser Cache

ユーザー端末内。`Cache-Control: max-age=` などの影響を受ける。

### Cloudflare Edge Cache

Cloudflare data center側。多数ユーザーで共有される。

この二つを混同すると、Cloudflareでpurgeしたのにブラウザに古いCSSが残る、といった現象を説明できない。

---

## 3. Cloudflareのデフォルトキャッシュ

Cloudflareは一般的な静的ファイルをcache対象にする。HTML等の動的コンテンツはデフォルトではcacheされない。

デフォルト挙動は、OriginのCache-Control、Set-Cookie、HTTP method、拡張子など複数要因で決まる。

代表的には次の場合、cacheされにくい。

```http
Cache-Control: private
Cache-Control: no-store
Cache-Control: no-cache
Cache-Control: max-age=0
Set-Cookie: ...
```

Cloudflareの現行ドキュメントではGET以外も通常cache対象外。

---

## 4. Cache-Controlを設計する

### 長期静的アセット

ハッシュ付きファイル名なら強くcacheできる。

```http
Cache-Control: public, max-age=31536000, immutable
```

例:

```text
/assets/app.8f31da9.js
/assets/logo.a21c923.webp
```

デプロイごとにURLが変わるため1年cacheしても更新事故が起こりにくい。

### HTML

HTMLは更新頻度、ログイン状態、Cookie、個別コンテンツを考慮する。

例:

```http
Cache-Control: public, max-age=60, s-maxage=600
```

一般論として共有cache向けTTLを `s-maxage` で分離する設計もある。ただしCloudflareでの実際の解釈は設定・プラン・Cache Rulesとの組み合わせを確認する。

### 個人情報ページ

```http
Cache-Control: private, no-store
```

共有cacheへ保存しないことが重要。

---

## 5. `CF-Cache-Status`

<!-- visual:start -->
<!-- visual:end -->

調査で最初に見るCloudflareヘッダーの一つ。

```bash
curl -I https://example.com/assets/app.js
```

代表的な状態:

- `HIT` — Edge cacheから返した
- `MISS` — cacheになくOrigin等から取得した
- `BYPASS` — 設定やOrigin header等によりcacheを迂回
- `DYNAMIC` — cache対象として扱っていない
- `EXPIRED` — stale/期限切れにより再取得が必要

状態の厳密な意味は公式ヘッダーリファレンスと現行挙動を確認する。

### `Age`

Cache HIT時にキャッシュされた経過秒数を把握する手がかりになる。

---

## 6. Cache Rules

旧Page RulesのCache Everything中心の設計より、現在はCache Rulesを利用する。

Cache Rulesでは条件に応じて次のような制御が可能。

- Cache eligibility
- Edge TTL
- Browser TTL
- Query string handling
- Cache keyの一部制御（プラン依存を含む）
- Status code TTL
- Origin Cache-Control尊重方針
- Cache bypass条件

### 典型ルール1: 静的アセットを長期cache

条件:

```text
URI Path starts with /assets/
```

動作:

```text
Eligible for cache
Edge TTL: long
Browser TTL: long
```

### 典型ルール2: 管理画面を絶対にcacheしない

```text
URI Path starts with /admin/
=> Bypass cache
```

### 典型ルール3: ログインCookieがある場合bypass

アプリのCookie名に合わせて条件を作る。

```text
Cookie contains session=
=> Bypass cache
```

Cookie条件を誤ると、ログインユーザーのHTMLが共有cacheされる重大事故につながり得る。

---

## 7. HTMLキャッシュの設計

HTMLをEdge Cacheへ載せるとTTFB改善とOrigin負荷削減効果が大きい。

ただし以下を先に分類する。

| コンテンツ | 推奨 |
|---|---|
| 完全公開記事 | Cache候補 |
| 商品一覧 | 更新頻度次第でCache候補 |
| 検索結果 | Query設計次第 |
| カート | 原則Bypass |
| マイページ | Bypass |
| 管理画面 | Bypass |
| API GET | データ性質次第 |
| API POST | Cacheしない |

### 安全な発想

「全部cacheして例外を除外」より、最初は「公開・不変性が高い領域だけ明示的にcache」する方が事故を抑えやすい。

---

## 8. Cache Key

Cloudflareはリクエストからcache keyを作り、同じkeyなら同じcached objectを返す。

Query Stringが異なると別cacheになる設計では、次のURLがそれぞれ別cacheになる。

```text
/image.jpg?w=100
/image.jpg?w=200
/image.jpg?w=300
```

逆に、tracking parameterまでcache keyへ入るとhit率を下げる。

```text
/article/1?utm_source=x
/article/1?utm_source=y
```

これらが同一contentなら、不要queryをcache keyから除外できる構成が有効。ただし利用可能なcustom cache key機能はプラン差があるため確認する。

---

## 9. Tiered Cache

通常のEdge Cacheだけでは、世界中の各EdgeでMISSした際にそれぞれOriginへ問い合わせが発生し得る。

Tiered CacheはCloudflareのcacheを階層化する。

```text
User
 ↓
Lower-tier Edge
 ↓ miss
Upper-tier Cache
 ↓ miss
Origin
```

これによりOriginへ問い合わせできる拠点を集約し、

- Origin request数削減
- Origin帯域削減
- Connection数削減
- Cache hit ratio向上

を狙う。

特にOriginが単一regionにあるグローバルサービスで効果を理解しやすい。

---

## 10. Argo Smart Routing

Argo Smart Routingはリアルタイムのネットワーク状況を使い、混雑などを避けてCloudflare network内のより効率的な経路を選ぶadd-on。

Cacheとは別物。

- Cache: Originへ行かない
- Argo: Originへ行く必要がある通信のネットワーク経路を改善する

動的APIやCache MISSが多いglobal serviceでは検討価値がある。

---

## 11. Cloudflare Images

Imagesは単にjpgをcacheする機能ではなく、画像の変換・最適化パイプライン。

可能な処理:

- resize
- crop
- quality調整
- format変換
- WebP/AVIF等の最適配信
- remote origin / R2上の画像変換

2026年時点ではFreeでも月5,000 unique transformationsまで利用できる構成が公式料金に示されている。超過時の扱い、Paid料金は変更され得るため本番導入時に再確認する。

### 画像配信の基本設計

```text
Original image: 3000x2000 PNG 5MB
↓ Cloudflare Images
Card: 640px WebP/AVIF
Hero: 1600px WebP/AVIF
↓
Browser
```

「レスポンシブCSSで300px表示しているから軽い」わけではない。転送している物理画像サイズを減らす必要がある。

---

## 12. Cache Purge

デプロイやCMS更新時には古いcacheを無効化する運用が必要。

Purge戦略:

1. Purge Everything — 簡単だが広すぎる
2. URL単位 — 記事更新等で扱いやすい
3. Tag/Prefix等 — 機能・プランに応じて利用
4. Immutable asset — URL fingerprintでpurge不要にする

### 最も安定する設計

JS/CSS/Image等のビルドアセットはcontent hashをURLへ入れ、基本的にpurgeしない。

```text
/app.20260831abc.js
```

HTML/APIのみ更新戦略を持つ。

---

# ハンズオン3: Cache HITを実測する

## Step 1 静的ファイルを用意

例:

```text
https://example.com/assets/test.css
```

## Step 2 1回目

```bash
curl -sI https://example.com/assets/test.css | grep -Ei 'cf-cache-status|cache-control|age|etag|last-modified'
```

## Step 3 数秒後に再実行

```bash
curl -sI https://example.com/assets/test.css | grep -Ei 'cf-cache-status|cache-control|age'
```

`MISS -> HIT` になるか確認する。

## Step 4 Cache Ruleを作る

`/lab-cache/*` を対象にEdge TTLを設定する。

## Step 5 HTMLで検証

個人情報を含まないテストHTMLでのみ行う。

```bash
curl -I https://example.com/lab-cache/index.html
```

## Step 6 Purgeして再確認

対象URLのみPurgeし、HITがMISSへ戻ることを確認する。

---

## 13. 実務のパフォーマンス計測

Cloudflare導入効果は「体感」だけでなく次の指標で測る。

- TTFB
- LCP
- Transfer Size
- Cache Hit Ratio
- Origin Requests
- Origin bandwidth
- 4xx/5xx
- Image bytes
- Request count

### 改善の優先順位例

1. 数MBの原寸PNG/JPEGを止める
2. Cache可能な静的resourceをEdgeへ載せる
3. Cache header/TTLを整理する
4. HTML/APIのcache可能性を検討する
5. Tiered Cache / Argo等を検討する

CDNの細かな設定より、巨大画像1枚の方がボトルネックというケースは珍しくない。

---

## 14. リスク・トレードオフ

### Cacheしすぎ

- 古いコンテンツ
- 個別データ漏洩
- 更新反映遅延

### Cacheしなさすぎ

- TTFB悪化
- Origin負荷
- Egress増
- スケールコスト増

### TTLが短すぎ

CDNがあるのに毎回Origin近くまで戻り、Cache hit ratioが伸びない。

### Queryごとの爆発

不要なquery parameterでcache keyが細分化される。

---

## 理解チェック

- Browser CacheとEdge Cacheを図で説明できるか。
- `MISS` と `BYPASS` は何が違うか。
- HTMLをcacheする前に何を確認するか。
- Tiered Cacheは何を減らすのか。
- ArgoとCacheの役割の違いを説明できるか。
- Hash付きassetで長期TTLが安全な理由は何か。

---

## 公式ドキュメント

- Cloudflare Cache: https://developers.cloudflare.com/cache/
- Get started: https://developers.cloudflare.com/cache/get-started/
- Default cache behavior: https://developers.cloudflare.com/cache/concepts/default-cache-behavior/
- Cache Rules: https://developers.cloudflare.com/cache/how-to/cache-rules/
- Tiered Cache: https://developers.cloudflare.com/cache/how-to/tiered-cache/
- Argo Smart Routing: https://developers.cloudflare.com/argo-smart-routing/
- Cloudflare Images: https://developers.cloudflare.com/images/
- Image Transformations: https://developers.cloudflare.com/images/optimization/transformations/overview/
