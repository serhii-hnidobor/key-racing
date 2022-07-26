import {addClass, getTyppedTextElement, prepareToNewGame, showGameElement,} from "./helpers/domHelper.mjs";
import {showResultsModal} from "./views/modal.mjs";

const COMMENTATOR_MESSAGE_DISPLAY_TIME = 5000;
const COMMENTATOR_TYPING_MESSAGE_TIME = 3000;

const options = {
    strings: [""],
    typeSpeed: 1,
    startDelay: 1000,
    backSpeed: 10,
    loop: false,
    onLastStringBackspaced: (self) => {
    },
};

const typed = (textArray, typingDelay) => {
    const typedTextSpan = document.querySelector(".typed-text");
    typedTextSpan.innerText = "";
    const cursorSpan = document.querySelector(".cursor");
    const erasingDelay = 2;
    const newTextDelay = 5000; // Delay between current and next text
    let textArrayIndex = 0;
    let isExit = false;
    let charIndex = 0;

    const type = () => {
        if (isExit || !textArray) {
            return;
        }
        if (charIndex < textArray[textArrayIndex].length) {
            if (!cursorSpan.classList.contains("typing")) cursorSpan.classList.add("typing");
            typedTextSpan.textContent += textArray[textArrayIndex].charAt(charIndex);
            charIndex++;
            setTimeout(type, typingDelay);
        } else {
            cursorSpan.classList.remove("typing");
            setTimeout(erase, newTextDelay);
        }
    }

    const exit = () => {
        isExit = true;
        textArray = [];
        charIndex = -1;
    };

    const erase = () => {
        if (isExit || !textArray) {
            return;
        }
        if (charIndex > 0) {
            if (!cursorSpan.classList.contains("typing") && !isExit) cursorSpan.classList.add("typing");
            typedTextSpan.textContent = textArray[textArrayIndex].substring(0, charIndex - 1);
            charIndex--;
            setTimeout(erase, erasingDelay);
        } else if (!isExit) {
            cursorSpan.classList.remove("typing");
            textArrayIndex++;
            if (textArrayIndex >= textArray.length) textArrayIndex = 0;
            setTimeout(type, typingDelay + 1100);
        }
    };
    return [type, exit];
};
const getTypedSpeed = (textArray) => {
    const arrayWithSpeed = textArray.map((fragment) => {
        return Math.floor(COMMENTATOR_TYPING_MESSAGE_TIME / fragment.length);
    });
    return Math.max(...arrayWithSpeed);
};
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
        const {typped, needType} = textMap;
        document.getElementById("text-container").innerHTML = getTyppedTextElement(
            typped,
            needType
        );
    });
    let typedArray = [];
    socket.on("COMMENTATOR_SAYS", (commentator_remark) => {
        if (!commentator_remark) {
            return;
        }
        if (typedArray[1]) {
            typedArray[1]();
        }
        const typedSpeed = getTypedSpeed(commentator_remark);
        options.strings = commentator_remark;
        options.typeSpeed = typedSpeed;
        typedArray = typed(commentator_remark, typedSpeed);
        typedArray[0]();
    });

    socket.on("CHANGE_USER_PROGRESS", (user) => {
        const {name, progress} = user;
        const userProgressElement = document.querySelector(
            `.user-progress[data-username="${name}"]`
        );
        userProgressElement.style.width = `${progress}%`;
        if (progress >= 100) {
            addClass(userProgressElement, "finished");
        }
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

export {gameLogicSocketEventInit};
