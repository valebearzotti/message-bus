import { IMessageBus, Message, MessageHandler } from "../models/message";
import { ProcessorOptions, QueueOptions, QueuedEvent, QueueStatus } from "../models/queue";
import { Subscription } from "../models/subscription";
import { AvailableTopic, TopicMap } from "../models/topic";
import { generateMessageId } from "../utils/id";
import { EventRegistry } from "./registry";
import { QueueProcessor } from "./queue-processor";

export class MessageBus<TMap extends TopicMap> implements IMessageBus<TMap> {
  private registry: EventRegistry;
  private queueProcessor: QueueProcessor<TMap>;

  constructor() {
    this.registry = new EventRegistry();
    this.queueProcessor = new QueueProcessor<TMap>(this.registry);
  }

  /**
   * Publish an event to the message bus, where all subscribers will get notified. One-way communication.
   */
  async event<Topic extends AvailableTopic<TMap>>(
    topic: Topic,
    payload: TMap[Topic]
  ): Promise<void> {
    const message: Message<TMap[Topic]> = {
      id: generateMessageId(topic),
      payload,
      timestamp: Date.now(),
    };

    const subscribers = this.registry.getSubscribers(topic);

    const handlerPromises = Array.from(subscribers).map(
      async (subscription) => {
        if (subscription.isActive) {
          try {
            await subscription.handler(message);
          } catch {
            throw new Error(`Error handling event: ${topic}`);
          }
        }
      }
    );

    await Promise.all(handlerPromises);
  }

  /**
   * Queue an event for later processing
   */
  queueEvent<Topic extends AvailableTopic<TMap>>(
    topic: Topic,
    payload: TMap[Topic],
    options?: QueueOptions
  ): QueuedEvent<TMap[Topic]> {
    const message: Message<TMap[Topic]> & { topic: string } = {
      id: generateMessageId(topic),
      payload,
      timestamp: Date.now(),
      topic: topic as string
    };
    
    return this.queueProcessor.queueEvent(topic as string, message);
  }

  /**
   * Start processing queued events
   */
  startQueueProcessor(options?: ProcessorOptions): void {
    if (options) {
      // Create a new processor with the specified options
      this.queueProcessor = new QueueProcessor<TMap>(this.registry, options);
    }
    
    this.queueProcessor.start();
  }

  /**
   * Stop processing queued events
   */
  stopQueueProcessor(): void {
    this.queueProcessor.stop();
  }

  /**
   * Process all queued events immediately
   */
  async processQueue(): Promise<void> {
    await this.queueProcessor.processAll();
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): QueueStatus {
    return this.queueProcessor.getStatus();
  }

  /**
   * Subscribe to events of a specific topic
   */
  subscribe<Topic extends AvailableTopic<TMap>>(
    topic: Topic,
    handler: MessageHandler<TMap[Topic]>
  ): Subscription<TMap[Topic]> {
    return this.registry.subscribe(topic, handler);
  }
}
