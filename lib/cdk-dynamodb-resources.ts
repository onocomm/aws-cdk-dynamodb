import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface ResourcesProps {
  TableName: string;
  PartitionKey: string;
  PartitionKeyType: 'string'|'number';
  SortKey?: string;
  SortKeyType?: string;
  TTL?: string;
  Removal?: boolean;
}

export class Resources extends Construct {
  constructor(scope: Construct, id: string, props: ResourcesProps) {
    super(scope, id);

    // ✅ プロパティを取得
    const {
      TableName,
      PartitionKey,
      PartitionKeyType,
      SortKey,
      SortKeyType,
      TTL,
      Removal,
    } = props;

    const KeyTypes: Record<string, dynamodb.AttributeType> = {
      string: dynamodb.AttributeType.STRING,
      number: dynamodb.AttributeType.NUMBER,
    };

    // DynamoDBテーブルの作成
    const table = new dynamodb.Table(this, `${TableName}Table`, {
      tableName: TableName,
      
      // キー構成
      partitionKey: { name: PartitionKey, type: KeyTypes[PartitionKeyType] },
      ...((SortKey && SortKeyType) ? {sortKey: { name: SortKey, type: KeyTypes[SortKeyType] }} : {}),
      
      // オンデマンドキャパシティモード
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      
      // TTL設定
      ...( TTL ? {timeToLiveAttribute: TTL} : {}),
      
      // ポイントインタイムリカバリを有効化
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      },
      
      // 削除ポリシー：テスト環境用に削除を許可
      ...(Removal?
        {removalPolicy: RemovalPolicy.DESTROY}
        :
        {removalPolicy: RemovalPolicy.RETAIN}
      ),
      
    });

    // 出力
    new CfnOutput(this, `${TableName}TableName`, {
      value: table.tableName,
      description: 'DynamoDBテーブルの名前',
    });
    
    new CfnOutput(this, `${TableName}TableArn`, {
      value: table.tableArn,
      description: 'DynamoDBテーブルのARN',
    });

  }
}
