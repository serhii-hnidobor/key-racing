import {roomSocketEventInit} from "./room.mjs";
import {showMessageModal} from "./views/modal.mjs";
import {gameLogicSocketEventInit} from "./game-logic.mjs";

const username = sessionStorage.getItem("username");

if (!username) {
    window.location.replace("/login");
}
const socket = io("", {query: {username}});

const redirectToLogin = () => {
    window.location.replace("/login");
};

socket.on("CONNECT_ERROR", () => {
    sessionStorage.clear();
    showMessageModal({
        message: "connect error this user already on server",
        onClose: redirectToLogin,
    });
});

roomSocketEventInit(socket, username);
gameLogicSocketEventInit(socket, username);
