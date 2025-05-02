import { IMessageBus, Message, MessageHandler } from "../models/message";
import { QueueOptions, QueueProcessorOptions, QueueStatus, QueuedEvent } from "../models/queue";
import { Subscription } from "../models/subscription";
import { AvailableTopic, TopicMap } from "../models/topic";
import { generateMessageId } from "../utils/id";
import { EventQueue } from "./event-queue";
import { EventRegistry } from "./registry";

export class MessageBus<TMap extends TopicMap> implements IMessageBus<TMap> {
  private registry: EventRegistry;
  private queue: EventQueue<TMap>;
  private queueProcessorInterval: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;

  constructor() {
    this.registry = new EventRegistry();
    this.queue = new EventQueue<TMap>();
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
   * Add an event to the queue for later processing
   */
  queueEvent<Topic extends AvailableTopic<TMap>>(
    topic: Topic,
    payload: TMap[Topic],
    options?: QueueOptions
  ): QueuedEvent<TMap[Topic]> {
    return this.queue.enqueue(topic, payload, options);
  }

  /**
   * Process all queued events that are ready to be processed
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.queue.setProcessing(true);

    try {
      let event = this.queue.dequeue();
      
      while (event) {
        const startTime = Date.now();
        let failed = false;
        
        try {
          // Safely cast the types for dispatching
          const topic = event.topic as keyof TMap & string;
          const payload = event.message.payload as any as TMap[typeof topic];
          
          await this.event(topic, payload);
        } catch (error) {
          failed = true;
          
          // Handle retry logic if needed
          if (event.retryCount < event.maxRetries) {
            // Safely cast for re-queuing
            const topic = event.topic as keyof TMap & string;
            const payload = event.message.payload as any as TMap[typeof topic];
            
            this.queue.enqueue(
              topic, 
              payload, 
              { 
                id: event.id,
                priority: event.priority,
                delay: 1000 * Math.pow(2, event.retryCount), // Exponential backoff
                maxRetries: event.maxRetries
              }
            );
          }
        }
        
        // Record processing statistics
        const processingTime = Date.now() - startTime;
        this.queue.recordProcessed(processingTime, failed);
        
        // Get next event
        event = this.queue.dequeue();
      }
    } finally {
      this.isProcessing = false;
      this.queue.setProcessing(false);
    }
  }

  /**
   * Start automatic processing of the queue
   */
  startQueueProcessor(options: QueueProcessorOptions = {}): void {
    if (this.queueProcessorInterval) {
      this.stopQueueProcessor();
    }

    const interval = options.processInterval || 100; // Default 100ms
    
    this.queueProcessorInterval = setInterval(() => {
      if (this.queue.hasReadyEvents() && !this.isProcessing) {
        this.processQueue();
      }
    }, interval);
  }

  /**
   * Stop automatic processing of the queue
   */
  stopQueueProcessor(): void {
    if (this.queueProcessorInterval) {
      clearInterval(this.queueProcessorInterval);
      this.queueProcessorInterval = null;
    }
  }

  /**
   * Get current status of the event queue
   */
  getQueueStatus(): QueueStatus {
    return this.queue.getStatus();
  }

  /**
   * Subscribe to a topic
   */
  subscribe<Topic extends AvailableTopic<TMap>>(
    topic: Topic,
    handler: MessageHandler<TMap[Topic]>
  ): Subscription<TMap[Topic]> {
    return this.registry.subscribe(topic, handler);
  }
}