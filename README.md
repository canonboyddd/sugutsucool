# SuguTsucool SEO強化版

公開先: https://sugutsucool.pages.dev/

## 今回のSEO強化
- 全20ツールに固有のtitle / meta description / canonical / OGP
- 全ツールに検索意図に沿った説明文・利用例・FAQを追加
- パンくずリストのBreadcrumbList構造化データを追加
- トップにWebSite構造化データを追加
- ツールページにWebApplication構造化データを追加（架空の評価は付与していません）
- カテゴリページの説明文を強化
- 全ページの内部リンクを強化（Webカテゴリ・人気ツール）
- sitemap.xmlを検索対象ページに整理し、重要更新日のlastmodを追加
- privacy / terms / contact / 404はnoindex,follow（リンクは維持）
- Google Search Console確認ファイルを保持

## Cloudflare Pagesへの更新
1. このZIPを展開
2. Cloudflare Pagesの `sugutsucool` を開く
3. 「デプロイを作成する」から中身一式をアップロード
4. Productionへデプロイ
5. 公開後に `/sitemap.xml` と主要ツールページを確認

Search Consoleの手動インデックス申請が割り当て超過でも、サイトマップ・内部リンク・通常クロールによる発見は継続します。

## v4 追加: 運営分析
- `/admin-analytics/` 管理ダッシュボード
- 匿名アクセス解析スクリプト `/assets/analytics-track.js`
- 別ZIP `SuguTsucool_Analytics_Worker.zip` のCloudflare Worker + D1と組み合わせて使用
- Worker名の想定: `sugutsucool-analytics`
- API想定URL: `https://sugutsucool-analytics.super-canon-boy.workers.dev`
- 管理画面は noindex / nofollow
- 自分のブラウザを解析から除外するトグルあり


## v7 affiliate integration
- A8.net「お名前.com」テキスト広告をトップページと `/web/` に追加
- PR/アフィリエイト広告表示を追加
- プライバシーポリシーにアフィリエイト広告の説明を追加
