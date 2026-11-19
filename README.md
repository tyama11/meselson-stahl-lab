# メセルソンとスタールの実験ラボ

DNAの複製様式（保存的複製・半保存的複製・分散的複製）を生徒自身が操作しながらモデル化し、塩化セシウム密度勾配遠心法によるバンドの位置と量比を比較できるインタラクティブ生物教材です。

ビルドツール不要（HTML + CSS + ネイティブ ES Modules）で構成しているため、そのまま **GitHub Pages** で公開できます。

## ファイル構成

```text
meselson-stahl-lab/
├── index.html          # メインHTML
├── .nojekyll           # GitHub PagesでのJekyll処理を無効化
├── css/
│   └── style.css       # アニメーション・カスタムスタイル
└── js/
    ├── config.js       # 生物定数・仮説メタデータ・密度階層定義
    ├── model.js        # 純粋な生物シミュレーションモデル（DOM非依存）
    ├── store.js        # 単一状態ストア・タイマー管理
    ├── centrifuge.js   # 試験管内パーティクル・比例バンド描画
    ├── labView.js      # DNAカード・ラボUI・比較モーダル描画
    ├── gestures.js     # ドラッグ分離・ハサミ切りジェスチャー制御
    └── main.js         # アプリケーション制御・イベント委譲
```

## ローカルでの動作確認

ES Modules（`type="module"`）を使用しているため、ローカルでは簡易HTTPサーバー経由で開いてください（`file://` 直開きではCORS制限がかかります）。

```bash
python3 -m http.server 8000
# ブラウザで http://localhost:8000 を開く
```

## GitHub Pages への公開手順

### 方法1: GitHub CLI (`gh`) で公開する

```bash
cd meselson-stahl-lab
gh repo create meselson-stahl-lab --public --source=. --remote=origin --push
gh api -X POST repos/{owner}/meselson-stahl-lab/pages \
  -f source[branch]=main -f source[path]=/
```

### 方法2: GitHub の画面から公開する

1. GitHub で新しい公開リポジトリ（例: `meselson-stahl-lab`）を作成し、このフォルダの中身を `main` ブランチにプッシュする。
2. リポジトリの **Settings** → **Pages** を開く。
3. **Build and deployment** の **Source** を `Deploy from a branch`、**Branch** を `main` / `/ (root)` にして **Save** をクリックする。
4. 数十秒〜1分ほどで `https://<ユーザー名>.github.io/meselson-stahl-lab/` に公開されます。
