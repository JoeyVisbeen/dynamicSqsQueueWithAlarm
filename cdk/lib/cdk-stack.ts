import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import {Duration} from 'aws-cdk-lib';
import {sqsQueueWithAlarm} from './sqsQueueWithAlarm';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * Topic construct outside the sqsQueueWithAlarm construct for a single point of error delivery
     */
    const dlqTopic = new sns.Topic(this, 'errorEvent', {
      displayName: 'Error event topic'
    });

    /**
     * You could add subscription's in the stack or GUI
     */
    dlqTopic.addSubscription(
        new snsSubscriptions.EmailSubscription('your-email@domain.com')
    );

    /**
     * Custom construct for
     */
    const productiveQueue = new sqsQueueWithAlarm(this, 'productiveQueue', {
      maxReceiveCount: 3,
      topicArn: dlqTopic.topicArn,
      queueSettings: {
        queueName: 'productiveQueue.fifo',
        visibilityTimeout: Duration.minutes(15),
        contentBasedDeduplication: true
      }
    });
  }
}
