import { Message } from "./message";

/**
 * Event priority levels
 */
export type EventPriority = "high" | "normal" | "low";

/**
 * Status of a queued event
 */
export type EventStatus = "pending" | "processing" | "completed" | "failed";

/**
 * Options for queueing an event
 */
export interface QueueOptions {
  /**
   * Priority of the event (affects processing order)
   */
  priority?: EventPriority;
  
  /**
   * Delay in milliseconds before the event is eligible for processing
   */
  delay?: number;
  
  /**
   * Maximum number of processing attempts
   */
  maxAttempts?: number;
}

/**
 * Representation of a queued event
 */
export interface QueuedEvent<T = unknown> {
  /**
   * Unique identifier for the queued event
   */
  id: string;
  
  /**
   * The actual message to be processed
   */
  message: Message<T> & { topic: string };
  
  /**
   * Current status of the event
   */
  status: EventStatus;
  
  /**
   * Priority level
   */
  priority: EventPriority;
  
  /**
   * Timestamp when the event was added to the queue
   */
  queuedAt: number;
  
  /**
   * Timestamp when the event is scheduled to be processed
   * (accounts for any delay)
   */
  scheduledFor: number;
  
  /**
   * Number of processing attempts
   */
  attempts: number;
  
  /**
   * Maximum number of attempts before giving up
   */
  maxAttempts: number;
}

/**
 * Node in the event queue linked list
 */
export interface QueueEventNode<T = unknown> {
  event: QueuedEvent<T>;
  next: QueueEventNode<T> | null;
}

/**
 * Queue status information
 */
export interface QueueStatus {
  /**
   * Total number of events in the queue
   */
  size: number;
  
  /**
   * Number of events currently being processed
   */
  processing: number;
  
  /**
   * Number of events successfully completed
   */
  completed: number;
  
  /**
   * Number of events that failed processing
   */
  failed: number;
}

/**
 * Options for the queue processor
 */
export interface ProcessorOptions {
  /**
   * Number of events to process concurrently
   */
  concurrency?: number;
  
  /**
   * Milliseconds between processing cycles
   */
  processInterval?: number;
  
  /**
   * Whether to automatically retry failed events
   */
  autoRetry?: boolean;
  
  /**
   * Milliseconds to wait before retrying a failed event
   */
  retryDelay?: number;
}
