type EventKey = string;
type SubscriptionId = number;

export class Events {
  eventsToSubscribers = new Map<
    EventKey,
    Map<SubscriptionId, (...args: any[]) => void>
  >();
  nextSubscriberId: SubscriptionId = 0;

  dispatch(eventKey: EventKey, ...args: any[]): void {
    const eventSubscribers = this.eventsToSubscribers.get(eventKey);
    if (eventSubscribers) {
      for (const callback of eventSubscribers.values()) {
        callback(...args);
      }
    }
  }

  subscribe(
    eventKey: EventKey,
    callback: (...args: any[]) => void
  ): SubscriptionId {
    const id = this.nextSubscriberId++;
    if (!this.eventsToSubscribers.has(eventKey)) {
      this.eventsToSubscribers.set(eventKey, new Map());
    }
    this.eventsToSubscribers.get(eventKey)!.set(id, callback);
    return id;
  }

  unsubscribe(subscriptionId: SubscriptionId): void {
    for (const [
      eventKey,
      eventSubscribers,
    ] of this.eventsToSubscribers.entries()) {
      if (eventSubscribers.delete(subscriptionId)) {
        if (eventSubscribers.size === 0) {
          this.eventsToSubscribers.delete(eventKey);
        }
        return;
      }
    }
  }

  reset(): void {
    this.eventsToSubscribers.clear();
  }
}
