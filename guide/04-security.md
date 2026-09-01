---
title: 第4章 WAF・DDoS・Bot・Rate Limiting
---

# 第4章 WAF・DDoS・Bot・Rate Limiting

## 1. 学習目標

Cloudflareのセキュリティ機能は名称が似ているが、守る対象が異なる。

この章では「攻撃っぽい通信を全部WAFで止める」という考え方を捨て、脅威ごとに適切な制御を選ぶ。

---

## 2. 脅威と機能の対応

<!-- visual:start -->
<!-- visual:end -->

| 脅威 | 主なCloudflare機能 |
|---|---|
| 大量パケット/大量HTTP | DDoS Protection |
| SQLi/XSS等Web攻撃 | WAF Managed Rules |
| 独自条件の遮断 | WAF Custom Rules |
| API連打/Brute force | Rate Limiting Rules |
| 自動化Bot | Bot Fight Mode / Super Bot Fight Mode / Bot Management |
| フォームspam | Turnstile + server-side validation |
| 管理画面アクセス制御 | WAF + Access |
| API authentication | Application auth / Access / API Shield等 |

一つの機能ですべてを解決しようとしない。

---

## 3. DDoS Protection

DDoSは大量トラフィックで帯域・接続・アプリケーション資源を枯渇させる攻撃。

CloudflareではNetwork Layer（L3/L4）とApplication Layer（L7）の保護がある。

L3/L4 DDoS ProtectionはCloudflare network側で自動的に動作し、通常ユーザーが毎回ルールを作るものではない。

### 業務上の価値

Originへ全攻撃トラフィックを送らずEdgeで吸収・緩和できるため、

- Origin overloadの低減
- 通常ユーザーのAvailability向上
- Origin帯域の保護

につながる。

ただし「Cloudflareを入れれば攻撃時のあらゆる課金が必ずゼロになる」とは断言しない。Origin bypass、Workers等の従量サービス、ログ、第三者Origin側の構成など、費用発生経路は個別に評価する。

---

## 4. WAF Managed Rules

Cloudflareが管理する既知攻撃パターン向けルールセット。

代表:

- Cloudflare Managed Ruleset
- OWASP Core Ruleset

SQL injection、XSS、一般的なexploit pattern等を検知する。

### Virtual Patching

アプリ修正が完了する前にWAFで既知exploit patternを止めることを「virtual patch」として使える。

ただしWAFはアプリケーションの脆弱性そのものを修正するものではない。

```text
WAFで遮断
+ application patch
+ dependency update
+ test
```

の順で恒久対応する。

---

## 5. WAF Custom Rules

Cloudflare Rules languageで条件を書き、Block / Managed Challenge / Skip等を行う。

例: 管理画面を許可国以外からChallenge

```text
(http.request.uri.path starts_with "/admin" and ip.src.country ne "JP")
```

例: 特定User-AgentをBlock

```text
(http.user_agent contains "BadCrawler")
```

例: API pathだけ条件を絞る

```text
(http.host eq "api.example.com" and http.request.uri.path starts_with "/v1/")
```

### Rule order

Custom Rulesは順序評価され、Block等のterminating actionは後続評価を止める場合がある。

「例外Allowを後に置けばよい」と思うと前段Blockで到達しないことがある。

---

## 6. Managed Challenge

<!-- visual:start -->
<!-- visual:end -->

固定CAPTCHA表示とは異なり、Cloudflareが状況に応じてchallenge方法を決める。

BlockよりUXへの影響が小さく、誤検知リスクがある条件で使いやすい。

### 基本判断

- 明確な攻撃: Block
- suspiciousだが正規ユーザーの可能性あり: Managed Challenge
- 観測段階: Log（利用可能性はプラン/機能による）

本番WAFではいきなり広いBlock ruleを置かず、対象トラフィックをSecurity Analytics/Eventで観察する。

---

## 7. Rate Limiting

Rate Limitingは「内容が悪意か」ではなく「一定期間のリクエスト回数」を基準に制御する。

適する例:

- `/login` brute force
- Password reset連打
- Search API abuse
- Public API quota
- 高コストendpointへの連打

### 例

```text
/login
1 IPあたり10 requests / 1 minuteを超えたら制御
```

実際に選べるcounting characteristics、mitigation timeout、action等はプランと現行仕様を確認する。

### 注意: NAT

企業・学校・携帯carrier等では多数ユーザーが同一public IPを共有する。

IPだけでrate limitすると正規ユーザーをまとめて止める可能性がある。

可能なら:

- authenticated user ID
- API key
- session
- IP + path

などアプリ側識別との組み合わせを検討する。

---

## 8. Bot対策の階層

### Bot Fight Mode

Freeでも利用できるシンプルな自動Bot対策。細かいカスタマイズ性は低い。

### Super Bot Fight Mode

Pro/Business/Enterprise等でより制御可能。Verified bots等を考慮しつつactionを設定できる。

### Bot Management

Enterprise add-on。リクエストごとにbot score等を利用した高度な制御が可能。

### 重要

検索エンジン、監視、決済、Webhookなど正当なautomationも存在する。「Bot = Block」ではない。

---

## 9. Turnstile

Turnstileはフォームやsignup等へ埋め込むhuman verification solution。

重要なのはclient widgetを表示するだけでなく、**server-sideでtokenを検証すること**。

```text
Browser
  ↓ Turnstile challenge
Token
  ↓ form submit
Application Server / Worker
  ↓ Siteverify
Cloudflare
  ↓ result
Application accepts/rejects
```

client側だけで判定すると容易にbypassされ得る。

---

## 10. WAFとAccessの違い

### WAF

リクエスト属性を評価する。

```text
IP / Country / Path / Header / Bot score / attack pattern
```

### Access

ユーザーIdentityとPolicyを評価する。

```text
Who are you?
Which IdP group?
Device posture?
Service token?
```

管理画面は「JPのIPだけ許可」より「会社アカウントで認証 + MFA + device posture」の方がZero Trustとしては本質的。

WAFは補助防御として併用する。

---

# ハンズオン4-A: Custom Ruleを作る

## 目的

検証用 `/cf-lab-block` だけをBlockし、ルール影響範囲を理解する。

条件:

```text
http.request.uri.path eq "/cf-lab-block"
```

Action:

```text
Block
```

確認:

```bash
curl -I https://example.com/cf-lab-block
curl -I https://example.com/
```

後者までBlockされたら条件が広すぎる。

---

# ハンズオン4-B: Login EndpointのRate Limit設計

実際にproductionを止めず、まず仕様書として設計する。

```yaml
endpoint: /api/login
identity:
  primary: ip
threshold: 10 requests / 60 seconds
action: managed_challenge_or_block
exceptions:
  - internal_monitoring
observability:
  - security_events
  - application_login_failure_rate
rollback:
  - disable_rule
```

### テスト観点

- 正常ユーザー5回
- 同一IPから11回
- 異なるIP
- IPv6
- Proxy/VPN
- 社内NAT
- monitoring bot

セキュリティRuleもソフトウェア変更と同様、test caseとrollbackを持つ。

---

## 11. False Positive運用

WAF運用で難しいのは「攻撃を止めること」より「正規通信を止めないこと」。

推奨フロー:

```text
Observe
↓
Narrow expression
↓
Challenge / Log
↓
Measure
↓
Block
↓
Review exceptions
```

例外を追加する時も「IP丸ごとSkip WAF」のような広すぎるskipは避け、必要なrule/productだけskipする。

---

## 12. SecurityのKPI

セキュリティ機能は「ONにした」で完了ではない。

観測指標:

- Total requests
- Blocked requests
- Challenged requests
- WAF managed rule matches
- Rate limited requests
- Login success/failure
- False positive tickets
- Origin 4xx/5xx
- Bot traffic ratio

UXとのトレードオフも見る。

Challengeを増やしすぎればCVRやログイン成功率を下げる可能性がある。

---

## 13. よくある誤り

- Country blockだけでsecurity対策とする
- `/admin` をIP制限だけで守る
- Wide ruleをいきなりBlock
- SkipでWAF全体を外す
- Turnstile tokenをserver-side検証しない
- Rate LimitingをIPだけに依存しNATを考えない
- WAFで脆弱性修正そのものが不要になると考える

---

## 理解チェック

- DDoSとRate Limitingの違いは何か。
- Managed RulesとCustom Rulesの責務を説明できるか。
- Bot ManagementでVerified Botを考慮する理由は何か。
- WAFとAccessを管理画面保護でどう組み合わせるか。
- False Positiveを抑える導入順を説明できるか。

---

## 公式ドキュメント

- WAF Custom Rules: https://developers.cloudflare.com/waf/custom-rules/
- Security feature interoperability: https://developers.cloudflare.com/waf/feature-interoperability/
- Ruleset phases: https://developers.cloudflare.com/ruleset-engine/reference/phases-list/
- Turnstile: https://developers.cloudflare.com/turnstile/
- Cloudflare plans: https://www.cloudflare.com/plans/
