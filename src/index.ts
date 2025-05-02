import { MessageBus } from "./entities/message-bus";
import { TopicMap } from "./models/topic";
import { QueuePriority, QueueOptions, QueueProcessorOptions } from "./models/queue";

let instance: MessageBus<any> | null = null;

function messageBus<TMap extends TopicMap>(): MessageBus<TMap> {
  if (!instance) {
    instance = new MessageBus<TMap>();
  }

  return instance as MessageBus<TMap>;
}

export { messageBus, QueuePriority, QueueOptions, QueueProcessorOptions };