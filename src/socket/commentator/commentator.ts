import { roomInterface, userInterface } from "../interfaces";
import { OBSERVER_EVENT_NAME } from "../observer_event_name.enum";
import { SECONDS_FOR_GAME } from "../config";
import { CommentatorSpeech } from "./comentator-text.enums";

// PURE FUNCTION
const getUserNameByUserArray = (userArray: userInterface[]): string[] => {
  return userArray.map((user) => user.name);
};
//PURE FUNCTION
const getTimeToDisplayMessage = (messageArray) => {
  return 15;
};

// PURE FUNCTION
const getPlayersPlayerOnNearFinish = (
  players: userInterface[],
  alredyDeclarated: userInterface[]
): userInterface[] => {
  return players.filter((players) => {
    const isThisUserAlreadyDeclarated = alredyDeclarated.find((player) => {
      return player.id === players.id;
    });
    return players.progress >= 90 && !isThisUserAlreadyDeclarated;
  });
};

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

class Commentator {
  private _room: roomInterface;
  private _io: any;
  private _speech;
  private _timeFromLastMessage: number;
  private _userOnFinishAlreadyDeclarated: userInterface[];
  private _finishedPlayer: userInterface[];

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
    this._speech.onStart();
    this._speech.onUserPresent(getUserNameByUserArray(this._room.roomUser));
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
    this._io
      .to(this._room.roomName)
      .emit("COMMENTATOR_SAYS", [speech[speech.length - 1]]);
    this._timeFromLastMessage = getTimeToDisplayMessage(speech);
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

class proxyCommentatorLogger {
  private CommentatorObj: Commentator;

  constructor(commentator: Commentator) {
    this.CommentatorObj = commentator;
  }
}

export { Commentator };
