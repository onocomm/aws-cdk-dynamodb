#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkDynamodbStack } from '../lib/cdk-dynamodb-stack';

const app = new cdk.App();

new CdkDynamodbStack(app, 'CdkDynamodbStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  }
});
