# Phase E 後半：認証＋複数管理者・引き継ぎ 実装プラン

> **作成日**: 2026-06-08
> **対象 Issue**: #8（文体学習は実装済み。残りは「複数管理者・引き継ぎ」）
> **状態**: 設計＋安全な土台SQL（`supabase/migrations/0001_accounts_memberships.sql`）まで。
> **認証コード本体は未実装** — 個人PC（鍵あり・Supabase設定可・実機テスト可）で進める。
>
> なぜ会社PCで書ききらないか: 認証はセキュリティのキーストーン。未テストの認証を**稼働中の本番 main**へ
> 入れるとロックアウトや `/history` 破壊のリスク。会社PCは鍵/個人ログイン/DB操作のガードレール対象。
> → 安全な「追加専用SQL」と本プランまでを会社PCで用意し、コード実装＋テストは個人PCで。

---

## ゴール（design-doc §10）
- `account`（サークル）に複数 admin。設定・テンプレ・配信先・履歴は**人ではなくサークルに紐づく**。
- 卒業で人が変わっても資産が残る。**owner 権限の移譲だけで引き継ぎ完了**。
- v1 は青木1人（owner）。まず器を用意し、2人目の管理者が要る時に活きる。

## いま入れた安全な土台（実行は個人PCで）
`supabase/migrations/0001_accounts_memberships.sql`（追加専用・非破壊・RLSは未有効化）:
- `accounts`(id, name, owner_user_id, created_at)
- `memberships`(account_id, user_id, role owner/admin, unique(account_id,user_id))
- 既存4テーブルに `account_id uuid null` を追加＋index

---

## 実装ステップ（個人PCで、PRを分けて積む）

### PR-1: 認証の導入（キーストーン）※これ単体で動かしテストしてからマージ
1. 依存追加: `npm i @supabase/ssr`（middleware/サーバでセッションを読むのに必要。現状は `@supabase/supabase-js` のみ）。
2. Supabase ダッシュボード: Authentication で **Google OAuth** か **Magic Link(Email OTP)** を有効化。まず青木のメールのみ許可。
3. コード:
   - `src/lib/supabase-browser.ts` / `supabase-ssr.ts`: `@supabase/ssr` の `createBrowserClient` / `createServerClient`。
   - `src/app/login/page.tsx`: `signInWithOAuth({ provider: 'google' })` もしくは `signInWithOtp({ email })`。
   - `src/middleware.ts`: **既存の SITE_PASSWORD 分岐は残す**。その上で `REQUIRE_AUTH=1` のときだけ
     Supabase セッションを検証し、未ログインは `/login` へ。**env 未設定なら現状どおり素通り**（非破壊・段階導入）。
   - ヘッダーに「ログアウト」。
4. テスト: ログイン→保護ページ到達、未ログイン→/login、別メールは弾く、を実機確認してからマージ。

### PR-2: account_id 紐付け（データのテナント化）※ここが /history 破壊の山場
1. 認証済みユーザーの `account_id` を解決するヘルパー（memberships から引く）。`getServerDb()` 利用箇所で
   insert/select に `account_id` を付与・絞り込み。
2. **`/history` を anon クライアント直読みから「サーバルート経由」へ移す**（重要）:
   現状 `src/app/history/page.tsx` は `getSupabase()`(anon) で `broadcasts` を直読み。
   RLS を有効化すると anon SELECT が拒否され壊れる。→ `GET /api/history`（service_role か、ユーザーセッションで
   account 絞り込み）を作り、history ページはそれを叩く形に変更。
3. backfill: 0001 SQL 末尾のコメント部を、青木の `auth.users.id` 確定後に実行し既存行へ `account_id` を付与。

### PR-3: RLS 有効化（PR-2 完了後）※別マイグレーション 0002 で
1. `alter table ... enable row level security` を accounts/memberships/settings/broadcasts/scheduled_posts/regular_schedules に。
2. ポリシー: 「自分が membership を持つ account の行だけ」read/write 可。
   - 例: `using (account_id in (select account_id from memberships where user_id = auth.uid()))`
3. **service_role は RLS をバイパス**するので cron/サーバ管理処理はそのまま動く（要確認）。
4. anon の直読みは無くなっている前提（PR-2 で /history をサーバ経由化済み）。

### PR-4: 招待・ロール・引き継ぎ UI
1. 設定に「メンバー」セクション: メールで招待（membership 追加）、ロール表示、削除。
2. **owner 移譲**: owner だけが別 admin を owner に昇格＝`accounts.owner_user_id` 付け替え＋旧 owner を admin に。
3. ガード: owner は最低1人を保証（最後の owner は降格不可）。

---

## テストチェックリスト（個人PC）
- [ ] PR-1: ログイン/ログアウト/未ログインリダイレクト/許可外メール拒否
- [ ] PR-1: `REQUIRE_AUTH` 未設定なら従来どおり素通り（段階導入が壊れていない）
- [ ] PR-2: 既存の生成→保存→/history が account 絞り込み後も正しく見える
- [ ] PR-2: `/history` が RLS 有効化後も壊れない（サーバ経由化済み）
- [ ] PR-3: 別 account のデータが見えない（RLS 効いている）／cron 系は service_role で動く
- [ ] PR-4: 招待した2人目の admin が同じ account の資産を編集できる
- [ ] PR-4: owner 移譲後、旧 owner は admin・新 owner が管理権限を持つ／最後の owner は降格不可

## ロールアウト指針
- `REQUIRE_AUTH` で**段階導入**（オフなら現状維持）。本番は PR-1〜PR-3 をテスト後にまとめてオンにする。
- 2人目の管理者が実際に必要になるまで PR-4 は後回しでよい（v1 は青木1人）。
