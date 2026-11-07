# SuguTsucool アフィリエイト監査・改善

確認日: 2026-11-08 JST。増収達成を示す成果データはまだない。

## 基準と既存経路

- GitHub正本: `canonboyddd/sugutsucool`。着手時の最新mainは `d213691b1845423d5a301685998d5934d752b493`。既存ディレクトリを変更せず独立cloneで作業した。
- 本番: https://sugutsucool.pages.dev/ 。着手時のCloudflare本番commitは `24eb922`。後続mainはCI/docsのみをdeploy対象外にする変更で、本番との差異を認識して監査した。
- 配信は既存 `.github/workflows/deploy-pages.yml` → Cloudflare Pages のまま。別サービスへの移行や直接デプロイはしていない。
- 既存商品API用環境変数3種を引き続き参照。楽天アフィリエイトID、A8のお名前.comリンクの既存IDを変更していない。秘密値は取得・出力していない。
- 楽天APIおよびA8リンクは既存設定を利用。ASP管理画面の最新承認状態・個別成果CSVは未取得。API成功を提携承認・成果発生の証拠とは扱わない。

## 現状と問題

|重要度|着手時の状態|修正と成果に寄与する理由|
|---|---|---|
|P1|画像圧縮に外付けSSD、文字数カウントにキーボード等。未登録ツールにもカテゴリfallbackで汎用商品を表示|明確な実物作業につながる10ツールだけを許可。ブラウザ内で完了する目的に無関係な商品を表示せず、必要な人へ絞る|
|P1|商品APIはaffiliate URL欠損時に通常商品URLを採用|HTTPSの楽天アフィリエイトURLを必須化。画像・有限の正価格も必須にし、購入先の不明なカードや成果対象でないURLを混在させない|
|P1|A8が楽天sectionの子で、楽天API失敗時に一緒に削除される|A8を独立sectionに分離。Web制作関連11ツールと関連ガイドだけに掲載し、トップの一律広告を除去。取得・更新料金・条件確認を明記|
|P1|生成ツール・ガイドの中央tracker読込がcoreと異なる|共通analyticsスクリプトからguard付きで1回読み込む。中央側を共通分析の正本として、表示→クリックの分母・分子を揃える|
|P1|独自trackerにQA/既知bot/owner/synthetic clickの除外がない|ローカル、QA query、webdriver、既知bot UA、owner、optoutを除外。二重scriptをguardし、実クリックだけを計測|
|P2|API障害時に枠を先に描画。応答timeoutがない|商品取得成功後だけ描画。API6秒/client7秒でtimeout、画像失敗はカードを除去し最後のカードならsectionを除去。ツール操作は継続|
|P2|参照元queryと例外メッセージが計測に混入し得る|参照元のquery/hashを除去、例外は種別だけを記録。ツール入力内容をイベントへ追加しない|

## 修正前後

- `/image/compress/`: 着手時は楽天SSD4リンク。変更後は広告0、ツールを優先。
- `/calculator/electricity-cost/`: 実際の消費電力測定という目的を説明し、ワットチェッカーの価格・仕様確認へ案内。商品購入なしでツールを利用できると明記。
- `/web/domain-extractor/`: 着手時は無関係な楽天4リンク+A8。変更後は独自ドメインの料金・条件確認だけ。楽天障害と独立。
- 楽天カードには販売先・現在価格の確認、送料・対応機器・在庫確認の注意を表示。レビュー件数順の検索結果をおすすめ順位と誤認させない。
- CTAに`program / placement / variant`を付加。テキストvariantは固定の`purpose-v1` / `conditions-v1`で、十分な母数のないA/B勝敗は主張しない。
- 既存150ツール、100ガイド、URL、canonical、robots、データと計算処理を維持。新しい薄いSEOページは追加していない。sourceの110表記は既存ビルドで150に置換され、実際の生成数も150であることを確認した。

## 変更ファイルとコミット

実装commit: `40bff6c74bfec51b697f55a9b82a087d7afb889d`。

- `functions/api/rakuten.js`: 検索対象の明示許可、URL/画像/価格検証、timeout、エラー詳細の非公開。
- `assets/affiliate-tools.js`: 目的別CTA、楽天とA8の独立表示、商品欠損時の撤去。
- `assets/analytics-track.js`, `assets/site.js`: 全ページ共通の中央tracker読込、独自計測の除外・二重防止・データ最小化。
- `index.html`: 一般トップのドメイン広告を撤去。
- `.github/workflows/deploy-pages.yml`: API境界テストを追加、監査レポートを公開成果物から除外。
- `.github/workflows/verify-rakuten.yml`: 関連性がある電気料金計算でAPI正常系を検証し、画像圧縮では広告非表示を別途厳密に検証。
- `scripts/qa-safety.mjs`と既存QA4スクリプト: 広告・計測通信の遮断。guides/adminのviewport optionをPlaywright仕様に修正し、本当にmobile幅で確認。終了前の通信待機も追加。
- `scripts/test-revenue-api.mjs`, `scripts/qa-revenue-browser.cjs`, `scripts/qa-revenue-events.cjs`, `scripts/build-local.mjs`, `.gitignore`: 再現可能なローカルビルド、安全な機能・境界・イベントQA。

## 検証

`reports/evidence/revenue/` にJSON結果と変更前後のスクリーンショットを保存。

|検証|結果・範囲|
|---|---|
|既存ビルド全工程|成功。150ツール、100ガイド+ガイドindex、sitemap260 URL。canonical/noindex/robots/重複/対象ファイル存在を既存verifyで確認|
|既存110ツールQA|desktop/mobile220画面、画像圧縮実行・PDF結合・QR生成・勤務時間・文字操作・JWT・返済計算・JSON→CSVの8機能、失敗0|
|既存追加40ツールQA|desktop/mobile80画面、失敗0|
|SEO/admin|4チェック合格。公開150カード、robots、sitemap、管理noindex、GSC import UI|
|既存ガイドQA|100ガイド、desktop/mobile計113画面、失敗0|
|API境界|4テスト合格。無関係toolは上流通信0、設定不足/invalid、ID維持、通常URL/欠損画像/不正価格の除外、429/不正JSON/通信失敗|
|イベント隔離QA|5条件合格。重複scriptでもPV1、合成click0、実click1。qa/ops_qa/bot/ownerはイベント0。全ネットワークをローカル応答に置換|
|実画面|3主要ページ×375/768/1440px、before本番9枚、afterローカル9枚。横overflow・JS例外0。afterの楽天商品は表示検証用mockであり、販売成果の証拠ではない|
|広告障害とツール継続|API502、空商品、画像404の3条件で壊れた広告枠0。1000W×2h×31円/kWh=2kWh/62円の計算を維持|
|構文・差分|変更JS/QAのnode --checkとgit diff --check成功|

テスト中のASPリンク遷移・申込・購入は行っていない。広告・collector通信はnavigation前に遮断。画像やAPI取得を実クリックとして記録させていない。旧テストの削除や合格基準の引下げはない。

追加した障害テストの初回は金額表示を`62.00円`と仮定して失敗した。既存実装のIntl表示が末尾小数を省くことを確認し、期待値を既存仕様の全文`使用電力量: 2 kWh / 電気代の目安: 62円`に修正して厳密一致で再検証した。guidesのlocal proxy初回はpage closeと未完了favicon fetchが競合し、終了前にroute完了を待つことで修正した。

## 本番確認と残る確認

着手時の読み取り確認ではトップ、robots、sitemapはHTTP200。`/api/rakuten?tool=image%2Fcompress`はHTTP200で無関係なSSD4件、`tool=calculator%2Felectricity-cost`もHTTP200で電力量計4件を返した。API認証・affiliate URLの生成が動作していることは確認できた。ASP側へクリックして有効性を確認する操作は、成果・クリック汚染を避けるため実施していない。

本レポート作成時点ではローカル検証済み・実装commit作成済みで、mainへのpushと本番反映は親作業でレビュー後に実施する。反映後にGitHub Actions結果、Cloudflare配信commit、非対象toolのdisabled応答、対象toolの有効商品、更新assetsのhash、画面を確認して記録を追記する。

既存Actionsは2026-11-03のLive QA `41557231667`成功。Lighthouse `41558799975`は変更前から失敗しており、home TBT1046.5msが600ms基準を超過（performance0.77 / accessibility0.93 / SEO1、console/contrast指摘もあり）。今回変更後のLighthouse再実測が必要で、未実測の改善値は記載しない。基準は維持した。

## 数値、共通計測、効果の検証条件

- 中央DBの着手時過去30日rawにはpage_view2、session2があった（親監査取得）。過去rawは実ユーザーと確認できないため実ユーザーPVとして採用しない。ASP/GSC取込は未取得であり、収益0円という意味ではない。
- 共通分析は中央collectorを正本とする。独自analytics workerは既存のツール操作分析として維持し、同じPV/clickを中央と合算しない。表示イベントとクリックイベント、到達sessionとclick sessionを別集計する。
- 可視CTA表示・セッション・端末・日付・ページ・program・placement・variantで比較する。中央trackerの可視時間/QAフィルタの変更はfactoryリポジトリ側と連携する。本リポジトリで中央DBの履歴やschemaを変更していない。
- UA/webdriver除外は既知の自動操作に有効だが、人間であることを完全には保証しない。新しいボット挙動はサーバ側スクリーニングと合わせて調査し、過去rawを後付けで有効ユーザーへ分類しない。
- CTRは同じCTA/program/placement/variantの可視表示を分母とし、実クリックを分子にする。ASP発生・確定報酬はASP CSVを取得して別管理する。PVやクリックを成果や確定報酬に換算しない。
- まず有効表示・click sessionがたまるまで観測する。変更前データの計測欠陥を考慮し、単純なraw CTRの前後比較を成功判定にしない。母数・期間・端末構成・検索流入を揃え、ASP発生・承認率・確定報酬まで確認する。
- 現時点の残項目は、ASP最新承認/成果CSV、GSC検索実績、配信後QA、Lighthouse再実測、中央tracker反映後の実データ到達確認。必要なASP設定を推測で追加せず、未承認案件や新IDは作成していない。
