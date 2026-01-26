import type { EventMap } from './events';

type Handler<T> = (payload: T) => void;

export class EventBus {
  private static instance: EventBus | null = null;
  private subscribers: Map<keyof EventMap, Set<Handler<any>>> = new Map();

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) EventBus.instance = new EventBus();
    return EventBus.instance;
  }

  on<K extends keyof EventMap>(eventType: K, handler: Handler<EventMap[K]>): () => void {
    const bucket = this.subscribers.get(eventType) ?? new Set();
    bucket.add(handler as Handler<any>);
    this.subscribers.set(eventType, bucket);
    return () => {
      const current = this.subscribers.get(eventType);
      current?.delete(handler as Handler<any>);
    };
  }

  emit<K extends keyof EventMap>(eventType: K, payload: EventMap[K]): void {
    const bucket = this.subscribers.get(eventType);
    if (!bucket) return;
    for (const handler of bucket) {
      handler(payload);
    }
  }
}
