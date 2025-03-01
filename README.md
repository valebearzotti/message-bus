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
