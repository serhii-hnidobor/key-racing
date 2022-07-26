import _, { random } from "lodash";
import { userInterface } from "../interfaces";
import { interestingFact, joke } from "./joke_and_interesting_fact";
import { SECONDS_FOR_GAME } from "../config";

const getUserPlaceString = _.curry((userName, userPlace) => {
  return `на ${userPlace}-му місці ${userName} гравець`;
});

//PURE FUNCTION CURRY
const getUserPresent = _.curry((userName: string | null, number: number) => {
  return `Під номером ${number} виступає ${userName};`;
});

//PURE HIGHT ORDER FUNCTION
const getInformationAboutPlayer = _.curry(
  (
    playerArray: userInterface[],
    sortPlayersByPlaceFunc: {
      (prev_player: userInterface, cur_players: userInterface): number;
    }
    //getPlayerSpeed: { (player: userInterface): number }
  ) => {
    const commentatorSpeech: string[] = ["Наразі розклад сил такий: "];
    const playersSortedByPlace = playerArray.sort(sortPlayersByPlaceFunc);

    playersSortedByPlace.forEach((player, index) => {
      const place = index + 1;
      const userPlaceString = getUserPlaceString(player.name)(place);
      commentatorSpeech.push(userPlaceString);
    });

    return commentatorSpeech;
  }
);
//PURE FUNCTION
const sortByPlacePlayer = (
  prev_player: userInterface,
  cur_player: userInterface
): number => {
  return cur_player.progress - prev_player.progress;
};

//PURE FUCNTION
const getRandomJokeOrInterestingFact = (): string => {
  const isThisTimeJoke = Boolean(Math.floor(random(0, 1)));
  if (isThisTimeJoke) {
    return _.sample(joke) as string;
  }
  return _.sample(interestingFact) as string;
};

//PURE FUNCTION
const getPlayerOnFinishString = (playerOnFinish: userInterface[]) => {
  const resultStringArray: string[] = [];
  resultStringArray.push(
    `А тим часом деякі гравці вже майже фінішували а саме: \n`
  );
  playerOnFinish.forEach((player) => {
    resultStringArray.push(
      `${player.name} - залишилось здолати ${Math.floor(
        100 - player.progress
      )}%\n`
    );
  });
  return resultStringArray;
};
//PURE FUNCITON CURRY
const getFinishedPlayerString = _.curry(
  (playerFinished: userInterface, place) => {
    return `${place}-м фінішує ${playerFinished.name}`;
  }
);

const getGameResultString = (players: userInterface[]): string => {
  const resultString = ["от і зваершилась гонка а резульати такі: \n"];
  const sortedPlayers = players.sort(sortByPlacePlayer);
  sortedPlayers.forEach((player, index) => {
    const place = index + 1;
    if (place > 3) {
      return;
    }
    resultString.push(
      `${place}-й - ${player.name} подолав дистанцію за ${
        player.finishedTime ? player.finishedTime : SECONDS_FOR_GAME
      } секунд \n`
    );
  });
  return resultString.join("");
};

class CommentatorSpeech {
  private readonly currentCommentatorSpeech: string[];

  constructor() {
    this.currentCommentatorSpeech = [];
    this.onStart = this.onStart.bind(this);
    this.onUserPresent = this.onUserPresent.bind(this);
    this.addSpeech = this.addSpeech.bind(this);
    this.onRandomFactOrJoke = this.onRandomFactOrJoke.bind(this);
    this.getCurrentCommentatorSpeech =
      this.getCurrentCommentatorSpeech.bind(this);
    this.onGameEnd = this.onGameEnd.bind(this);
  }

  getCurrentCommentatorSpeech() {
    return this.currentCommentatorSpeech;
  }

  onStart() {
    this.addSpeech("Отже матч починається.");
    this.addSpeech("Нагадую коментувати цей матч Вам буду я, Ескейп Ентерови.");
    this.addSpeech(
      "я радий вас вітати зі словами Доброго Вам дня пані та панове!"
    );
  }

  onUserPresent(userNames: string[]) {
    const speech: string[] = [];
    userNames.forEach((userName, index) => {
      speech.push(getUserPresent(userName)(index + 1));
    });
    this.addSpeech(speech.join("\n"));
  }

  onRandomFactOrJoke() {
    const speech = getRandomJokeOrInterestingFact();
    this.addSpeech(speech);
  }

  on30SecondUpdate(users: userInterface[]) {
    const speech = getInformationAboutPlayer(users)(sortByPlacePlayer);
    this.addSpeech(speech);
  }

  onPlayersNearFinish(playerOnFinish: userInterface[]) {
    if (playerOnFinish.length) {
      const speech = getPlayerOnFinishString(playerOnFinish);
      this.addSpeech(speech);
    }
  }

  onPlayerFinished(playerFinished, place) {
    const speech = getFinishedPlayerString(playerFinished)(place);
    this.addSpeech(speech);
  }

  onGameEnd(players: userInterface[]) {
    const speech = getGameResultString(players);
    this.addSpeech(speech);
  }

  private addSpeech(fragment) {
    this.currentCommentatorSpeech.push(`${fragment}.`);
  }
}

export { CommentatorSpeech };
