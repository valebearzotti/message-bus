import { TopicMap, AvailableTopic } from "./topic";
import { Subscription } from "./subscription";

export interface Message<T> {
  id: string;
  payload: T;
  timestamp: number;
}

export interface MessageHandler<T> {
  (message: Message<T>): Promise<void>;
}

export interface IMessageBus<TMap extends TopicMap> {
  event<Topic extends AvailableTopic<TMap>>(
    topic: Topic,
    payload: TMap[Topic]
  ): void;
  subscribe<Topic extends AvailableTopic<TMap>>(
    topic: Topic,
    handler: MessageHandler<TMap[Topic]>
  ): Subscription<TMap[Topic]>;
}
