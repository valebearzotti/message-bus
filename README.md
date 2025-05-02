# Message Bus

Framework agnostic implementation of a message bus.
Allow communication between components without tight coupling.

## How it works

The message bus is a singleton instance that can be used to send and receive messages. It is responsible for routing messages to the correct handlers. For any message you should define a topic, and a payload type mapped to it.

1. Subscribers register to a topic via the `subscribe` method.
2. Publishers emit events to specific topics using the `event` method.
3. The registry maintains the mapping between topics and subscribers.
4. When an event is published, all active subscribers to that topic get notified.

## Get started

A good practice is to start by defining the topic map, and then use the message bus with it to ensure full type safety. As your application grows, you can add more topics and payload types to it. If you skip this step, you'll still get the record but without strict type safety.

```typescript
type TopicMap = {
  "user.profile.updated": {
    payload: {
      id: string;
    };
  };
};

// create the message bus with the topic map
const messageBus = messageBus<TopicMap>();

// subscribe to a topic
messageBus.subscribe("user.profile.updated", async (message) => {
  // access the typed payload
  console.log(message.payload.id);
});

// emit an event to a topic
await messageBus.event("user.profile.updated", {
  id: "123",
});
```

And that's it.

## Queueable Events

The message bus now supports queueable events, which allow for more advanced messaging patterns:

- Sequential processing of events
- Delayed event handling
- Event prioritization
- Retry mechanisms for failed events

### Queuing Events

```typescript
import { messageBus, QueuePriority } from "@valts/message-bus";

// Queue an event with options
const queuedEvent = messageBus.queueEvent("user.profile.updated", {
  id: "123"
}, { 
  priority: QueuePriority.HIGH,
  delay: 1000, // 1 second delay
  maxRetries: 3  // retry up to 3 times on failure
});

// Process all queued events that are ready
await messageBus.processQueue();

// Or automatically process as they arrive
messageBus.startQueueProcessor({ 
  concurrency: 5,
  processInterval: 100 // check queue every 100ms
});

// Stop automatic processing
messageBus.stopQueueProcessor();

// Get queue status
const queueStatus = messageBus.getQueueStatus();
console.log(`Queue size: ${queueStatus.size}`);
console.log(`High priority events: ${queueStatus.highPriorityCount}`);
```

### Priority Levels

Events can be queued with different priority levels:

```typescript
import { QueuePriority } from "@valts/message-bus";

// Available priorities
QueuePriority.LOW      // 0
QueuePriority.NORMAL   // 1 (default)
QueuePriority.HIGH     // 2
QueuePriority.CRITICAL // 3
```

Higher priority events are processed before lower priority ones, regardless of when they were added to the queue.