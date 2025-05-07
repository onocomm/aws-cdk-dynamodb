import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as CdkCloudFront from '../lib/cdk-cloudfront-stack';

describe('CdkCloudFrontStack', () => {
  describe('基本的なスタック構成のテスト', () => {
    let template: Template;
    let stack: CdkCloudFront.CdkCloudFrontStack;
    
    // テスト用のプロパティ（ALBオリジン）
    const testPropsAlb = {
      Stage: 'staging',
      ResourceName: 'TestAlb',
      DomainNames: ['test-alb.example.com'],
      CertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/dummy-certificate-id',
      DefaultOrigin: 'test-alb.example.com',
      DefaultOriginType: 'ALB',
      DefaultOriginRegion: 'ap-northeast-1',
      AddBehaviors: [
        {
          Name: 'S3Download',
          Type: 'S3',
          pathPattern: '/download/*',
          Origin: 'test-download-bucket',
          Region: 'us-east-1'
        }
      ],
      LogBucket: 'cloudfront-log-test-alb',
      LogFilePrefix: 'test-alb/',
      Description: 'Test ALB CloudFront Distribution',
      env: {
        account: '123456789012',
        region: 'us-east-1'
      }
    };

    beforeAll(() => {
      const app = new cdk.App();
      stack = new CdkCloudFront.CdkCloudFrontStack(app, 'TestAlbStack', testPropsAlb);
      template = Template.fromStack(stack);
    });

    it('スタックが正常に作成されること', () => {
      // スタックが正常に作成されることを確認
      template.resourceCountIs('AWS::CloudFront::Distribution', 1);
      template.resourceCountIs('AWS::S3::Bucket', 1);
    });

    it('ログバケットが正しく設定されていること', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: testPropsAlb.LogBucket,
        AccessControl: 'LogDeliveryWrite'
      });
      
      // ステージング環境ではRemovalPolicyがDestroyに設定されていることを確認
      template.hasResource('AWS::S3::Bucket', {
        UpdateReplacePolicy: 'Delete',
        DeletionPolicy: 'Delete'
      });
    });

    it('CloudFrontディストリビューションの基本設定が正しいこと', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          Comment: testPropsAlb.Description,
          Enabled: true,
          HttpVersion: 'http2and3',
          PriceClass: 'PriceClass_All',
          Aliases: testPropsAlb.DomainNames,
          ViewerCertificate: {
            AcmCertificateArn: testPropsAlb.CertificateArn,
            SslSupportMethod: 'sni-only'
          },
          Logging: {
            Bucket: Match.anyValue(),
            Prefix: testPropsAlb.LogFilePrefix
          }
        })
      });
    });

    it('ALBオリジンが正しく設定されていること', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          Origins: Match.arrayWith([
            Match.objectLike({
              DomainName: testPropsAlb.DefaultOrigin,
              Id: Match.anyValue(),
              CustomOriginConfig: Match.objectLike({
                OriginProtocolPolicy: 'https-only',
                OriginSSLProtocols: ['TLSv1.2']
              }),
              OriginShield: {
                Enabled: true,
                OriginShieldRegion: testPropsAlb.DefaultOriginRegion
              }
            })
          ])
        })
      });
    });

    it('デフォルトビヘイビアが正しく設定されていること', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          DefaultCacheBehavior: Match.objectLike({
            ViewerProtocolPolicy: 'redirect-to-https',
            Compress: true,
            OriginRequestPolicyId: Match.anyValue(), // ALL_VIEWER_AND_CLOUDFRONT_2022
            CachePolicyId: Match.anyValue(), // CACHING_OPTIMIZED
            ResponseHeadersPolicyId: Match.anyValue() // CORS_ALLOW_ALL_ORIGINS
          })
        })
      });
    });

    it('追加ビヘイビア（S3オリジン）が正しく設定されていること', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          CacheBehaviors: Match.arrayWith([
            Match.objectLike({
              PathPattern: testPropsAlb.AddBehaviors[0].pathPattern,
              ViewerProtocolPolicy: 'redirect-to-https',
              Compress: false,
              OriginRequestPolicyId: Match.anyValue(), // CORS_S3_ORIGIN
              CachePolicyId: Match.anyValue(), // CACHING_OPTIMIZED
              ResponseHeadersPolicyId: Match.anyValue() // CORS_ALLOW_ALL_ORIGINS
            })
          ])
        })
      });
    });

    it('S3オリジンが正しく設定されていること', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          Origins: Match.arrayWith([
            Match.objectLike({
              DomainName: Match.stringLikeRegexp(`${testPropsAlb.AddBehaviors[0].Origin}`),
              Id: Match.anyValue(),
              S3OriginConfig: Match.anyValue(),
              OriginShield: {
                Enabled: true,
                OriginShieldRegion: testPropsAlb.AddBehaviors[0].Region
              }
            })
          ])
        })
      });
    });

    it('出力が正しく設定されていること', () => {
      template.hasOutput('DistributionId', {
        Description: 'CloudFrontディストリビューションのID',
        Value: Match.anyValue()
      });
    });
  });

  describe('S3オリジンをデフォルトとしたスタック構成のテスト', () => {
    let template: Template;
    let stack: CdkCloudFront.CdkCloudFrontStack;
    
    // テスト用のプロパティ（S3オリジン）
    const testPropsS3 = {
      Stage: 'production',
      ResourceName: 'TestS3',
      DomainNames: ['test-s3.example.com'],
      CertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/dummy-certificate-id',
      DefaultOrigin: 'test-origin-bucket',
      DefaultOriginType: 'S3',
      DefaultOriginRegion: 'us-east-1',
      AddBehaviors: [
        {
          Name: 'ApiBackend',
          Type: 'ALB',
          pathPattern: '/api/*',
          Origin: 'api.example.com',
          Region: 'ap-northeast-1'
        }
      ],
      LogBucket: 'cloudfront-log-test-s3',
      LogFilePrefix: 'test-s3/',
      Description: 'Test S3 CloudFront Distribution',
      env: {
        account: '123456789012',
        region: 'us-east-1'
      }
    };

    beforeAll(() => {
      const app = new cdk.App();
      stack = new CdkCloudFront.CdkCloudFrontStack(app, 'TestS3Stack', testPropsS3);
      template = Template.fromStack(stack);
    });

    it('本番環境のログバケットはRetainポリシーが設定されていること', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: testPropsS3.LogBucket,
        AccessControl: 'LogDeliveryWrite'
      });
      
      // 本番環境ではRemovalPolicyがRetainに設定されていることを確認
      template.hasResource('AWS::S3::Bucket', {
        UpdateReplacePolicy: 'Retain',
        DeletionPolicy: 'Retain'
      });
    });

    it('S3デフォルトオリジンが正しく設定されていること', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          Origins: Match.arrayWith([
            Match.objectLike({
              DomainName: Match.stringLikeRegexp(`${testPropsS3.DefaultOrigin}`),
              Id: Match.anyValue(),
              S3OriginConfig: Match.anyValue(),
              OriginShield: {
                Enabled: true,
                OriginShieldRegion: testPropsS3.DefaultOriginRegion
              }
            })
          ])
        })
      });
    });

    it('S3オリジン用のデフォルトビヘイビアが正しく設定されていること', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          DefaultCacheBehavior: Match.objectLike({
            ViewerProtocolPolicy: 'redirect-to-https',
            OriginRequestPolicyId: Match.anyValue(), // CORS_S3_ORIGIN
            CachePolicyId: Match.anyValue() // CACHING_OPTIMIZED
          })
        })
      });
    });

    it('追加ビヘイビア（ALBオリジン）が正しく設定されていること', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          CacheBehaviors: Match.arrayWith([
            Match.objectLike({
              PathPattern: testPropsS3.AddBehaviors[0].pathPattern,
              ViewerProtocolPolicy: 'redirect-to-https',
              OriginRequestPolicyId: Match.anyValue(), // ALL_VIEWER_AND_CLOUDFRONT_2022
              CachePolicyId: Match.anyValue() // CACHING_OPTIMIZED
            })
          ])
        })
      });
    });

    it('ALB追加オリジンが正しく設定されていること', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          Origins: Match.arrayWith([
            Match.objectLike({
              DomainName: testPropsS3.AddBehaviors[0].Origin,
              Id: Match.anyValue(),
              CustomOriginConfig: Match.objectLike({
                OriginProtocolPolicy: 'https-only',
                OriginSSLProtocols: ['TLSv1.2']
              }),
              OriginShield: {
                Enabled: true,
                OriginShieldRegion: testPropsS3.AddBehaviors[0].Region
              }
            })
          ])
        })
      });
    });
  });

  describe('エラーハンドリングのテスト', () => {
    it('propsが未定義の場合にエラーがスローされること', () => {
      const app = new cdk.App();
      
      // @ts-ignore - テスト目的で意図的にTypeScriptの型チェックを無視
      expect(() => new CdkCloudFront.CdkCloudFrontStack(app, 'ErrorStack', undefined))
        .toThrow('props is required for CdkCloudFrontStack');
    });
  });
});
