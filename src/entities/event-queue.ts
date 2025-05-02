import { Message } from "../models/message";
import { QueueOptions, QueuedEvent, QueueEventNode, QueueStatus } from "../models/queue";
import { generateId } from "../utils/id";

/**
 * Implementation of a queue for events using a linked list structure.
 * Allows for prioritization and sequential processing of events.
 */
export class EventQueue<T = unknown> {
  private head: QueueEventNode<T> | null = null;
  private tail: QueueEventNode<T> | null = null;
  private size: number = 0;
  private processingCount: number = 0;
  private completedCount: number = 0;
  private failedCount: number = 0;

  /**
   * Add a new event to the queue
   */
  enqueue(message: Message<T>, options: QueueOptions = {}): QueuedEvent<T> {
    const queuedAt = Date.now();
    const priority = options.priority || "normal";
    const delay = options.delay || 0;
    const scheduledFor = queuedAt + delay;
    
    const queuedEvent: QueuedEvent<T> = {
      id: generateId(),
      message,
      status: "pending",
      priority,
      queuedAt,
      scheduledFor,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
    };

    const newNode: QueueEventNode<T> = {
      event: queuedEvent,
      next: null,
    };

    // If queue is empty
    if (!this.head) {
      this.head = newNode;
      this.tail = newNode;
      this.size++;
      return queuedEvent;
    }

    // Priority based insertion
    if (priority === "high") {
      // If the new node has higher priority than head
      if (this.head.event.priority !== "high") {
        newNode.next = this.head;
        this.head = newNode;
        this.size++;
        return queuedEvent;
      }

      // Find the last high priority node
      let current = this.head;
      while (current.next && current.next.event.priority === "high") {
        current = current.next;
      }
      
      newNode.next = current.next;
      current.next = newNode;
      
      // If we're at the end of the list
      if (!newNode.next) {
        this.tail = newNode;
      }
    } else {
      // Normal or low priority, add to end
      if (this.tail) {
        this.tail.next = newNode;
        this.tail = newNode;
      }
    }
    
    this.size++;
    return queuedEvent;
  }

  /**
   * Remove and return the next event from the queue
   */
  dequeue(): QueuedEvent<T> | null {
    if (!this.head) return null;

    const dequeuedEvent = this.head.event;
    this.head = this.head.next;
    
    if (!this.head) {
      this.tail = null;
    }
    
    this.size--;
    return dequeuedEvent;
  }

  /**
   * Look at the next event without removing it
   */
  peek(): QueuedEvent<T> | null {
    return this.head ? this.head.event : null;
  }

  /**
   * Get all events that are ready to be processed
   */
  getReadyEvents(): QueuedEvent<T>[] {
    const readyEvents: QueuedEvent<T>[] = [];
    const now = Date.now();
    
    let current = this.head;
    while (current) {
      if (current.event.status === "pending" && current.event.scheduledFor <= now) {
        readyEvents.push(current.event);
      }
      current = current.next;
    }
    
    return readyEvents;
  }

  /**
   * Update the status of an event
   */
  updateEventStatus(eventId: string, status: QueuedEvent<T>["status"]): boolean {
    let current = this.head;
    
    while (current) {
      if (current.event.id === eventId) {
        current.event.status = status;
        
        if (status === "processing") {
          this.processingCount++;
        } else if (status === "completed") {
          this.processingCount--;
          this.completedCount++;
        } else if (status === "failed") {
          this.processingCount--;
          this.failedCount++;
        }
        
        return true;
      }
      current = current.next;
    }
    
    return false;
  }

  /**
   * Increment attempt count for an event
   */
  incrementAttempt(eventId: string): boolean {
    let current = this.head;
    
    while (current) {
      if (current.event.id === eventId) {
        current.event.attempts++;
        return true;
      }
      current = current.next;
    }
    
    return false;
  }

  /**
   * Remove an event from the queue by ID
   */
  removeEvent(eventId: string): boolean {
    if (!this.head) return false;
    
    // If head is the target
    if (this.head.event.id === eventId) {
      this.head = this.head.next;
      if (!this.head) {
        this.tail = null;
      }
      this.size--;
      return true;
    }
    
    // Search the list
    let current = this.head;
    while (current.next) {
      if (current.next.event.id === eventId) {
        // If we're removing the tail
        if (current.next === this.tail) {
          this.tail = current;
        }
        
        current.next = current.next.next;
        this.size--;
        return true;
      }
      current = current.next;
    }
    
    return false;
  }

  /**
   * Get current queue status
   */
  getStatus(): QueueStatus {
    return {
      size: this.size,
      processing: this.processingCount,
      completed: this.completedCount,
      failed: this.failedCount
    };
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.head = null;
    this.tail = null;
    this.size = 0;
    this.processingCount = 0;
  }
}
