import {addClass, createElement, removeClass} from "../helpers/domHelper.mjs";

const appendRoomElement = ({
                               name, numberOfUsers, onJoin = () => {
    }
                           }) => {
    const roomsContainer = document.querySelector("#rooms-wrapper");

    const nameElement = createElement({
        tagName: "div",
        className: "room-name",
        attributes: {"data-room-name": name},
        innerElements: [name],
    });

    const numberOfUsersString = getNumberOfUsersString(numberOfUsers);
    const connectedUsersElement = createElement({
        tagName: "div",
        className: "connected-users",
        attributes: {
            "data-room-name": name,
            "data-room-number-of-users": numberOfUsers,
        },
        innerElements: [numberOfUsersString],
    });

    const joinButton = createElement({
        tagName: "button",
        className: "join-btn",
        attributes: {"data-room-name": name},
        innerElements: ["Join"],
    });

    const roomElement = createElement({
        tagName: "div",
        className: "room",
        attributes: {"data-room-name": name},
        innerElements: [nameElement, connectedUsersElement, joinButton],
    });

    roomsContainer.append(roomElement);

    joinButton.addEventListener("click", onJoin);

    return roomElement;
};

const updateNumberOfUsersInRoom = ({name, numberOfUsers}) => {
    const roomConnectedUsersElement = document.querySelector(
        `.connected-users[data-room-name='${name}']`
    );
    roomConnectedUsersElement.innerText = getNumberOfUsersString(numberOfUsers);
    roomConnectedUsersElement.dataset.roomNumberOfUsers = numberOfUsers;
};

const getNumberOfUsersString = (numberOfUsers) => `${numberOfUsers} connected`;

const displayRoomList = () => {
    const gamePage = document.getElementById("game-page");
    addClass(gamePage, "display-none");
    const roomContainer = document.getElementById("rooms-page");
    removeClass(roomContainer, "display-none");
};

const displayGameRoom = (roomName) => {
    const gamePage = document.getElementById("game-page");
    removeClass(gamePage, "display-none");
    const roomContainer = document.getElementById("rooms-page");
    addClass(roomContainer, "display-none");
    const roomNameElement = document.getElementById("room-name");
    roomNameElement.innerText = roomName;
    const allModal = Array.from(document.querySelectorAll(".modal"));
    allModal.forEach((modal) => modal.remove());
};

const removeRoomElement = (name) =>
    document.querySelector(`.room[data-room-name='${name}']`)?.remove();

export {
    appendRoomElement,
    updateNumberOfUsersInRoom,
    removeRoomElement,
    displayRoomList,
    displayGameRoom,
};
