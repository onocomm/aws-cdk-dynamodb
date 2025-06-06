import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Resources } from './cdk-dynamodb-resources';

export class CdkDynamoDBStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
      
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
      Removal: true,
    });

  }
}
