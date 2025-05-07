import { Stack, StackProps, CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

// カスタムプロパティの型を定義
interface CdkStackProps extends StackProps {
  Stage: string;
  DomainNames: string[];
  CertificateArn: string;
  DefaultOrigin: string;
  DefaultOriginType: string;
  DefaultOriginRegion: string;
  AddBehaviors: Record<string, any>[];
  LogBucket: string;
  LogFilePrefix: string;
  Description: string;
}

export class CdkCloudFrontStack extends Stack {
  constructor(scope: Construct, id: string, props: CdkStackProps) {
    super(scope, id, props);

    // ✅ props が undefined の場合、エラーを回避
    if (!props) {
      throw new Error('props is required for CdkCloudFrontStack');
    }
    
    // ✅ propsから必要な値を取得
    const {
      Stage,
      DomainNames,
      CertificateArn,
      DefaultOrigin,
      DefaultOriginType,
      DefaultOriginRegion,
      AddBehaviors,
      LogBucket,
      LogFilePrefix,
      Description,
    }: CdkStackProps = props;

    // ✅ 証明書の取得
    const certificate = certificatemanager.Certificate.fromCertificateArn(this, 'Certificate', CertificateArn);

    // ✅ ログバケットの作成
    const logBucket = new s3.Bucket(this, 'LogBucket', {
      bucketName: LogBucket,
      autoDeleteObjects: false,
      accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
      removalPolicy: Stage === 'production' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // ✅ CloudFrontのカスタムキャッシュポリシーを作成する場合
    /*
    const customCachePolicy = new cloudfront.CachePolicy(this, 'CustomCachePolicy', {
      cachePolicyName: `CustomCachePolicy`,
      defaultTtl: Duration.minutes(5),  // デフォルトTTL 5分
      minTtl: Duration.seconds(1),    // 最小TTL 1秒
      maxTtl: Duration.days(365),       // 最大TTL 365日
      cookieBehavior: cloudfront.CacheCookieBehavior.none(), // Cookieなし
      headerBehavior: cloudfront.CacheHeaderBehavior.none(), //ヘッダーなし
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(), // すべてのクエリストリングをキャッシュキーに含める
      enableAcceptEncodingBrotli: true, // Brotli圧縮を有効化
      enableAcceptEncodingGzip: true,   // Gzip圧縮を有効化
    });
    */

    // ✅ デフォルトオリジンの設定
    const origin = DefaultOriginType === 'S3' ? 
      origins.S3BucketOrigin.withOriginAccessControl(
        s3.Bucket.fromBucketAttributes(this, 'DefaultOriginBucket', {bucketName: DefaultOrigin, region: DefaultOriginRegion}),
        {
          originShieldEnabled: true,
          originShieldRegion: DefaultOriginRegion,
        }
      ) :
      new origins.HttpOrigin(DefaultOrigin,
        {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          originShieldEnabled: true,
          originShieldRegion: DefaultOriginRegion,
        });

    // ✅ デフォルトビヘイビアの設定（設定内容は適宜変更してください）
    const defaultBehavior ={
      origin: origin,
      compress: true,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      originRequestPolicy: DefaultOriginType === 'S3' ? cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN : cloudfront.OriginRequestPolicy.ALL_VIEWER_AND_CLOUDFRONT_2022,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      responseHeadersPolicy:cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
    };
    
    // ✅ 追加ビヘイビアの定義
    const additionalBehaviors: Record<string, cloudfront.BehaviorOptions> = {};

    // ✅ 追加ビヘイビアの作成（設定内容は適宜変更してください）
    for (const behavior of AddBehaviors) {
      const origin = behavior.Type === 'S3' ? 
      origins.S3BucketOrigin.withOriginAccessControl(
        s3.Bucket.fromBucketAttributes(this, `${behavior.Name}Bucket`, {bucketName: behavior.Origin, region: behavior.Region}),
        {
          originShieldEnabled: true,
          originShieldRegion: behavior.Region,
        }
      ) :
      new origins.HttpOrigin(behavior.Origin,
        {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          originShieldEnabled: true,
          originShieldRegion: behavior.Region,
        });
      additionalBehaviors[behavior.pathPattern] = {
        origin: origin,
        compress: false,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: behavior.Type === 'S3' ? cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN : cloudfront.OriginRequestPolicy.ALL_VIEWER_AND_CLOUDFRONT_2022,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy:cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
      };
    }

    // ✅ ディストリビューションの設定
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: defaultBehavior,
      additionalBehaviors: additionalBehaviors,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      domainNames: DomainNames,
      certificate: certificate,
      //webAclId: webAcl.attrArn, // WAFをアタッチ
      logBucket: logBucket,
      logFilePrefix: LogFilePrefix,
      comment: Description,
      enabled: true,
    });
    
    // 出力
    new CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFrontディストリビューションのID',
    });
  }
}
