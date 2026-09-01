---
layout: home
title: Cloudflare 実務学習ガイド
---

<section class="home-hero">
  <div class="home-hero__copy">
    <p class="eyebrow">実務のための Cloudflare 学習ガイド</p>
    <h1>Cloudflareを、<br>設定から<strong>設計</strong>へ。</h1>
    <p class="home-lead">DNS、セキュリティ、CDN、Workers、データ基盤まで。<br>プロダクト名の暗記ではなく、<strong>設計の判断</strong>を身につけるための13章。</p>
    <div class="hero-actions">
      <a class="button button--primary" href="guide/getting-started.html">学習をはじめる <span>→</span></a>
      <a class="text-action" href="#chapters">章一覧を見る ↓</a>
    </div>
  </div>
  <figure class="home-hero__visual">
    <img src="assets/images/hero-network-poster.png" alt="藍色の建築的な面と朱色の線で、ネットワークの境界と通信経路を抽象的に表現したビジュアル">
    <figcaption>境界を設計し、速く、安全に届ける。</figcaption>
  </figure>
</section>

<section class="manifesto">
  <p class="eyebrow">このガイドの考え方</p>
  <p>Cloudflareを「設定画面の集合」としてではなく、<br>一つのリクエストが通る<strong>システム全体</strong>として捉える。</p>
</section>

<section class="guide-intro">
  <div>
    <p class="eyebrow">学び方</p>
    <h2>読む。試す。<br>確認する。</h2>
  </div>
  <div class="guide-intro__body">
    <p>各章は概念だけで終わりません。目的を理解し、検証環境で手を動かし、レスポンスやログから結果を確かめるところまでを一つの学習単位にしています。</p>
    <a class="text-action" href="guide/getting-started.html">学習方法と必要な環境を見る →</a>
  </div>
</section>

<section id="chapters" class="chapter-section">
  <div class="section-heading">
    <p class="eyebrow">全13章</p>
    <h2>基礎から、<br>本番設計まで。</h2>
  </div>
  <div class="chapter-grid">
    <a class="chapter-card chapter-card--feature" href="guide/01-architecture.html"><span>01</span><strong>全体<br>アーキテクチャ</strong><small>最初に読む</small></a>
    <a class="chapter-card" href="guide/02-dns-tls-origin.html"><span>02</span><strong>DNS / TLS<br>オリジン保護</strong></a>
    <a class="chapter-card" href="guide/03-cdn-cache-performance.html"><span>03</span><strong>CDN / Cache<br>パフォーマンス</strong></a>
    <a class="chapter-card chapter-card--dark" href="guide/04-security.html"><span>04</span><strong>WAF / DDoS<br>Bot / Rate Limit</strong></a>
    <a class="chapter-card" href="guide/05-ruleset-engine.html"><span>05</span><strong>Ruleset Engine<br>ルーティング</strong></a>
    <a class="chapter-card" href="guide/06-zero-trust.html"><span>06</span><strong>Zero Trust<br>Access / Tunnel</strong></a>
    <a class="chapter-card chapter-card--accent" href="guide/07-workers-runtime.html"><span>07</span><strong>Workers<br>Wrangler</strong></a>
    <a class="chapter-card" href="guide/08-data-storage.html"><span>08</span><strong>Data / Storage<br>KV / R2 / D1</strong></a>
    <a class="chapter-card" href="guide/09-full-stack.html"><span>09</span><strong>Full-stack<br>静的配信</strong></a>
    <a class="chapter-card chapter-card--dark" href="guide/10-reliability.html"><span>10</span><strong>可用性<br>Load Balancing</strong></a>
    <a class="chapter-card" href="guide/11-operations.html"><span>11</span><strong>Observability<br>API / IaC / 運用</strong></a>
    <a class="chapter-card" href="guide/12-pricing.html"><span>12</span><strong>料金 / プラン<br>設計判断</strong></a>
    <a class="chapter-card chapter-card--wide" href="guide/13-hands-on.html"><span>13</span><strong>総合ハンズオン — 小規模Webサービスを<br>Cloudflareで本番設計する</strong><small>BUILD IT</small></a>
  </div>
</section>

<section class="home-closing">
  <p class="eyebrow">公式情報を起点にする</p>
  <h2>現場で使う前に、<br>自分で確かめる。</h2>
  <p>本ガイドの製品仕様や設計判断は、Cloudflare公式ドキュメントを起点にしています。</p>
  <a class="button button--inverse" href="reference/source-index.html">公式ソース索引を開く <span>→</span></a>
</section>
