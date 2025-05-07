#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkCloudFrontStack } from '../lib/cdk-cloudfront-stack';

const envName = process.env.CDK_ENV || 'production';

const app = new cdk.App();
const config = app.node.tryGetContext(envName);

if (!config) {
  throw new Error(`Environment ${envName} is not defined in cdk.json`);
}

new CdkCloudFrontStack(app, `CdkCloudFrontStack-${config.ResourceName}`, {
  ...config,
  Stage: envName,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  }
});
