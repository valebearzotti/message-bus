import { EventQueue } from "./event-queue";
import { Message, MessageHandler } from "../models/message";
import { QueuedEvent, ProcessorOptions } from "../models/queue";
import { AvailableTopic, TopicMap } from "../models/topic";
import { EventRegistry } from "./registry";

export class QueueProcessor<TMap extends TopicMap> {
  private queue: EventQueue;
  private registry: EventRegistry;
  private running: boolean = false;
  private processorInterval: NodeJS.Timeout | null = null;
  private options: ProcessorOptions;

  constructor(registry: EventRegistry, options: ProcessorOptions = {}) {
    this.queue = new EventQueue();
    this.registry = registry;
    this.options = {
      concurrency: options.concurrency || 1,
      processInterval: options.processInterval || 100,
      autoRetry: options.autoRetry !== false,
      retryDelay: options.retryDelay || 1000
    };
  }

  /**
   * Queue an event for later processing
   */
  queueEvent<Topic extends AvailableTopic<TMap>>(
    topic: string,
    message: Message<TMap[Topic]>
  ): QueuedEvent<TMap[Topic]> {
    return this.queue.enqueue(message);
  }

  /**
   * Start processing queued events
   */
  start(): void {
    if (this.running) return;
    
    this.running = true;
    this.processorInterval = setInterval(
      () => this.processNextBatch(),
      this.options.processInterval
    );
  }

  /**
   * Stop processing queued events
   */
  stop(): void {
    if (!this.running) return;
    
    this.running = false;
    if (this.processorInterval) {
      clearInterval(this.processorInterval);
      this.processorInterval = null;
    }
  }

  /**
   * Process all queued events now
   */
  async processAll(): Promise<void> {
    const wasRunning = this.running;
    
    if (wasRunning) {
      this.stop();
    }
    
    try {
      // Process until queue is empty
      while (this.queue.peek()) {
        await this.processNextBatch();
      }
    } finally {
      if (wasRunning) {
        this.start();
      }
    }
  }

  /**
   * Process the next batch of events based on concurrency settings
   */
  private async processNextBatch(): Promise<void> {
    const readyEvents = this.queue.getReadyEvents();
    const eventsToProcess = readyEvents.slice(0, this.options.concurrency);
    
    if (eventsToProcess.length === 0) return;
    
    const processingPromises = eventsToProcess.map(event => 
      this.processEvent(event)
    );
    
    await Promise.allSettled(processingPromises);
  }

  /**
   * Process a single event
   */
  private async processEvent(event: QueuedEvent<unknown>): Promise<void> {
    this.queue.updateEventStatus(event.id, "processing");
    this.queue.incrementAttempt(event.id);
    
    try {
      const subscribers = this.registry.getSubscribers(event.message.topic);
      
      if (subscribers.size === 0) {
        // No subscribers, mark as completed
        this.queue.updateEventStatus(event.id, "completed");
        return;
      }
      
      const handlerPromises = Array.from(subscribers).map(
        async (subscription) => {
          if (subscription.isActive) {
            await subscription.handler(event.message);
          }
        }
      );
      
      await Promise.all(handlerPromises);
      
      // Event processed successfully
      this.queue.updateEventStatus(event.id, "completed");
    } catch (error) {
      // Event processing failed
      this.queue.updateEventStatus(event.id, "failed");
      
      // Retry logic
      if (
        this.options.autoRetry &&
        event.attempts < event.maxAttempts
      ) {
        // Reset status to pending with delay
        setTimeout(() => {
          if (event.status === "failed") {
            this.queue.updateEventStatus(event.id, "pending");
          }
        }, this.options.retryDelay);
      }
    }
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return this.queue.getStatus();
  }
}
