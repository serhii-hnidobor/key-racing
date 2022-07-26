import { OBSERVER_EVENT_NAME_TYPE } from "./observer_event_name.enum";

//OBSERVATION PATTERN
class EventObserver {
  private readonly observers;

  constructor() {
    this.observers = {};
  }

  subscribe(fn, EVENT_NAME: OBSERVER_EVENT_NAME_TYPE) {
    if (!this.observers[EVENT_NAME]) {
      this.observers[EVENT_NAME] = [];
    }
    const isThisFnAlreadySubscribe = this.observers[EVENT_NAME].find(
      (observer) => {
        return observer.name === fn.name;
      }
    );
    if (!isThisFnAlreadySubscribe) {
      this.observers[EVENT_NAME].push(fn);
    }
  }

  unsubscribeAll(EVENT_NAME: OBSERVER_EVENT_NAME_TYPE) {
    this.observers[EVENT_NAME] = [];
  }

  broadcast(data, EVENT_NAME: OBSERVER_EVENT_NAME_TYPE) {
    if (!this.observers[EVENT_NAME] || this.observers[EVENT_NAME].length == 0) {
      return;
    }
    this.observers[EVENT_NAME].forEach((subscriber) => subscriber(data));
  }
}

export { EventObserver };
