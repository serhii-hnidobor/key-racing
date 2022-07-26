import { EventObserver } from "./eventObserver";
import { Commentator } from "./commentator/commentator";

export interface roomInterface {
  roomName: string;
  roomUser: userInterface[];
  timerId: ReturnType<typeof setInterval> | null;
  timerValue: number | null;
  textId?: number;
  eventObserver: EventObserver;
  commentator?: Commentator;
}

export interface emittedRoomData {
  roomName: string;
  numberOfUser: number;
}

export interface textMap {
  needType: string[];
  typped: string[];
}

export interface userInterface {
  name: string;
  id: string;
  isReady: boolean;
  textMap?: textMap;
  progress: number;
  place: number;
  finishedTime?: number;
  car?: string;
}
