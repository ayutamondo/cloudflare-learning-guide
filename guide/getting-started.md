---
title: はじめに・学習方法
description: Cloudflare 実務学習ガイドの対象読者、学習順、必要な環境
---

# Cloudflare 実務学習ガイド

**対象:** Webエンジニア / インフラ・クラウド担当 / テックリード / Web制作・運用担当  
**基準日:** 2026-08-31  
**目的:** Cloudflareを「CDNの設定画面」ではなく、DNS・ネットワーク・セキュリティ・アプリ実行基盤・データ基盤を一体で設計できるレベルまで理解する。

---

## この教材の考え方

<!-- visual:start -->
{% include archify-diagram.html src="/assets/diagrams/00_request_lifecycle.html" title="Cloudflareでのリクエスト処理" steps="利用者|DNS|Cloudflare Edge|Security / Rules|Cache / Workers|Origin / Data" summary="Cloudflareは製品名で暗記せず、DNS・Edge Security・Edge Logic・Data / Originという処理の層で捉える。" %}
<!-- visual:end -->

Cloudflareは製品数が多いため、製品名を暗記すると全体像を見失いやすい。実務では、1リクエストが次のように流れると理解した方が判断しやすい。

すべての機能を使う必要はない。重要なのは、**どの問題を、どの層で解決するべきか**を判断できること。

---

## まず押さえるべき2026年時点の重要な前提

1. **Cloudflareは単なるCDNではない。** 権威DNS、リバースプロキシ、WAF、Zero Trust、サーバーレス実行環境、ストレージ、データベースまで持つ統合プラットフォームである。
2. **新規アプリケーション開発ではWorkersが主軸。** Cloudflare公式は現在、Pagesの新規利用よりWorkersを推奨している。Pagesは既存プロジェクトやGit連携中心のワークフローでは引き続き利用できる。
3. **Page Rulesは新規設計の中心にしない。** Redirect Rules、Cache Rules、Configuration Rules、Origin Rules、Transform Rulesなどの現行Rules製品を使う。
4. **`workers.dev` は検証用。** 本番の業務システムはCustom DomainまたはWorkers Routeを基本とする。
5. **R2の「Egress無料」は強力だが、ストレージ・操作・変換など他の課金がゼロという意味ではない。**
6. **KVは強整合DBではない。** 読み取り中心・設定値・キャッシュ向け。更新直後の値が全世界で即時に見える設計を前提にしてはいけない。
7. **DDoS/WAFを有効にしてもオリジン直アクセスを許していればCloudflareを迂回され得る。** Tunnel、Authenticated Origin Pulls、ファイアウォール制限などを組み合わせて「Cloudflare経由しか到達できない」状態を設計する。

---

## 推奨学習順

| 順序 | 章 | 到達点 |
|---:|---|---|
| 1 | 01 全体アーキテクチャ | Cloudflareが通信経路のどこに入るか説明できる |
| 2 | 02 DNS/TLS/Origin | ドメイン導入と暗号化を安全に構成できる |
| 3 | 03 CDN/Cache | `CF-Cache-Status`を見てキャッシュ挙動を説明できる |
| 4 | 04 Security | WAF・Rate Limit・Bot対策を使い分けられる |
| 5 | 05 Ruleset Engine | ルールの実行順と責務を理解できる |
| 6 | 06 Zero Trust | VPNとの違い、Access/Tunnelの構成を説明できる |
| 7 | 07 Workers | WranglerでAPIを作り、本番ドメインへ配置できる |
| 8 | 08 Data | KV/R2/D1/DO/Queues/Hyperdriveを選定できる |
| 9 | 09 Full-stack | 静的アセットとAPIをWorkers上で統合できる |
| 10 | 10 Reliability | 複数Origin・Load Balancing・Health Checkを設計できる |
| 11 | 11 Operations | Logs/Trace/API Token/IaCを運用に落とせる |
| 12 | 12 Cost | プランと従量課金を設計判断に反映できる |
| 13 | 13 総合演習 | 小規模本番システムを一通り構築できる |

---

## ハンズオンに必要な環境

- Cloudflareアカウント
- 独自ドメイン1つ（可能なら検証用サブドメインを用意）
- Node.js
- npm / pnpm / yarn のいずれか
- Git
- `curl`
- `dig` または `nslookup`
- ブラウザのDevTools
- 任意: Docker、Terraform、GitHub

Workersの公式CLIであるWranglerはC3（create-cloudflare-cli）から導入するのが最も簡単。

```bash
npm create cloudflare@latest -- cf-learning
cd cf-learning
npx wrangler dev
```

---

## 各章の読み方

各章は以下の順で構成する。

1. **前提 / 定義** — 用語を揃える
2. **アーキテクチャ** — 内部で何が起きるか
3. **実務でできること** — UI/CLI/APIで行う作業
4. **業務メリット** — UX・可用性・コスト・運用への効果
5. **ハンズオン** — 自分で再現する
6. **失敗例 / リスク** — 本番事故につながるポイント
7. **理解チェック** — 説明できるべき質問

---

## 実際に手を動かすときの進め方

教材を読むだけで設定を変えると、何が効いたのか分からなくなりがちである。各章のハンズオンは、次の小さなサイクルで進める。

1. **目的を1文で言えるようにする。** たとえばキャッシュなら「同じ応答をEdgeから返し、Originへのアクセスを減らす」と説明できる状態にする。
2. **検証用の対象を決める。** 本番ドメインや本番ルールではなく、可能なら検証用サブドメイン・パス・プロジェクトを使う。
3. **変更前の状態を記録する。** `curl -I` のレスポンス、DNS応答、ダッシュボード画面などを保存し、比較できるようにする。
4. **章の手順を一つずつ実行する。** 一度に複数のルールや設定を変えず、変更の理由をメモする。
5. **期待結果を確認する。** 章内に示すヘッダー、ログ、ステータス、挙動を確認し、期待と違えば次の変更へ進まない。
6. **検証用の設定を片付ける。** 一時的なDNS、トークン、ルール、課金対象のリソースを残さない。残す設定は目的と作成日を記録する。

> **注意:** DNS、TLS、WAF、ルーティングの変更は公開中のサービスに影響しうる。本番へ適用する場合は、変更対象・戻し方・影響範囲を先に確認する。

---

## この教材で扱わない、または後回しにする領域

CloudflareにはMagic Transit、Spectrum、Cloudflare for SaaS、Workers for Platforms、Browser Isolation、CASB、DLP、AI Gateway、Vectorize、Workers AI、Streamなどもある。重要な製品だが、Webアプリ・Webサイトの基盤を理解する最初の50ページ相当の教材ではコア概念を優先する。

上記は基礎を習得した後に「ネットワーク」「SASE」「AI」「SaaS基盤」などの専門トラックとして追加するのがよい。

---

## 公式ドキュメントの扱い

本教材は2026-08-31時点のCloudflare公式ドキュメントを基準に整理している。Cloudflareは機能名、料金、プラン制限、ダッシュボードの配置が頻繁に更新されるため、本番導入時は各章末の公式URLを再確認すること。
