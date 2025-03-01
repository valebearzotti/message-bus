/**
 * Represents the structure of a topic following the domain.entity.action pattern
 * Examples: "user.profile.updated", "order.payment.processed"
 * Ideally you'd want this typed separately, writing your Domain, Entity and Action types and then using them here, to ensure full type safety.
 * In that case the TopicPattern would be `${Domain}.${Entity}.${Action}` and highly tighted to your models.
 */
export type TopicPattern = `${string}.${string}.${string}`;

/**
 * Describes the payload type for each topic in the application.
 */
export type TopicMap = {
  [key: TopicPattern]: unknown;
};

/**
 * Type helper to extract the payload type for a specific topic
 */
export type PayloadType<
  TMap extends TopicMap,
  Topic extends keyof TMap
> = TMap[Topic];

/**
 * Type helper to extract all available topics from a topic map
 */
export type AvailableTopic<TMap extends TopicMap> = keyof TMap & string;
