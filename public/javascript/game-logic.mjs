import {
  getTyppedTextElement,
  prepareToNewGame,
  showGameElement,
} from "./helpers/domHelper.mjs";
import { showResultsModal } from "./views/modal.mjs";

const gameLogicSocketEventInit = (socket) => {
  const onKeyPressed = (event) => {
    const keyValue = String.fromCharCode(event.charCode);
    socket.emit("USER_KEY_PRESS", keyValue);
  };

  socket.on("GAME_START", (timeToEndGame) => {
    showGameElement(timeToEndGame);
    document.addEventListener("keypress", onKeyPressed);
  });
  socket.on("UPDATE_TEXT", (textMap) => {
    const { typped, needType } = textMap;
    document.getElementById("text-container").innerHTML = getTyppedTextElement(
      typped,
      needType
    );
  });
  socket.on("CHANGE_USER_PROGRESS", (user) => {
    const { name, progress } = user;
    const userProgressElement = document.querySelector(
      `.user-progress[data-username="${name}"]`
    );
    userProgressElement.style.width = `${progress}%`;
  });
  socket.on("GAME_OVER", (winner_list) => {
    document.removeEventListener("keypress", onKeyPressed);
    showResultsModal({
      usersSortedArray: winner_list,
      onClose: prepareToNewGame,
    });
  });

  socket.on("GAME_TIMER_CHANGE", (newValue) => {
    const timer = document.getElementById("game-timer");
    timer.innerText = newValue;
  });
};

export { gameLogicSocketEventInit };
