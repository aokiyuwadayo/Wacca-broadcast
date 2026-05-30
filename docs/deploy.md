# デプロイ手順（Vercel）

> Phase A はステートレス（メモ→生成→コピペ）なので **Supabase 無しでデプロイできる**。
> これで「どの PC・スマホでも URL を開くだけ」で使えるようになる。
> ⚠️ 会社 PC ではやらない（個人 Vercel ログイン＋個人 API キーが絡むため）。**個人 PC・個人アカウント**で行う。

## 前提
- 生成品質ゲート（`docs/status-*.md` 参照）を **通過済み**であること（未検証の生成器を配らない）。
- 個人の Anthropic API キー（課金が個人アカウントに行く）。
- 個人の Vercel アカウント（GitHub 連携でログイン）。

## 手順

1. **Vercel にログイン**（https://vercel.com）— GitHub アカウントでサインイン。
2. **「Add New… → Project」** → `aokiyuwadayo/yuwa-broadcast` を Import。
3. フレームワークは **Next.js** が自動検出される。設定はそのままでよい。
4. **Environment Variables** に以下を登録：
   | Key | Value | 必須 |
   |---|---|---|
   | `ANTHROPIC_API_KEY` | 個人の `sk-ant-...` | ✅ |
   | `ANTHROPIC_MODEL` | `claude-sonnet-4-6`（任意・既定でも可） | – |
   | `SITE_PASSWORD` | 合言葉（運営で共有する任意の文字列） | ✅ 強く推奨 |
5. **Deploy** を押す → 数十秒で `https://yuwa-broadcast-xxxx.vercel.app` が発行される。
6. その URL を開く → **Basic 認証のダイアログ**が出る。ユーザー名は何でもよく、パスワードに `SITE_PASSWORD` の値を入れると入れる。
7. スマホはその URL を開いて「ホーム画面に追加」すればアプリのように使える（PWA 的）。

## 注意・コスト
- `SITE_PASSWORD` を設定しないと **URL を知る誰でも生成でき、個人 API キーに課金が乗る**。公開時は必ず設定する。
- 料金感：Sonnet で 1 本あたり数円〜数十円（`docs/design-doc.md` §12）。Vercel Hobby は非商用なら無料。
  - ⚠️ 他サークルに「配る／会費を取る／寄付を募る」となると Vercel 上は商用扱い → Vercel Pro（$20/月）が必要になる点に注意。
- Supabase（保存・履歴・運営別設定・本格認証）は Phase B の後半。必要になってから。

## ローカルとの違い
- ローカル開発では `SITE_PASSWORD` 未設定でよい（パスワードなしで素通り）。
- 本番（Vercel）でのみ `SITE_PASSWORD` を設定して保護する、という運用。
