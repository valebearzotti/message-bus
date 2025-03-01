/**
 * Define the priority of a message.
 * Used to determine the order of messages in the message bus.
 */

import { MessageHandler } from "./message";

export interface Subscription<T> {
  id: string;
  topic: string;
  handler: MessageHandler<T>;
  unsubscribe: () => void;
  isActive: boolean;
}
