import { MessageHandler } from "../models/message";
import { Subscription } from "../models/subscription";
import { SubscriptionManager } from "./subscription";

/**
 * Handle the storage and management of subscriptions.
 */
export class EventRegistry {
  private subscriptions: Map<string, Set<Subscription<unknown>>> = new Map();

  subscribe<T>(
    topic: string,
    handler: MessageHandler<T>,
  ): Subscription<T> {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }

    const subscription = new SubscriptionManager<T>(
      topic,
      handler as MessageHandler<unknown>,
      () => this.unsubscribe(subscription as Subscription<unknown>)
    );

    (this.subscriptions.get(topic)! as Set<Subscription<unknown>>).add(
      subscription as Subscription<unknown>
    );
    return subscription;
  }

  /**
   * Handle the registry cleanup, removing the subscription from the internal map.
   */
  private unsubscribe(subscription: Subscription<unknown>): void {
    const subscribers = this.subscriptions.get(subscription.topic);
    if (subscribers) {
      subscribers.delete(subscription);
      if (subscribers.size === 0) {
        this.subscriptions.delete(subscription.topic);
      }
    }
  }

  /**
   * Get all subscribers for a given topic.
   */
  getSubscribers(topic: string): Set<Subscription<unknown>> {
    const subscribers = this.subscriptions.get(topic) || new Set();
    return subscribers;
  }
}
