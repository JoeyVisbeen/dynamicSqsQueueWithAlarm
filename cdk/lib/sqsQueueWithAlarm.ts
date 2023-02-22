import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cwActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import {aws_cloudwatch, Duration} from 'aws-cdk-lib';
import {Construct} from 'constructs';

export interface AlarmedQueueProps {
	readonly queueSettings: sqs.QueueProps;
	readonly topicArn: string;
	readonly maxReceiveCount: number;
}

export class sqsQueueWithAlarm extends Construct{
	/**
	 * The queue object will be used in the stack for permissions
	 */
	public readonly queue: any;
	/**
	 * The queue URL is used for any trigger to send it to the right queue
	 */
	public readonly queueUrl: string;
	constructor(scope: Construct, id: string, props: AlarmedQueueProps) {
		super(scope, id);
		const queueName = props.queueSettings.queueName?.substring(0, props.queueSettings.queueName?.length - 5);

		const topic = sns.Topic.fromTopicArn(this, 'topic', props.topicArn);

		const snsAction = new cwActions.SnsAction(topic);

		const deadLetterQueue = new sqs.Queue(this, `${queueName}DeadLetter`, {
			queueName: `${queueName}DeadLetter.fifo`,
			contentBasedDeduplication: true,
			retentionPeriod: Duration.days(14),
		});

		const queue = new sqs.Queue(this,'' + queueName, {
			...props.queueSettings,
			deadLetterQueue: {
				maxReceiveCount: props.maxReceiveCount,
				queue: deadLetterQueue
			}
		});

		const deadLetterQueueAlarm = new aws_cloudwatch.Alarm(this, 'deadLetterQueueAlarm', {
			alarmDescription: `Alarm for ${deadLetterQueue.queueName}`,
			metric: deadLetterQueue.metricApproximateNumberOfMessagesVisible(),
			threshold: 1,
			evaluationPeriods: 1,
			comparisonOperator: aws_cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: aws_cloudwatch.TreatMissingData.IGNORE
		});

		deadLetterQueueAlarm.addAlarmAction(snsAction);
		deadLetterQueueAlarm.addOkAction(snsAction);

		this.queueUrl = queue.queueUrl;
		this.queue = queue;
	}
}