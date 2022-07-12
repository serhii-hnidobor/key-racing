import { currentText } from "../room.mjs";

export const createElement = ({
  tagName,
  className,
  attributes = {},
  innerElements = [],
}) => {
  const element = document.createElement(tagName);

  if (className) {
    addClass(element, className);
  }

  Object.keys(attributes).forEach((key) =>
    element.setAttribute(key, attributes[key])
  );

  innerElements.forEach((innerElement) => element.append(innerElement));

  return element;
};

export const addClass = (element, className) => {
  const classNames = formatClassNames(className);
  element.classList.add(...classNames);
};

export const removeClass = (element, className) => {
  const classNames = formatClassNames(className);
  element.classList.remove(...classNames);
};

export const getTyppedTextElement = (typpedText, needTypeText) => {
  const result = [];
  for (const symbol of typpedText) {
    result.push(`<span class = 'typped'>${symbol}</span>`);
  }

  for (const symbolIndex in needTypeText) {
    const symbol = needTypeText[symbolIndex];
    if (Number(symbolIndex) === 0) {
      result.push(`<span class = 'nextType'>${symbol}</span>`);
      continue;
    }
    result.push(`<span>${symbol}</span>`);
  }
  return result.join("");
};
export const showGameElement = (timeToEndGame) => {
  const timer = document.getElementById("timer");
  addClass(timer, "display-none");
  const gameTimer = document.getElementById("game-timer");
  gameTimer.innerText = timeToEndGame;
  removeClass(gameTimer, "display-none");
  const textContainer = document.getElementById("text-container");
  textContainer.innerText = currentText.text;
  removeClass(textContainer, "display-none");
};
export const prepareToNewGame = () => {
  const timer = document.getElementById("timer");
  addClass(timer, "display-none");
  const gameTimer = document.getElementById("game-timer");
  addClass(gameTimer, "display-none");
  const textContainer = document.getElementById("text-container");
  addClass(textContainer, "display-none");
  const readyBtn = document.getElementById("ready-btn");
  removeClass(readyBtn, "display-none");
  const quitBtn = document.getElementById("quit-room-btn");
  removeClass(quitBtn, "display-none");
  readyBtn.setAttribute("data-ready", "true");
  readyBtn.innerText = "ready";
  const allUserProgressElement = Array.from(
    document.querySelectorAll(".user-progress")
  );
  allUserProgressElement.forEach((progressElement) =>
    removeClass(progressElement, "finished")
  );
};
export const formatClassNames = (className) =>
  className.split(" ").filter(Boolean);
