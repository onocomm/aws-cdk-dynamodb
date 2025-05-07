import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as CdkCloudFront from '../lib/cdk-cloudfront-stack';

describe('CdkCloudFrontStack', () => {
  let template: Template;
  let stack: CdkCloudFront.CdkCloudFrontStack;
  const testProps = {
    Stage: 'test',
    DomainNames: ['example.com', 'www.example.com'],
    CertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/dummy-certificate-id',
    DefaultOrigin: 'dummy-origin.example.com',
    DefaultOriginType: 'ALB',
    DefaultOriginRegion: 'ap-northeast-1',
    AddBehaviors: [
      { 
        Name: 'StaticAssets', 
        Type: 'S3',
        pathPattern: '/static/*',
        Origin: 'dummy-static-bucket',
        Region: 'us-east-1'
      }
    ],
    LogBucket: 'dummy-log-bucket-12345',
    LogFilePrefix: 'cloudfront-logs/',
    Description: 'Test CloudFront Distribution',
    env: {
      account: '123456789012', // テスト用のダミーアカウント
      region: 'us-east-1'      // テスト用のダミーリージョン
    }
  };

  beforeAll(() => {
    const app = new cdk.App();
    // WHEN
    stack = new CdkCloudFront.CdkCloudFrontStack(app, 'MyTestStack', testProps);
    // THEN
    template = Template.fromStack(stack);
  });

  describe('Log Bucket', () => {
    it('should create an S3 bucket for logs with correct properties', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: testProps.LogBucket,
        AccessControl: 'LogDeliveryWrite',
        // RemovalPolicy は Template.fromStack では検証できない場合がある
      });
      // RemovalPolicy の検証 (UpdateReplacePolicy は検証可能)
      template.hasResource('AWS::S3::Bucket', {
        UpdateReplacePolicy: 'Delete',
        DeletionPolicy: 'Delete',
      });
    });
  });

  describe('CloudFront Distribution', () => {
    it('should create a CloudFront distribution with correct basic configuration', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          Comment: testProps.Description,
          Enabled: true,
          HttpVersion: 'http2and3',
          PriceClass: 'PriceClass_All',
          Aliases: testProps.DomainNames,
          ViewerCertificate: {
            AcmCertificateArn: testProps.CertificateArn,
            SslSupportMethod: 'sni-only', // CDKのデフォルト
          },
          Logging: {
            Bucket: {
              'Fn::GetAtt': [
                Match.stringLikeRegexp('LogBucket'), // LogBucketの論理ID (CDKが生成)
                'RegionalDomainName'
              ]
            },
            Prefix: testProps.LogFilePrefix,
          },
        })
      });
    });

    it('should configure DefaultCacheBehavior correctly', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          DefaultCacheBehavior: Match.objectLike({
            TargetOriginId: Match.stringLikeRegexp('MyTestStackDistributionOrigin'), // CDKが生成するIDの一部
            ViewerProtocolPolicy: 'redirect-to-https',
            AllowedMethods: Match.arrayWith(['GET', 'HEAD']), // 少なくともこれらのメソッドが含まれていること
            CachedMethods: Match.arrayWith(['GET', 'HEAD']),
            Compress: true,
            OriginRequestPolicyId: Match.anyValue(), // ALL_VIEWER_AND_CLOUDFRONT_2022
            CachePolicyId: Match.anyValue(), // CACHING_OPTIMIZED
            ResponseHeadersPolicyId: Match.anyValue(), // CORS-Allow-All
          })
        })
      });
    });

    it('should configure AdditionalBehaviors correctly', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          CacheBehaviors: Match.arrayWith([
            Match.objectLike({
              PathPattern: testProps.AddBehaviors[0].pathPattern,
              TargetOriginId: Match.stringLikeRegexp('MyTestStackDistributionOrigin'), // CDKが生成するIDの一部
              ViewerProtocolPolicy: 'redirect-to-https',
              AllowedMethods: Match.arrayWith(['GET', 'HEAD']), // 少なくともこれらのメソッドが含まれていること
              CachedMethods: Match.arrayWith(['GET', 'HEAD']),
              Compress: false,
              OriginRequestPolicyId: Match.anyValue(), // CORS_S3_ORIGIN
              CachePolicyId: Match.anyValue(), // CACHING_OPTIMIZED
              ResponseHeadersPolicyId: Match.anyValue(), // CORS-Allow-All
            })
          ])
        })
      });
    });

    it('should configure S3 origin correctly', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          Origins: Match.arrayWith([
            Match.objectLike({
              DomainName: Match.stringLikeRegexp(testProps.AddBehaviors[0].Origin),
              Id: Match.anyValue(),
              S3OriginConfig: Match.anyValue(),
              OriginShield: {
                Enabled: true,
                OriginShieldRegion: testProps.AddBehaviors[0].Region
              }
            })
          ])
        })
      });
    });
  });

  describe('Stack Outputs', () => {
    it('should output DistributionId', () => {
      template.hasOutput('DistributionId', {
        Description: 'CloudFrontディストリビューションのID',
        Value: {
          Ref: Match.stringLikeRegexp('Distribution') // Distributionの論理ID
        }
      });
    });
  });
});
