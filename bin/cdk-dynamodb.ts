#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkDynamoDBStack } from '../lib/cdk-dynamodb-stack';

const app = new cdk.App();

new CdkDynamoDBStack(app, 'CdkDynamoDBStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  }
});
