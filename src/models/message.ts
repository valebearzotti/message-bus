import { QueueOptions, QueueProcessorOptions, QueueStatus, QueuedEvent } from "./queue";
import { TopicMap, AvailableTopic } from "./topic";
import { Subscription } from "./subscription";

export interface Message<T> {
  id: string;
  payload: T;
  timestamp: number;
}

export interface MessageHandler<T> {
  (message: Message<T>): Promise<void>;
}

export interface IMessageBus<TMap extends TopicMap> {
  /**
   * Publish an event to the message bus immediately, where all subscribers will get notified. One-way communication.
   */
  event<Topic extends AvailableTopic<TMap>>(
    topic: Topic,
    payload: TMap[Topic]
  ): Promise<void>;

  /**
   * Add an event to the queue for later processing
   */
  queueEvent<Topic extends AvailableTopic<TMap>>(
    topic: Topic,
    payload: TMap[Topic],
    options?: QueueOptions
  ): QueuedEvent<TMap[Topic]>;

  /**
   * Process all queued events that are ready to be processed
   */
  processQueue(): Promise<void>;

  /**
   * Start automatic processing of the queue
   */
  startQueueProcessor(options?: QueueProcessorOptions): void;

  /**
   * Stop automatic processing of the queue
   */
  stopQueueProcessor(): void;

  /**
   * Get current status of the event queue
   */
  getQueueStatus(): QueueStatus;

  /**
   * Subscribe to a topic
   */
  subscribe<Topic extends AvailableTopic<TMap>>(
    topic: Topic,
    handler: MessageHandler<TMap[Topic]>
  ): Subscription<TMap[Topic]>;
}