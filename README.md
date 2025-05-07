# AWS CDK DynamoDB

このプロジェクトは、AWS CDKを使用してDynamoDBテーブルを作成するためのフレームワークを提供します。再利用可能なコンストラクトを使用することで、複数のDynamoDBテーブルを簡単かつ一貫した方法で定義できます。

## 機能

- 再利用可能なResourcesコンストラクトによるDynamoDBテーブル作成
- 型安全な設定インターフェース
- オプション項目の柔軟な設定
- ポイントインタイムリカバリ、TTL、削除ポリシーなどの設定サポート
- グローバルセカンダリインデックス（GSI）の完全サポート
- スタック出力としてテーブル名とARNの自動提供

## 前提条件

- Node.js (バージョン14.x以上)
- AWS CLI (設定済み)
- AWS CDK CLI (バージョン2.x)

## インストール

```bash
# クローン後にディレクトリに移動
cd aws-cdk-dynamodb

# 依存関係のインストール
npm install

# TypeScriptコンパイル
npm run build
```

## 使用方法

### 基本的な使用方法

このプロジェクトでは、`Resources`コンストラクトを使用してDynamoDBテーブルを作成します。テーブル設定はTypeScriptのインターフェースで型安全に定義されています。

```typescript
// lib/cdk-dynamodb-stack.ts
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Resources } from './cdk-dynamodb-resources';

export class CdkDynamoDBStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
      
    // テーブルの作成
    new Resources(this, 'example', {
      TableName: 'example-table',
      PartitionKey: 'id',
      PartitionKeyType: 'string',
      SortKey: 'date',
      SortKeyType: 'number',
      TTL: 'ttl',
      // GSIを追加
      GlobalSecondaryIndexes: [
        {
          IndexName: 'UserIndex',
          PartitionKey: 'user_id',
          PartitionKeyType: 'string',
          SortKey: 'created_at',
          SortKeyType: 'string',
        },
      ],
      Removal: true,  // テスト環境ではtrue、本番環境ではfalseにする
    });
  }
}
```

### 設定オプション

`Resources`コンストラクトは以下の設定オプションをサポートしています：

| オプション | 型 | 必須 | 説明 |
|------------|-------|----------|-------------|
| TableName | string | はい | DynamoDBテーブルの名前 |
| PartitionKey | string | はい | パーティションキー（ハッシュキー）の属性名 |
| PartitionKeyType | 'string'\|'number' | はい | パーティションキーの型 |
| SortKey | string | いいえ | ソートキー（レンジキー）の属性名 |
| SortKeyType | string | いいえ | ソートキーの型（'string'または'number'） |
| TTL | string | いいえ | TTL（有効期限）として使用する属性名 |
| Removal | boolean | いいえ | テーブル削除ポリシー（true: DESTROY、false: RETAIN） |
| GlobalSecondaryIndexes | object[] | いいえ | GSIの配列（詳細は下記参照） |

#### グローバルセカンダリインデックス（GSI）の設定

GSI設定オブジェクトの構造：

| オプション | 型 | 必須 | 説明 |
|------------|-------|----------|-------------|
| IndexName | string | はい | インデックスの名前 |
| PartitionKey | string | はい | インデックスのパーティションキー属性名 |
| PartitionKeyType | 'string'\|'number' | はい | インデックスのパーティションキーの型 |
| SortKey | string | いいえ | インデックスのソートキー属性名 |
| SortKeyType | 'string'\|'number' | いいえ | インデックスのソートキーの型 |
| ProjectionType | 'ALL'\|'KEYS_ONLY'\|'INCLUDE' | いいえ | インデックスの射影タイプ（デフォルト: 'ALL'） |
| NonKeyAttributes | string[] | いいえ | ProjectionTypeが'INCLUDE'の場合に含める属性の配列 |

## デプロイ

```bash
# CDKのブートストラップ（初回のみ）
npm run cdk bootstrap

# スタックの合成（CloudFormationテンプレートの生成）
npm run cdk synth

# デプロイ
npm run cdk deploy
```

## コード構造

- `bin/cdk-dynamodb.ts` - CDKアプリケーションのエントリポイント
- `lib/cdk-dynamodb-stack.ts` - メインCDKスタック定義
- `lib/cdk-dynamodb-resources.ts` - 再利用可能なDynamoDBリソースコンストラクト
- `test/` - テストコード

## 特記事項

- すべてのテーブルでポイントインタイムリカバリが有効化されています
- オンデマンドキャパシティモードがデフォルトで使用されます
- テスト環境と本番環境で異なる削除ポリシーを設定できます
- GSIのプロジェクションタイプはデフォルトで'ALL'に設定されています

## テスト

```bash
npm test
```

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
