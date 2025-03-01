import { IMessageBus, Message, MessageHandler } from "../models/message";
import { Subscription } from "../models/subscription";
import { AvailableTopic, TopicMap } from "../models/topic";
import { generateMessageId } from "../utils/id";
import { EventRegistry } from "./registry";

export class MessageBus<TMap extends TopicMap> implements IMessageBus<TMap> {
  private registry: EventRegistry;

  constructor() {
    this.registry = new EventRegistry();
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

  subscribe<Topic extends AvailableTopic<TMap>>(
    topic: Topic,
    handler: MessageHandler<TMap[Topic]>
  ): Subscription<TMap[Topic]> {
    return this.registry.subscribe(topic, handler);
  }
}
