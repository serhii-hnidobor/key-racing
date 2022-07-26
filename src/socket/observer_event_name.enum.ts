enum OBSERVER_EVENT_NAME_ENUM {
  GAME_START,
  GAME_END,
  GAME_TIMER_CHANGE,
  PRE_GAME_TIMER_START,
  ROOM_CREATE,
  ROOM_NEW_USER,
  ROOM_USER_LEAVE,
}

type OBSERVER_EVENT_NAME_TYPE = keyof typeof OBSERVER_EVENT_NAME_ENUM;

interface I_OBSERVER_EVENT_NAME {
  GAME_START: OBSERVER_EVENT_NAME_TYPE;
  GAME_END: OBSERVER_EVENT_NAME_TYPE;
  GAME_TIMER_CHANGE: OBSERVER_EVENT_NAME_TYPE;
  PRE_GAME_TIMER_START: OBSERVER_EVENT_NAME_TYPE;
  ROOM_CREATE: OBSERVER_EVENT_NAME_TYPE;
  ROOM_NEW_USER: OBSERVER_EVENT_NAME_TYPE;
  ROOM_USER_LEAVE: OBSERVER_EVENT_NAME_TYPE;
}

const OBSERVER_EVENT_NAME: I_OBSERVER_EVENT_NAME = {
  GAME_START: "GAME_START",
  GAME_END: "GAME_END",
  GAME_TIMER_CHANGE: "GAME_TIMER_CHANGE",
  PRE_GAME_TIMER_START: "PRE_GAME_TIMER_START",
  ROOM_CREATE: "ROOM_CREATE",
  ROOM_NEW_USER: "ROOM_NEW_USER",
  ROOM_USER_LEAVE: "ROOM_USER_LEAVE",
};

export { OBSERVER_EVENT_NAME_TYPE, OBSERVER_EVENT_NAME };
