# ちいさな花火大会

3〜4歳向けのタッチで遊ぶ花火ゲーム。Android Chromeの横画面が基本です。

## ローカルで遊ぶ

Python 3で `python -m http.server 8000` を実行し、 http://localhost:8000 を開きます。ビルドや依存パッケージは不要です。

## 公開

GitHubの Settings → Pages → Source を GitHub Actions に設定し、mainブランチへpushすると、付属のワークフローがテスト後に公開します。公開対象はHTML・CSS・JavaScriptとassetsのみです。すべてのアセットは相対パスで参照しています。

## 自動テスト

`node tests/game.test.mjs` で特別演出の反復、連打上限、端の形状、観客入力、非表示・回転時の停止を確認できます。

## 操作

「はじめる」で音声を開始し、空をタッチして花火を打ち上げます。観客席をタッチすると動物が跳ねます。15発ごとに特別演出が始まります。右上のボタンで消音します。

## 構成

- index.html / style.css : 画面とレイアウト
- game.js : Canvas描画、入力、演出、Web Audio
- assets/ : 同梱SVG（背景、動物、アイコン）

外部通信、広告、解析、アカウント、データ収集はありません。

## 実機確認

Android Chromeで、音の聞こえ方、複数指入力、回転、画面ロックからの復帰、持続的な30fps以上を確認してください。PC上の検証では実機の音量や性能を保証できません。
