import { mkdirSync, writeFileSync } from "node:fs";

const destination = "assets/archify";
mkdirSync(destination, { recursive: true });

const diagrams = [
  ["00_request_lifecycle", "workflow", "Cloudflareでのリクエスト処理", ["利用者", "DNS", "Cloudflare Edge", "Security / Rules", "Cache / Workers", "Origin / Data"], "DNSからOriginまで、どの層で問題を解くかを考える"],
  ["01_cloudflare_architecture", "architecture", "Cloudflare全体アーキテクチャ", ["利用者", "Cloudflare DNS", "Cloudflare Edge", "WAF / Cache / Workers", "Origin", "アプリのData"], "Proxied DNSではCloudflareがリバースプロキシとして通信経路に入る"],
  ["01_request_cache_sequence", "workflow", "Cache HIT / MISS のリクエスト経路", ["利用者", "Cloudflare Edge", "TLS / WAF / Rules", "Cacheを確認", "Origin", "レスポンス"], "HITならEdgeが応答し、MISSならOriginへ問い合わせる"],
  ["02_dns_tls_origin", "architecture", "TLSの二つの接続", ["利用者", "Edge証明書", "Cloudflare Edge", "Origin証明書", "Origin", "Firewall / Tunnel"], "利用者からEdge、EdgeからOriginを別のTLS接続として検証する"],
  ["03_cache_layers", "architecture", "Browser・Edge・Originのキャッシュ階層", ["利用者", "Browser Cache", "Cloudflare Edge Cache", "Cache Rules", "Origin", "Source of truth"], "TTLとキャッシュキーを層ごとに分けて設計する"],
  ["03_cache_status_flow", "workflow", "CF-Cache-Status 調査フロー", ["リクエスト", "ヘッダーを確認", "HIT / Age", "MISS / DYNAMIC", "適格性を確認", "TTL・Ruleを調整"], "設定画面より先に、実レスポンスの事実から原因を追う"],
  ["04_security_decision", "workflow", "攻撃対策の選択フロー", ["症状を観測", "大量トラフィック", "攻撃パターン", "DDoS / WAF", "Challenge / Limit", "アプリ制御"], "ログと限定条件から始め、誤検知を確認して強化する"],
  ["06_zero_trust", "architecture", "Zero Trust: Tunnel + Access + Gateway", ["利用者 / 端末", "Identity Provider", "Cloudflare One", "Access Policy", "Tunnel", "Private App"], "ネットワーク単位ではなく、利用者・端末・アプリ単位で許可する"],
  ["06_access_auth_flow", "workflow", "Cloudflare Accessの認証フロー", ["管理URLを開く", "Access", "IdPへ移動", "ログイン / MFA", "Policy評価", "Private App"], "認証に加え、グループや端末条件をPolicyで評価する"],
  ["07_workers_runtime", "architecture", "Workers RuntimeとBindings", ["リクエスト", "Worker Isolate", "fetch handler", "env bindings", "Cloudflare Data", "Origin / API"], "状態は外部データサービスに置き、Workerはリクエスト単位で実行する"],
  ["07_wrangler_cycle", "workflow", "Wrangler開発サイクル", ["コードと設定", "wrangler dev", "ローカル確認", "wrangler deploy", "本番 / Route", "Logsで観測"], "設定とコードをGit管理し、CLIやCIから再現可能にする"],
  ["08_data_decision_flow", "workflow", "Data製品選定フロー", ["データ要件", "大きなオブジェクト", "SQLが必要", "協調状態が必要", "非同期処理", "製品を組み合わせる"], "Data製品は一つに絞らず、要件に応じて組み合わせる"],
  ["09_fullstack", "architecture", "Workers中心のFull-stack構成", ["Browser", "Static Assets", "Asset-first", "Worker API", "D1 / R2 / KV", "External backend"], "静的配信はそのまま返し、動的な処理だけをWorkerへ流す"],
  ["09_small_saas", "architecture", "Small SaaSのデータ経路", ["Browser", "Workers + Assets", "Worker API", "D1", "R2", "Queues / Webhook"], "利用者への応答と非同期処理を分け、データの責務を明確にする"],
  ["10_availability", "architecture", "可用性設計", ["利用者", "Cloudflare Edge", "Load Balancer", "Health monitor", "Origin A", "Origin B"], "EdgeだけでなくOrigin・Data・運用の障害ドメインを分ける"],
  ["10_lb_pools", "architecture", "Load BalancerのPool構成", ["Load Balancer", "Pool Tokyo", "Endpoint A1", "Endpoint A2", "Pool Osaka", "Endpoint B1 / B2"], "PoolとEndpointを分け、監視結果で正常な接続先へ誘導する"],
  ["11_observability", "architecture", "Observabilityと運用ループ", ["Client", "Cloudflare Edge", "Security events", "Worker logs", "Origin logs", "相関IDで分析"], "CF-Ray、Cache status、Worker logs、Origin logsをつないで原因を絞る"],
  ["11_debug_runbook", "workflow", "障害調査の順序", ["Client / DNS", "Response headers", "Security events", "Worker logs", "Origin / DB", "原因と対処"], "利用者側からOriginへ順に観測し、原因レイヤーを絞り込む"],
  ["13_reference_architecture", "architecture", "総合ハンズオンの完成形", ["User", "Cloudflare Edge", "WAF / Rate Limit", "Worker + Assets", "D1 / R2 / Queue", "API / Origin"], "主要レイヤーを接続し、構築・観測・復旧を一通り試す"],
  ["13_hands_on_phases", "workflow", "総合ハンズオンの進め方", ["Foundation", "App", "Data", "Security", "Operations", "確認・Rollback"], "安全な土台から観測までを段階的に積み上げる"],
];

const componentTypes = ["external", "cloud", "security", "backend", "database", "messagebus"];
for (const [name, type, title, labels, decision] of diagrams) {
  const ids = labels.map((_, i) => `step${i + 1}`);
  const edges = ids.slice(1).map((to, i) => ({
    id: `edge${i + 1}`, from: ids[i], to,
    label: i === 0 ? "request" : undefined,
    variant: i === 0 ? "emphasis" : "default"
  }));
  const meta = { title, quality_profile: "showcase" };
  const spec = type === "architecture"
    ? {
        schema_version: 1, diagram_type: type,
        meta: { ...meta, viewBox: [980, 650] },
        components: labels.map((label, i) => ({
          id: ids[i], type: componentTypes[i], label,
          pos: [60 + (i < 3 ? i : 5 - i) * 310, 130 + Math.floor(i / 3) * 250], size: [220, 86]
        })),
        connections: edges,
        cards: [{ dot: "cyan", title: "この図で判断すること", items: [decision] }]
      }
    : {
        schema_version: 2, diagram_type: type,
        meta: { ...meta, viewBox: [1040, 550] },
        lanes: [
          { id: "first", label: "判断・処理の流れ" },
          { id: "second", label: "続き" }
        ],
        mainPath: ids,
        semanticChecks: {
          allowedRoots: [ids[0]], allowedTerminals: [ids.at(-1)],
          requiredPaths: [{ from: ids[0], to: ids.at(-1) }]
        },
        nodes: labels.map((label, i) => ({
          id: ids[i], lane: i < 3 ? "first" : "second", col: i < 3 ? i : i - 1,
          type: componentTypes[i], label, width: 144
        })),
        edges: edges.map((edge) => ({ ...edge, role: "main" })),
        cards: [{ dot: "cyan", title: "この図で判断すること", items: [decision] }]
      };
  writeFileSync(`${destination}/${name}.${type}.json`, `${JSON.stringify(spec, null, 2)}\n`);
}

console.log(`${diagrams.length} Archify source files created in ${destination}`);
