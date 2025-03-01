import { MessageHandler } from "../models/message";
import { Subscription } from "../models/subscription";
import { generateSubscriptionId } from "../utils/id";

// Handle the subscription lifecycle and state
export class SubscriptionManager<T> implements Subscription<T> {
  public id: string;
  public isActive: boolean = true;

  constructor(
    public topic: string,
    public handler: MessageHandler<T>,
    private onUnsubscribe?: () => void
  ) {
    this.id = generateSubscriptionId(topic);
  }

  /**
   * Handle the subscription cleanup.
   */
  unsubscribe(): void {
    if (this.isActive) {
      this.isActive = false;
      this.onUnsubscribe?.();
    }
  }
}
