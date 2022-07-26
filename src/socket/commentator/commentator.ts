import { roomInterface, userInterface } from "../interfaces";
import {
  FACTORY_ENUM_TYPE,
  FACTORY_ENUMS,
  OBSERVER_EVENT_NAME,
} from "../observer_event_name.enum";
import { SECONDS_FOR_GAME } from "../config";
import { cars, CommentatorSpeech } from "./comentator-text.enums";
import _ from "lodash";
import {
  COMMENTATOR_MESSAGE_DISPLAY_TIME,
  COMMENTATOR_TYPING_MESSAGE_TIME,
} from "../../appEnums";

//PURE FUNCTION
const getTimeToDisplayMessage = () => {
  return COMMENTATOR_MESSAGE_DISPLAY_TIME + COMMENTATOR_TYPING_MESSAGE_TIME;
};

// PURE FUNCTION
const getPlayersPlayerOnNearFinish = _.curry(
  (
    players: userInterface[],
    alredyDeclarated: userInterface[]
  ): userInterface[] => {
    return players.filter((players) => {
      const isThisUserAlreadyDeclarated = alredyDeclarated.find((player) => {
        return player.id === players.id;
      });
      return players.progress >= 90 && !isThisUserAlreadyDeclarated;
    });
  }
);

// PURE FUNCTION
const getFinishedPlayer = (
  players: userInterface[],
  alreadyFinished: userInterface[]
): userInterface | undefined => {
  return players.find((players) => {
    const isThisUserAlreadyFinished = alreadyFinished.find((player) => {
      return player.id === players.id;
    });
    return players.progress >= 100 && !isThisUserAlreadyFinished;
  });
};

const getUserWithCarArray = (users: userInterface[]): userInterface[] => {
  return users.map((user) => {
    const userWithCar = Object.assign({}, user);
    userWithCar.car = _.sample(cars);
    return userWithCar;
  });
};

class Commentator {
  private _room: roomInterface;
  private _io: any;
  private _speech;
  private _timeFromLastMessage: number;
  private readonly _userOnFinishAlreadyDeclarated: userInterface[];
  private _finishedPlayer: userInterface[];
  private _adapter: Adapter;

  constructor(io, room: roomInterface) {
    this._io = io;
    this._room = room;
    this._speech = new CommentatorSpeech();
    this.beforeGameStart = this.beforeGameStart.bind(this);
    this.mainLogic = this.mainLogic.bind(this);
    this.emitSpeech = this.emitSpeech.bind(this);
    this.exitGame = this.exitGame.bind(this);
    this._userOnFinishAlreadyDeclarated = [];
    this._room.eventObserver.subscribe(
      this.beforeGameStart,
      OBSERVER_EVENT_NAME.PRE_GAME_TIMER_START
    );
    this._adapter = new Adapter("io", io);
    this._room.eventObserver.subscribe(
      this.mainLogic,
      OBSERVER_EVENT_NAME.GAME_TIMER_CHANGE
    );
    this._room.eventObserver.subscribe(
      this.exitGame,
      OBSERVER_EVENT_NAME.GAME_END
    );
    this._timeFromLastMessage = -1;
    this._finishedPlayer = [];
  }

  beforeGameStart() {
    const userWithCar = getUserWithCarArray(this._room.roomUser);
    Object.assign(this._room.roomUser, userWithCar);
    this._speech.onStart();
    this._speech.onUserPresent(this._room.roomUser);
    const speech = this._speech.getCurrentCommentatorSpeech();
    this._io.to(this._room.roomName).emit("COMMENTATOR_SAYS", speech);
    this._timeFromLastMessage = 3;
  }

  exitGame() {
    this._speech.onGameEnd(this._room.roomUser);
    this.emitSpeech();
    this._timeFromLastMessage = -1;
    this._finishedPlayer = [];
  }

  emitSpeech() {
    const speech = this._speech.getCurrentCommentatorSpeech();
    this._adapter.makeResponse(
      [_.last(speech)],
      "COMMENTATOR_SAYS",
      this._room.roomName
    );
    this._timeFromLastMessage = getTimeToDisplayMessage();
  }

  mainLogic(currentTimeValue) {
    this._timeFromLastMessage--;
    const userNearFinish = getPlayersPlayerOnNearFinish(
      this._room.roomUser,
      this._userOnFinishAlreadyDeclarated
    );
    const finishedPlayer = getFinishedPlayer(
      this._room.roomUser,
      this._finishedPlayer
    );
    if (!(currentTimeValue % 30)) {
      const roomUser = this._room.roomUser;
      this._speech.on30SecondUpdate(roomUser);
      this.emitSpeech();
    } else if (userNearFinish.length) {
      this._speech.onPlayersNearFinish(userNearFinish);
      this.emitSpeech();
      this._userOnFinishAlreadyDeclarated.push(...userNearFinish);
    } else if (finishedPlayer) {
      finishedPlayer.finishedTime = SECONDS_FOR_GAME - currentTimeValue;
      this._speech.onPlayerFinished(
        finishedPlayer,
        this._finishedPlayer.length + 1
      );
      this._finishedPlayer.push(finishedPlayer);
      this.emitSpeech();
      this._userOnFinishAlreadyDeclarated.push(...userNearFinish);
    } else if (!this._timeFromLastMessage) {
      this._speech.onRandomFactOrJoke();
      this.emitSpeech();
    }
  }
}

//FACTORY
class CommentatorFactory {
  public facroty(
    commentatorName: FACTORY_ENUM_TYPE,
    io?: any,
    room?: any
  ): Commentator | undefined {
    switch (commentatorName) {
      case FACTORY_ENUMS.COMMENTATOR:
        const isRoomAndIoProvided = io && room;
        return isRoomAndIoProvided ? new Commentator(io, room) : undefined;
    }
  }
}

//FACADE
class Adapter {
  private name;
  private Adapter;

  constructor(adapterName, io = null) {
    this.name = adapterName;
    this.setAdapterName = this.setAdapterName.bind(this);
    this.getAdapterName = this.getAdapterName.bind(this);
    if (adapterName === "io" && io) {
      this.Adapter = new IOAdapter(io);
    } else {
      this.Adapter = null;
    }
  }

  makeResponse(responseData: any, eventName?: string, roomName?: string) {
    switch (this.name) {
      case "io":
        const isEventAndRoomNameProvided = eventName && roomName;
        isEventAndRoomNameProvided
          ? this.makeResponseByIOToRoom(responseData, eventName, roomName)
          : null;
    }
  }

  setAdapterName(newName: string): void {
    this.name = newName;
  }

  getAdapterName(): string {
    return this.name;
  }

  private makeResponseByIOToRoom(
    responseData: any,
    eventName: string,
    roomName: string
  ) {
    this.Adapter.sendResponseToClientFromRoom(
      responseData,
      eventName,
      roomName
    );
  }
}

class IOAdapter {
  private _io: any;

  constructor(io) {
    this._io = io;
  }

  sendResponseToClientFromRoom(
    responseData: any,
    eventName: string,
    roomName: string
  ) {
    this._io.to(roomName).emit(eventName, responseData);
  }
}

export { Commentator, CommentatorFactory };
