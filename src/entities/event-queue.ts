import { Message } from "../models/message";
import { 
  IEventQueue, 
  QueueNode, 
  QueueOptions, 
  QueuePriority, 
  QueueStatus, 
  QueuedEvent 
} from "../models/queue";
import { AvailableTopic, TopicMap } from "../models/topic";
import { generateId } from "../utils/id";

/**
 * Create a new queue node
 */
function createQueueNode<T>(data: QueuedEvent<T>): QueueNode<T> {
  return {
    data,
    next: null
  };
}

/**
 * Implementation of a priority queue for events using a linked list
 */
export class EventQueue<TMap extends TopicMap> implements IEventQueue<TMap> {
  private head: QueueNode<unknown> | null = null;
  private size: number = 0;
  private highPriorityCount: number = 0;
  private isProcessing: boolean = false;
  private stats = {
    totalProcessed: 0,
    totalFailed: 0,
    processingTimes: [] as number[],
  };

  /**
   * Add a new event to the queue
   */
  enqueue<Topic extends AvailableTopic<TMap>>(
    topic: Topic,
    payload: TMap[Topic],
    options: QueueOptions = {}
  ): QueuedEvent<TMap[Topic]> {
    const message: Message<TMap[Topic]> = {
      id: options.id ? `msg-${options.id}` : `msg-${generateId(topic)}`,
      payload,
      timestamp: Date.now(),
    };

    const delay = options.delay || 0;
    const priority = options.priority !== undefined ? options.priority : QueuePriority.NORMAL;
    const maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3;

    const queuedEvent: QueuedEvent<TMap[Topic]> = {
      id: options.id || generateId(topic),
      topic,
      message,
      priority,
      scheduledTime: Date.now() + delay,
      retryCount: 0,
      maxRetries,
    };

    // Create a new node for the linked list
    const newNode = createQueueNode(queuedEvent as unknown as QueuedEvent<unknown>);

    // Update high priority count if needed
    if (priority >= QueuePriority.HIGH) {
      this.highPriorityCount++;
    }

    // If queue is empty, set as head
    if (!this.head) {
      this.head = newNode;
      this.size++;
      return queuedEvent;
    }

    // Handle insertion based on priority and scheduled time
    let current = this.head;
    let previous: QueueNode<unknown> | null = null;

    // Find the correct position to insert
    while (
      current && 
      (current.data.priority > newNode.data.priority || 
       (current.data.priority === newNode.data.priority && 
        current.data.scheduledTime <= newNode.data.scheduledTime))
    ) {
      previous = current;
      current = current.next;
    }

    // Insert at the beginning
    if (!previous) {
      newNode.next = this.head;
      this.head = newNode;
    } else {
      // Insert in the middle or at the end
      previous.next = newNode;
      newNode.next = current;
    }

    this.size++;
    return queuedEvent;
  }

  /**
   * Remove and return the next event from the queue
   */
  dequeue(): QueuedEvent<unknown> | null {
    if (!this.head) {
      return null;
    }

    const now = Date.now();
    // Skip events that are scheduled for the future
    if (this.head.data.scheduledTime > now) {
      return null;
    }

    const event = this.head.data;
    this.head = this.head.next;
    this.size--;

    if (event.priority >= QueuePriority.HIGH) {
      this.highPriorityCount--;
    }

    return event;
  }

  /**
   * View the next event without removing it
   */
  peek(): QueuedEvent<unknown> | null {
    return this.head?.data || null;
  }

  /**
   * Get the current status of the queue
   */
  getStatus(): QueueStatus {
    return {
      size: this.size,
      highPriorityCount: this.highPriorityCount,
      isProcessing: this.isProcessing,
      stats: {
        totalProcessed: this.stats.totalProcessed,
        totalFailed: this.stats.totalFailed,
        averageProcessingTime: this.calculateAverageProcessingTime(),
      },
    };
  }

  /**
   * Mark the queue as currently processing
   */
  setProcessing(isProcessing: boolean): void {
    this.isProcessing = isProcessing;
  }

  /**
   * Record statistics for a processed event
   */
  recordProcessed(processingTime: number, failed: boolean = false): void {
    this.stats.totalProcessed++;
    this.stats.processingTimes.push(processingTime);
    
    // Keep only the last 100 processing times for average calculation
    if (this.stats.processingTimes.length > 100) {
      this.stats.processingTimes.shift();
    }
    
    if (failed) {
      this.stats.totalFailed++;
    }
  }

  /**
   * Calculate the average processing time
   */
  private calculateAverageProcessingTime(): number {
    if (this.stats.processingTimes.length === 0) {
      return 0;
    }
    
    const sum = this.stats.processingTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.stats.processingTimes.length);
  }
  
  /**
   * Check if the queue has any events ready to process
   */
  hasReadyEvents(): boolean {
    return this.head !== null && this.head.data.scheduledTime <= Date.now();
  }
}