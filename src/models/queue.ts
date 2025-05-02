import { Message } from "./message";
import { AvailableTopic, TopicMap } from "./topic";

/**
 * Priority levels for queued events
 */
export enum QueuePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * Options for queuing an event
 */
export interface QueueOptions {
  /** Priority level of the event */
  priority?: QueuePriority;
  /** Delay in milliseconds before the event should be processed */
  delay?: number;
  /** Maximum number of retry attempts if processing fails */
  maxRetries?: number;
  /** Custom ID for the queued event (generated automatically if not provided) */
  id?: string;
}

/**
 * Configuration for the queue processor
 */
export interface QueueProcessorOptions {
  /** Maximum number of events to process concurrently */
  concurrency?: number;
  /** Interval in milliseconds between processing batches */
  processInterval?: number;
  /** Whether to automatically retry failed events */
  autoRetry?: boolean;
}

/**
 * Represents a queued event in the system
 */
export interface QueuedEvent<T> {
  /** Unique identifier for the queued event */
  id: string;
  /** The topic this event belongs to */
  topic: string;
  /** The actual message containing the payload */
  message: Message<T>;
  /** Priority level of the event */
  priority: QueuePriority;
  /** Timestamp when the event should be processed */
  scheduledTime: number;
  /** Number of retry attempts made */
  retryCount: number;
  /** Maximum number of retry attempts */
  maxRetries: number;
}

/**
 * Queue status information for monitoring
 */
export interface QueueStatus {
  /** Total number of events in the queue */
  size: number;
  /** Number of high-priority events */
  highPriorityCount: number;
  /** Whether the queue processor is currently running */
  isProcessing: boolean;
  /** Queue processor statistics */
  stats: {
    /** Total events processed since queue creation */
    totalProcessed: number;
    /** Total failed events */
    totalFailed: number;
    /** Average processing time in ms */
    averageProcessingTime: number;
  };
}

/**
 * Node in the linked list representing a queued event
 */
export interface QueueNode<T> {
  /** The queued event data */
  data: QueuedEvent<T>;
  /** Reference to the next node in the list */
  next: QueueNode<T> | null;
}

/**
 * Interface for the event queue
 */
export interface IEventQueue<TMap extends TopicMap> {
  /** Enqueue a new event */
  enqueue<Topic extends AvailableTopic<TMap>>(
    topic: Topic,
    payload: TMap[Topic],
    options?: QueueOptions
  ): QueuedEvent<TMap[Topic]>;
  
  /** Dequeue the next event based on priority and scheduled time */
  dequeue(): QueuedEvent<unknown> | null;
  
  /** Peek at the next event without removing it */
  peek(): QueuedEvent<unknown> | null;
  
  /** Get the current queue status */
  getStatus(): QueueStatus;
}