# 図の制作ブリーフ

各図は、本文の言い換えではなく、読者が設計判断をするための関係を示す。

| 章 | 読者の問い | 図で示す関係 | 図を見た後の判断 |
|---|---|---|---|
| 1 | WAFやCacheはいつ効くか | ProxiedとDNS onlyの2経路 | WebホストはProxied、メール等はDNS onlyにする理由 |
| 2 | HTTPSでもOriginは守られるか | Visitor→EdgeとEdge→Originの別TLS区間 | Full (strict)とOrigin直アクセス制限を併用する理由 |
| 3 | Originへ行くのはいつか | HIT、MISS、BYPASSの分岐 | ヘッダーから次に調べる場所 |
| 4 | 何をBlockすべきか | 観測→Challenge→限定Blockの段階 | いきなり広範囲Blockしない運用 |
| 6 | Private Appはどこで守るか | IdP、Access Policy、Tunnel、Originの信頼境界 | 認証前にOriginへ到達させない構成 |
| 7 | Workerに状態を置くべきか | Worker、Bindings、永続データ、外部APIの責務 | 状態をBinding側へ置く設計 |
| 8 | どのData製品を選ぶか | 要件からR2/D1/DO/KV/Queuesへの分岐 | 一製品に決め打ちしない選定 |
| 10 | Edgeが生きていれば可用か | Monitor→Pool→Origin A/Bのフェイルオーバー | Originと依存先も正常性定義へ含める |
| 11 | 障害時の最初の一手は何か | Client→Header→Edge→Worker→Originの切り分け | 設定変更前に観測事実を集める |
| 13 | 完成構成で何を検証するか | Public/Admin経路、Data、非同期処理、観測の接続 | 構築・観測・復旧を同じ構成で試す |

## 共通の制作条件

- 1図につき、主張は1つだけにする。
- 本文幅では16px相当未満の文字を置かない。
- 分岐には条件、境界には「何を通してよいか」を必ず書く。
- モバイルでは縦に再配置する。全体を縮小して読ませない。
- Presentation imageは全体像の導入だけに使い、設計条件・手順・分岐を画像内に詰め込まない。
