import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { CdkDynamodbStack } from '../lib/cdk-dynamodb-stack';

describe('CdkDynamodbStack', () => {
  let template: Template;
  let stack: CdkDynamodbStack;
  const tableName = 'export-owner-system-csvlog';

  beforeAll(() => {
    const app = new cdk.App();
    stack = new CdkDynamodbStack(app, 'TestDynamodbStack', {
      env: {
        account: '123456789012', // テスト用のダミーアカウント
        region: 'us-east-1'      // テスト用のダミーリージョン
      }
    });
    template = Template.fromStack(stack);
  });

  describe('DynamoDB Table', () => {
    it('テーブルが正しく作成されること', () => {
      template.resourceCountIs('AWS::DynamoDB::Table', 1);
    });

    it('テーブルが適切なプロパティで設定されていること', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: tableName,
        KeySchema: [
          {
            AttributeName: 'csv_id',
            KeyType: 'HASH'
          },
          {
            AttributeName: 'num',
            KeyType: 'RANGE'
          }
        ],
        AttributeDefinitions: [
          {
            AttributeName: 'csv_id',
            AttributeType: 'S'
          },
          {
            AttributeName: 'num',
            AttributeType: 'N'
          }
        ],
        BillingMode: 'PAY_PER_REQUEST',
        TimeToLiveSpecification: {
          AttributeName: 'ttl',
          Enabled: true
        },
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true
        }
      });
    });

    it('テーブルの削除ポリシーが正しく設定されていること', () => {
      template.hasResource('AWS::DynamoDB::Table', {
        UpdateReplacePolicy: 'Delete',
        DeletionPolicy: 'Delete'
      });
    });
  });

  describe('スタック出力', () => {
    it('テーブル名とARNの出力が存在すること', () => {
      // すべての出力を取得
      const allOutputs = template.findOutputs('*');
      
      // 少なくとも2つの出力があることを確認
      expect(Object.keys(allOutputs).length).toBeGreaterThanOrEqual(2);
      
      // DynamoDBテーブルの名前を説明に持つ出力があることを確認
      let hasTableNameOutput = false;
      let hasTableArnOutput = false;
      
      for (const key in allOutputs) {
        if (allOutputs[key].Description === 'DynamoDBテーブルの名前') {
          hasTableNameOutput = true;
          expect(allOutputs[key].Value).toHaveProperty('Ref');
        } else if (allOutputs[key].Description === 'DynamoDBテーブルのARN') {
          hasTableArnOutput = true;
          expect(allOutputs[key].Value).toHaveProperty('Fn::GetAtt');
        }
      }
      
      expect(hasTableNameOutput).toBe(true);
      expect(hasTableArnOutput).toBe(true);
    });
  });
});
