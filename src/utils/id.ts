/**
 * Generates a unique ID based on topic name, timestamp, and random values
 * to minimize collision risk.
 *
 * @param topicName - The name of the topic to include in the ID
 * @returns A string ID that should be unique within the application
 */
export function generateId(topicName?: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);

  let topicHash: string | undefined;
  if (topicName) {
    let hash = 0;
    for (let i = 0; i < topicName.length; i++) {
      hash = (hash << 5) - hash + topicName.charCodeAt(i);
      hash |= 0;
    }
    topicHash = Math.abs(hash).toString(36);
  }

  return `${timestamp}-${topicHash || "notopic"}-${randomPart}`;
}

export function generateSubscriptionId(topicName: string): string {
  return `sub-${generateId(topicName)}`;
}

export function generateMessageId(topicName: string): string {
  return `msg-${generateId(topicName)}`;
}
