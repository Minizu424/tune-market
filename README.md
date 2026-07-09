# Tune Market 🎵📈

音楽制作と株式市場の仕組みを組み合わせた楽曲応援プラットフォーム（情報システムデザイン課題 / MVP実装）。

アーティストが投稿した楽曲を「銘柄」として扱い、ユーザーはポイントで楽曲株を購入・売却したり、アーティストや楽曲を応援したりできます。

> ⚠️ 本アプリの「株」はゲーム内の仕組みであり、実際の金融商品ではありません。ポイント・株は現金化できず、配当・所有権・議決権は発生しません。

## 主な機能

**一般ユーザー**
- ユーザー登録・ログイン（登録時に100pt付与）
- ホーム（急上昇銘柄・新規上場曲・週間応援ランキング）
- 楽曲一覧（検索・ジャンル絞り込み）／楽曲詳細（価格チャート・試聴・制作進捗）
- 楽曲株の購入・売却（端数購入対応）
- ポートフォリオ（総資産・評価損益・本日の増減）
- 応援ポイント送信（週間ランキングに反映）
- ランキング（週間応援／急上昇／新規）

**アーティスト**
- アーティスト登録（登録するとrole が artist に変更）
- 楽曲投稿（音源・ジャケットのStorageアップロード対応、初期価格100pt固定）
- 制作者ダッシュボード(今週の応援pt・ランキング順位・投稿楽曲の集計)
- 楽曲編集・制作進捗更新(進捗履歴つき)

## セットアップ

1. 依存パッケージをインストール

   ```bash
   npm install
   npx expo install expo-image-picker expo-document-picker
   ```

2. Firebase の設定
   - Authentication で「メール / パスワード」を有効化
   - Firestore Database を作成
   - Storage を有効化(楽曲投稿のアップロードに使用)
   - 設定値は `src/lib/firebase.ts` に記載済み
   - セキュリティルールは `firestore.rules` を参照

3. テストデータの投入(Night Drive など8曲+価格履歴)

   ```bash
   node scripts/seed-songs.mjs
   ```

4. アプリの起動

   ```bash
   npx expo start
   ```

## 株価の更新

MVPでは株価は1日1回のバッチ更新想定ですが、開発用としてマイページの「株価を更新する」ボタンから手動実行できます。
再生数・いいね数・保存数・コメント数・保有者数(+影響度小さめの応援pt)をもとに再計算され、`priceHistories` に履歴が保存されます。

## ディレクトリ構成

```text
src/
  app/            画面（expo-router によるファイルベースルーティング）
    index.tsx         ログイン / 新規登録
    home.tsx          ホーム
    songs/            楽曲一覧・楽曲詳細
    portfolio.tsx     ポートフォリオ
    ranking.tsx       ランキング
    mypage.tsx        マイページ
    artist/           アーティスト登録・ダッシュボード・楽曲投稿/編集/進捗
  components/     共通UI・モーダル（購入/売却/応援）
  constants/      配色・ジャンル定義
  hooks/          認証フックなど
  lib/            Firebase初期化・Storageアップロード・フォーマッタ
  repositories/   Firestoreの読み書き（コレクション単位）
  services/       購入・売却・応援・集計などのビジネスロジック
  types/          Firestoreデータの型定義
scripts/          テストデータ投入スクリプト
firestore.rules   Firestoreセキュリティルール
```

## Firestore コレクション

| コレクション | 内容 |
|---|---|
| users | ユーザー情報・ポイント残高 |
| artists | アーティスト情報・応援ポイント |
| songs | 楽曲（銘柄）情報・現在価格・Stats |
| holdings | 保有株（`{userId}_{songId}` をIDに使用） |
| transactions | 売買履歴 |
| supports | 応援履歴 |
| priceHistories | 価格履歴（チャート表示に使用） |
| progressUpdates | 制作進捗の更新履歴 |
