# AWS CDK CloudFront

このプロジェクトは、AWS CDKを使用してCloudFrontディストリビューションをデプロイするためのインフラストラクチャコードです。S3バケットやApplication Load Balancer（ALB）などの異なるオリジンタイプをサポートし、複数の環境（本番環境、ステージング環境など）に対応しています。

## 機能

- **マルチ環境対応**: 本番環境とステージング環境の設定を`cdk.json`で管理
- **カスタムドメイン**: 複数のドメイン名をサポート
- **SSL/TLS証明書**: ACM証明書の統合
- **複数オリジンタイプ**:
  - S3バケット（Origin Access Control付き）
  - Application Load Balancer（ALB）
- **パスベースのビヘイビア**: 特定のパスパターンに対して異なるオリジンを設定可能
- **アクセスログ**: S3バケットへのアクセスログ記録
- **Origin Shield**: リージョン指定によるOrigin Shieldサポート
- **HTTP/2およびHTTP/3**: 最新のHTTPプロトコルをサポート
- **セキュリティ設定**: HTTPSへのリダイレクト、CORSサポートなど

## 前提条件

- Node.js (v14以上)
- npm (v6以上)
- AWS CLI (設定済み)
- AWS CDK (v2.178.1以上)

## インストール方法

```bash
# リポジトリをクローン
git clone [リポジトリURL]
cd aws-cdk-cloudfront

# 依存関係のインストール
npm install
```

## 設定方法

このプロジェクトの設定は`cdk.json`ファイルの`context`セクションで管理されています。各環境（production、stagingなど）ごとに以下のパラメータを設定できます：

| パラメータ | 説明 |
|------------|------|
| ResourceName | リソース名（スタック名の一部として使用） |
| DomainNames | CloudFrontディストリビューションのドメイン名の配列 |
| CertificateArn | ACM証明書のARN |
| DefaultOrigin | デフォルトオリジンのドメイン名またはバケット名 |
| DefaultOriginType | デフォルトオリジンのタイプ（"S3"または"ALB"） |
| DefaultOriginRegion | デフォルトオリジンのリージョン |
| AddBehaviors | 追加ビヘイビアの配列（パスパターンごとに異なるオリジン設定） |
| LogBucket | アクセスログを保存するS3バケット名 |
| LogFilePrefix | ログファイルのプレフィックス |
| Description | ディストリビューションの説明 |

### 新しい環境の追加方法

新しい環境を追加するには、`cdk.json`の`context`セクションに新しい環境設定を追加します：

```json
"context": {
  "新環境名": {
    "ResourceName": "環境名",
    "DomainNames": ["example.com"],
    "CertificateArn": "arn:aws:acm:us-east-1:xxxxxxxxxxxx:certificate/xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "DefaultOrigin": "origin.example.com",
    "DefaultOriginType": "ALB",
    "DefaultOriginRegion": "ap-northeast-1",
    "AddBehaviors": [
      {
        "Name": "S3Download",
        "Type": "S3",
        "pathPattern": "/download/*",
        "Origin": "example-download-bucket",
        "Region": "us-east-1"
      }
    ],
    "LogBucket": "cloudfront-log-example",
    "LogFilePrefix": "example.com",
    "Description": "Example CloudFront Distribution"
  }
}
```

## デプロイ方法

環境変数`CDK_ENV`を使用して、デプロイする環境を指定します。指定がない場合は、デフォルトで`production`環境が使用されます。

```bash
# 本番環境へのデプロイ
npm run build
CDK_ENV=production npx cdk deploy

# ステージング環境へのデプロイ
npm run build
CDK_ENV=staging npx cdk deploy

# デプロイ前の変更確認
CDK_ENV=production npx cdk diff
```

## アーキテクチャ

このプロジェクトは以下のAWSリソースを作成します：

1. **CloudFrontディストリビューション**:
   - カスタムドメイン名とACM証明書を使用
   - デフォルトビヘイビアと追加ビヘイビアを設定
   - HTTP/2およびHTTP/3をサポート

2. **オリジン**:
   - S3バケット（Origin Access Controlを使用）
   - Application Load Balancer（HTTPS接続）

3. **ログ用S3バケット**:
   - CloudFrontアクセスログを保存
   - 本番環境では削除保護を有効化

```
┌─────────────────┐     ┌───────────────────┐     ┌───────────────┐
│                 │     │                   │     │               │
│  ユーザー        │────▶│  CloudFront       │────▶│  オリジン      │
│                 │     │  Distribution     │     │  (S3/ALB)     │
└─────────────────┘     └───────────────────┘     └───────────────┘
                               │
                               ▼
                        ┌───────────────────┐
                        │                   │
                        │  ログ用S3バケット   │
                        │                   │
                        └───────────────────┘
```

## セキュリティに関する考慮事項

- **HTTPS強制**: すべてのHTTPリクエストはHTTPSにリダイレクトされます
- **Origin Shield**: オリジンへのリクエスト集約によるセキュリティ強化
- **S3オリジンアクセス制御**: S3バケットへの直接アクセスを防止
- **環境分離**: 本番環境とステージング環境のリソースは完全に分離
- **ログ記録**: すべてのアクセスはS3バケットに記録

## 開発方法

```bash
# TypeScriptのコンパイル（ウォッチモード）
npm run watch

# テストの実行
npm test
```

## 注意事項

- CloudFrontディストリビューションは`us-east-1`リージョンにデプロイされます（ACM証明書の要件）
- 本番環境のログバケットは削除保護が有効になっています
- 環境変数`CDK_DEFAULT_ACCOUNT`が設定されていない場合は、デフォルトのAWSアカウントが使用されます
