---
layout: home
title: Cloudflare 実務学習ガイド
---

<section class="home-hero">
  <div class="home-hero__copy">
    <p class="eyebrow">A PRACTICAL FIELD GUIDE / 2026</p>
    <h1>Cloudflare<br><em>実務</em> 学習ガイド</h1>
    <p class="home-lead">DNS、セキュリティ、CDN、Workers、データ基盤まで。<br>プロダクト名の暗記ではなく、<strong>設計の判断</strong>を身につけるための13章。</p>
    <div class="hero-actions">
      <a class="button button--primary" href="00_README.html">学習をはじめる <span>→</span></a>
      <a class="text-action" href="#chapters">章一覧を見る ↓</a>
    </div>
  </div>
  <div class="home-hero__visual" aria-label="Cloudflareを通るリクエストの流れ">
    <p>01 / REQUEST LIFECYCLE</p>
    <img src="assets/diagrams/00_request_lifecycle.png" alt="クライアントのリクエストがDNS、Cloudflare Edge、オリジンを通る流れ">
    <span class="visual-stamp">EDGE<br>FIRST</span>
  </div>
</section>

<section class="manifesto">
  <p class="eyebrow">THE APPROACH</p>
  <p>Cloudflareを「設定画面の集合」としてではなく、<br>一つのリクエストが通る<strong>システム全体</strong>として捉える。</p>
</section>

<section class="guide-intro">
  <div>
    <p class="eyebrow">HOW TO USE THIS GUIDE</p>
    <h2>読む。試す。<br>確認する。</h2>
  </div>
  <div class="guide-intro__body">
    <p>各章は概念だけで終わりません。目的を理解し、検証環境で手を動かし、レスポンスやログから結果を確かめるところまでを一つの学習単位にしています。</p>
    <a class="text-action" href="00_README.html">学習方法と必要な環境を見る →</a>
  </div>
</section>

<section id="chapters" class="chapter-section">
  <div class="section-heading">
    <p class="eyebrow">THE 13 CHAPTERS</p>
    <h2>基礎から、<br>本番設計まで。</h2>
  </div>
  <div class="chapter-grid">
    <a class="chapter-card chapter-card--feature" href="01_Cloudflare全体アーキテクチャ.html"><span>01</span><strong>全体<br>アーキテクチャ</strong><small>最初に読む</small></a>
    <a class="chapter-card" href="02_DNS_TLS_オリジン保護.html"><span>02</span><strong>DNS / TLS<br>オリジン保護</strong></a>
    <a class="chapter-card" href="03_CDNキャッシュ_パフォーマンス.html"><span>03</span><strong>CDN / Cache<br>パフォーマンス</strong></a>
    <a class="chapter-card chapter-card--dark" href="04_WAF_DDoS_Bot_RateLimiting.html"><span>04</span><strong>WAF / DDoS<br>Bot / Rate Limit</strong></a>
    <a class="chapter-card" href="05_RulesetEngine_ルーティング.html"><span>05</span><strong>Ruleset Engine<br>ルーティング</strong></a>
    <a class="chapter-card" href="06_ZeroTrust_Access_Tunnel_Gateway.html"><span>06</span><strong>Zero Trust<br>Access / Tunnel</strong></a>
    <a class="chapter-card chapter-card--accent" href="07_Workers_Runtime_Wrangler.html"><span>07</span><strong>Workers<br>Wrangler</strong></a>
    <a class="chapter-card" href="08_Storage_Data_KV_R2_D1_DO_Queues_Hyperdrive.html"><span>08</span><strong>Data / Storage<br>KV / R2 / D1</strong></a>
    <a class="chapter-card" href="09_FullStack_静的配信_フレームワーク.html"><span>09</span><strong>Full-stack<br>静的配信</strong></a>
    <a class="chapter-card chapter-card--dark" href="10_可用性_LoadBalancing_Origin設計.html"><span>10</span><strong>可用性<br>Load Balancing</strong></a>
    <a class="chapter-card" href="11_Observability_API_IaC_運用.html"><span>11</span><strong>Observability<br>API / IaC / 運用</strong></a>
    <a class="chapter-card" href="12_料金_プラン_設計判断.html"><span>12</span><strong>料金 / プラン<br>設計判断</strong></a>
    <a class="chapter-card chapter-card--wide" href="13_総合ハンズオン_実務導入チェックリスト.html"><span>13</span><strong>総合ハンズオン — 小規模Webサービスを<br>Cloudflareで本番設計する</strong><small>BUILD IT</small></a>
  </div>
</section>

<section class="home-closing">
  <p class="eyebrow">NO GUESSWORK</p>
  <h2>現場で使う前に、<br>自分で確かめる。</h2>
  <p>本ガイドの製品仕様や設計判断は、Cloudflare公式ドキュメントを起点にしています。</p>
  <a class="button button--inverse" href="SOURCE_INDEX.html">公式ソース索引を開く <span>→</span></a>
</section>
