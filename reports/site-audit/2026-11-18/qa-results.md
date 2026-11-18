# 検証結果の詳細（SuguTsucool）

## 検証環境と安全対策

- ブラウザ: Playwright 1.65.0 / Chromium（ヘッドレス）。375×812 / 768×1024 / 1440×900。Claude in Chrome 拡張が未接続だったための代替です。
- 計測: `navigator.webdriver`・除外 Cookie・収集エンドポイントの模擬応答で、本番計測への書き込みは 0 件。
- 広告: `px.a8.net` / `hb.afl.rakuten.co.jp` への通信は遮断。実トラッキング URL への到達は 0 件。商品画像（`thumbnail.image.rakuten.co.jp`）のみ表示確認のため許可しました。
- 各ツールの操作確認は、リポジトリにある既存の QA スクリプト（ツールごとにサンプル入力して結果を確認するもの）を本番に対して実行しました。

## 1. 全ページ監査（本番）

| 項目 | 結果 |
|---|---|
| サイトマップ | 260 URL（ツール 150・ガイド 100・その他）。全件 200・canonical 一致・noindex なし |
| 全ページ表示（520 回） | HTTP エラー 0、横スクロール 0、画像切れ 0、未捕捉の JS エラー 0 |
| 自サイト API のエラー | 1 件（`/api/rakuten?tool=pdf/merge` が 502。再現せず） |
| 本番と main の一致 | 38/39 |

## 2. 既存 QA スクリプトの実行（本番・読み取りのみ）

| スクリプト | 結果 |
|---|---|
| `qa-live`（110 ツール、PC・スマホ） | 失敗 0 |
| `qa-extra-40`（追加 40 ツール） | 失敗 0 |
| ガイド QA（100 本・113 項目） | 失敗 0 |
| `qa-seo-admin`（robots・サイトマップ・ホーム・GSC 取り込み画面） | 合格 |
| `scripts/test-revenue-api.mjs`（今回 1 テスト追加） | 合格 |

## 3. 楽天商品カードの関連性

修正前（本番 API）: `calculator/unit-length` と `calculator/temperature` の検索語が広く、ツールと関係の薄い商品が含まれていました。

修正後（本番 API）:

| ツール | 検索語 | 返却商品（例） |
|---|---|---|
| `calculator/unit-length` | コンベックス メジャー | メジャー・コンベックス 4 件 |
| `calculator/temperature` | 温湿度計 デジタル | デジタル温湿度計 4 件 |
| `calculator/unit-weight` | デジタルスケール | はかり 4 件 |
| `calculator/bmi` / `ideal-weight` | 体重計 | 体重計 4 件 |
| `calculator/pace` | ランニングウォッチ | 4 件 |
| `calculator/electricity-cost` | ワットチェッカー | 4 件 |
| `image/to-pdf` / `pdf/merge` / `pdf/reorder` | ドキュメントスキャナー | 4 件 |
| `image/compress` / `text/character-count` | （商品なしの設定） | 非表示 |

修正後の画面は [screenshots/](screenshots/) の `after-unit-length-*` と `after-temperature-*`（375/768/1440px）です。

## 4. 広告 CTA の模擬クリック

代表ページを 2 画面幅で開き、表示されている広告リンク 36 件をクリックして、すべて新規タブで開き URL が改変されず模擬ページに到達しました（`rel` に sponsored と nofollow）。お名前.com と楽天市場の公式ページは、トラッキング URL を使わず直接開いて 200 を確認しました。

## 5. GitHub Actions

| コミット | ワークフロー | 結果 |
|---|---|---|
| `c958531` | Deploy SuguTsucool to Cloudflare Pages（run 44337480186） | 成功 |
| `c958531` | Verify Rakuten affiliate API（run 44337480153） | 成功 |
| `c958531` | Check SuguTsucool Rakuten Cloudflare Secrets（run 44337480165） | 成功 |
| `c958531` | Verify SuguTsucool 150-tool catalog（run 44337595805） | 成功 |
| `60b15b4`（定期） | Live QA - all 150 tools + 100 guides（run 42737116096、43998927249） | **失敗**（今回の変更前から。原因未確認） |
| `60b15b4`（定期） | Lighthouse performance audit | 成功 |

## 6. Functions の停止

2026-11-18 17:30 UTC ごろから `/api/rakuten` が一時的に応答しない状態になりました（復旧見込み: 2026-11-19 09:00 JST ごろ）。上記の結果はそれ以前に取得したものです。復旧後に商品カードの表示を 1 ページだけ再確認すれば足ります。経緯はオーナー向けの全体報告に記載しています。
