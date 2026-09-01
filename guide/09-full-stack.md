---
title: 第9章 Full-stack配信
---

# 第9章 Full-stack配信・Static Assets・フレームワーク

## 1. 学習目標

2026年時点のCloudflare Developer Platformでは、静的サイトとWorkers APIを別サービスとして考える必要が薄くなっている。

WorkersはStatic AssetsをWorker codeと一体でdeployできる。

この章では:

- Workers Static Assetsの仕組み
- SPA/SSG/SSRの配置
- React/Vite/Astro/Next.jsの現行方針
- Pagesとの位置づけ
- asset-first / worker-first routing

を理解する。

---

## 2. 2026年の重要な方針: 新規はWorkers中心

<!-- visual:start -->
{% include archify-diagram.html src="/assets/diagrams/09_fullstack.html" title="Workers中心のFull-stack構成" steps="Browser|Static Assets|Asset-first|Worker API|D1 / R2 / KV|External backend" summary="Static AssetsとAPIを同じWorkerプロジェクトへ統合できるが、静的ファイルは静的のまま返す設計が基本。" %}
<!-- visual:end -->

Cloudflare Pagesは現在も利用可能だが、公式Pagesドキュメントは**新規projectではWorkersを開始点にすることを推奨**している。

理由はWorkersが:

- static assets
- server-side code
- bindings
- routing
- observability
- deployment/versioning

をより広い機能セットで統合できるため。

### Pagesを即廃止する必要はない

既存Pages projectが正常稼働しているなら、無目的にmigrationする必要はない。

判断:

```text
Existing Pages, no problem
-> continue / planned migration only if value exists

New full-stack application
-> Workers first
```

---

## 3. Static Assets

Workers deploymentにHTML/CSS/JS/images等のasset directoryを含められる。

```jsonc
{
  "name": "my-app",
  "main": "src/index.ts",
  "compatibility_date": "2026-08-31",
  "assets": {
    "directory": "./dist"
  }
}
```

deploy時にWorker codeとassetsが同じdeployment unitとして扱われる。

Cloudflareはstatic assetsをglobal networkでcache/serveする。

---

## 4. Asset-firstとWorker-first

<!-- visual:start -->
<!-- visual:end -->

### Default: asset-first

matching assetがあればWorker codeを実行せずassetを返せる。

```text
/assets/app.js
-> Static Asset
-> no Worker application code required
```

利点:

- latency
- Worker invocation削減
- application code failureの影響縮小

### Worker-first

認証、A/B test、HTML transform等のためWorkerを先に実行したい場合:

```jsonc
{
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "run_worker_first": true
  }
}
```

ただし全asset requestがWorker codeを通るため、cost/latency/failure domainが増える。

---

## 5. Selective Worker-first

API pathだけWorkerへ通す構成が実務的。

```jsonc
{
  "assets": {
    "directory": "./dist/",
    "not_found_handling": "single-page-application",
    "binding": "ASSETS",
    "run_worker_first": ["/api/*", "!/api/docs/*"]
  }
}
```

意味:

```text
/api/users      -> Worker first
/api/docs/...   -> asset behavior
/assets/...     -> asset first
/unknown-route  -> SPA index.html
```

Frontend + APIを一deploymentにまとめられる。

---

## 6. SPA routing

React/Vue等のclient-side routerでは、直接 `/settings/profile` へアクセスしても `index.html` を返す必要がある。

```jsonc
{
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```

ただしAPI 404までindex.htmlへ吸い込ませないようselective routingを設計する。

Bad:

```text
GET /api/users/999
-> 200 index.html
```

Good:

```text
/api/* -> Worker API
other navigation -> SPA fallback
```

---

## 7. React + Vite

Cloudflare公式にはC3 templateがある。

```bash
npm create cloudflare@latest -- my-react-app --framework=react
```

構成イメージ:

```text
React SPA
  +
Workers API
  +
Cloudflare Vite Plugin
  +
Wrangler
```

Cloudflare Vite Pluginはdev時にWorkers runtimeである `workerd` と統合し、本番に近いruntime behaviorで開発できる。

### 業務上の利点

- FrontendとAPIのlocal devを統合
- Bindingsをdevから利用
- Static asset deploymentとAPI deploymentを同じreleaseへ載せる
- Previewとproduction差分を減らす

---

## 8. Astro

2026年8月時点の公式guideではAstroをWorkersへ直接scaffoldできる。

```bash
npm create cloudflare@latest -- my-astro-app --framework=astro
```

Astroはcontent-heavy siteに特に相性が良い。

```text
Static content -> build-time output / static assets
Dynamic route -> Worker runtime
Interactive islands -> browser JS
```

### 設計判断

Corporate site/blog/documentation:

- 基本はstatic/SSG
- 必要箇所だけSSR/API
- Images/R2等を組み合わせる

全ページSSRへする前に「本当にrequest-time renderingが必要か」を判断する。

---

## 9. Next.js

Cloudflare上のNext.js対応は変化が速い領域。

**2026-08-25時点のCloudflare公式ドキュメントは、新規Next.js on Workersでは `vinext` をdefault pathとして推奨している。**

既存OpenNext projectは引き続きdocumented pathとして存在するが、新規ではvinext推奨とされている。

これは2025年前後の「OpenNext adapterを使う」という知識だけでは古くなり得る例。

### 実務原則

Next.js deployment adapterは頻繁に状況が変わるため:

1. Framework version
2. Cloudflare recommended adapter
3. Unsupported features
4. Node compatibility
5. Cache/ISR behavior

をproject開始時に固定し、upgrade時に再検証する。

---

## 10. FrameworkをCloudflareへ載せる時のチェック項目

### Runtime compatibility

- Node-specific API
- native modules
- filesystem assumptions
- long-running process assumptions

### Rendering

- SSG
- SSR
- ISR-like behavior
- client-side rendering

### Data access

- D1 binding
- R2
- KV
- external DB via Hyperdrive

### Cache

Framework cacheとCloudflare CDN cacheの二重構造を理解する。

### Images

Framework builtin image optimizerとCloudflare Imagesの責務を整理する。

---

## 11. Full-stack architecture例

### Small SaaS

{% include archify-diagram.html src="/assets/diagrams/09_small_saas.html" title="Small SaaSのデータ経路" steps="Browser|Workers + Assets|Worker API|D1|R2|Queues / Webhook" summary="利用者への応答と非同期処理を分け、データの責務を明確にする。" %}

### Content site

```text
Astro static HTML
+ Static Assets
+ R2 media
+ Images transformations
+ Cache Rules
+ minimal Worker API
```

### Existing backend modernization

```text
React/Vite assets -> Workers Static Assets
/api/* -> Worker
Worker -> Hyperdrive -> existing PostgreSQL
```

Frontend deliveryだけCloudflareへ寄せ、DBを無理にD1へ移行しない選択もできる。

---

# ハンズオン9: React SPA + Worker API

## Step 1 Scaffold

```bash
npm create cloudflare@latest -- cf-fullstack-lab --framework=react
cd cf-fullstack-lab
```

## Step 2 API追加

例:

```ts
if (url.pathname === '/api/hello') {
  return Response.json({ message: 'hello from worker' });
}
```

## Step 3 Frontendからfetch

```ts
const response = await fetch('/api/hello');
const data = await response.json();
```

同一originにすることでdevelopment/production CORS複雑性を減らせる。

## Step 4 Local dev

```bash
npm run dev
```

## Step 5 Build preview

Cloudflare Vite Plugin構成では `vite preview` 等、template scriptsに従って本番runtimeに近いpreviewを確認する。

## Step 6 Deploy

```bash
npm run deploy
```

## Step 7 Custom Domain

Production hostnameを付与する。

---

## 12. Deployment Strategy

ProductionではGit integration / Workers Builds / external CIを選べる。

最低限:

```text
main branch
-> build
-> test
-> deploy
```

を自動化する。

### ProductionとPreview

preview deploymentに本番secret/databaseを書き込み可能な状態を作らない。

```text
Preview -> preview D1 / staging API
Production -> production resources
```

resource bindingをenvironment単位で分離する。

---

## 13. Static-firstの価値

Cloudflareだから何でもWorker SSRにする必要はない。

Static assetは:

- cacheしやすい
- cheap
- failure-resistant
- low latency
- secure surfaceが小さい

Dynamic processingが必要なrequestだけWorkerへ通すのが基本的に強い。

```text
Static by default
Dynamic by requirement
```

---

## 14. リスク・トレードオフ

### 全request Worker-first

認証等には有効だが、asset deliveryにもapplication code依存が生まれる。

### Framework abstraction

Framework adapterがCloudflare runtimeの制約を隠し、version update時に破壊的変更が起こることがある。

### Pagesからのmigration

「Workersが推奨だから」という理由だけで安定projectを移すと、migration cost > benefitになり得る。

---

## 理解チェック

- Workers Static AssetsがPagesと重なる領域を説明できるか。
- asset-firstの利点は何か。
- `run_worker_first`を全pathへ設定するリスクは何か。
- SPAのAPI 404をindex.htmlへしない方法を説明できるか。
- 2026年時点のNext.js on Workers推奨pathを確認する必要がある理由は何か。

---

## 公式ドキュメント

- Workers Static Assets: https://developers.cloudflare.com/workers/static-assets/
- Static Assets bindings/routing: https://developers.cloudflare.com/workers/static-assets/binding/
- SPA routing: https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/
- Vite Plugin: https://developers.cloudflare.com/workers/vite-plugin/
- React: https://developers.cloudflare.com/workers/framework-guides/web-apps/react/
- Astro: https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/
- Next.js: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- Pages: https://developers.cloudflare.com/pages/
