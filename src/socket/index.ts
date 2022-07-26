import { Server } from "socket.io";
import {
  MAXIMUM_USERS_FOR_ONE_ROOM,
  SECONDS_FOR_GAME,
  SECONDS_TIMER_BEFORE_START_GAME,
} from "./config";
import { texts } from "../data";
import { roomInterface, userInterface } from "./interfaces";
import { game_over } from "./helper/game-logic-helper";
import {
  allUserNames,
  checkGameStart,
  deleteUserFromRoom,
  findRoomByName,
  generateRandomTextId,
  getEmitRoomInitValue,
  getEmitRoomValue,
  getRoomIndex,
  getUserBySocket,
  getUserInRoomListIndex,
  getUserRoom,
  initAllUserTextMap,
} from "./helper/socket-helper";
import { gameLogicInit } from "./game-logic";
import { EventObserver } from "./eventObserver";
import { Commentator } from "./commentator/commentator";
import { OBSERVER_EVENT_NAME } from "./observer_event_name.enum";

export const rooms: roomInterface[] = [];

export default (io: Server) => {
  io.on("connection", (socket): void => {
    const username: string | null = socket.handshake.query.username as string;
    /* ERROR*/
    if (allUserNames.includes(username) || !username) {
      socket.emit("CONNECT_ERROR");
      return;
    }
    /* game logic*/
    gameLogicInit(io, socket);
    socket.emit("ROOM_INIT", getEmitRoomInitValue());
    allUserNames.push(username);
    const onUserExit = () => {
      const room = getUserRoom(socket);
      if (room && room.timerId !== null) {
        io.to(room.roomName).emit("USER_LEAVE", getUserBySocket(socket));
        deleteUserFromRoom(room, socket);
        const userInAllUserNameIndex = allUserNames.findIndex(
          (user) => user === username
        );
        allUserNames.splice(userInAllUserNameIndex, 1);
        const userThatEndTypeText: userInterface[] = [];
        /* check game over*/
        for (const user of room.roomUser) {
          if (user.textMap?.needType.length === 0) {
            userThatEndTypeText.push(user);
          }
        }
        if (userThatEndTypeText.length === room.roomUser.length) {
          clearInterval(room.timerId);
          room.timerId = null;
          game_over(room, io);
        }
        if (room.roomUser.length === 0) {
          const roomIndex = getRoomIndex(room);
          if (room.timerId) {
            clearInterval(room.timerId);
          }
          rooms.splice(roomIndex, 1);
          io.emit("DELETE_ROOM", getEmitRoomValue(room));
        }
        return;
      } else if (room && room.timerId === null) {
        io.to(room.roomName).emit("USER_LEAVE", getUserBySocket(socket));
        deleteUserFromRoom(room, socket);
        if (room.roomUser.length === 0) {
          const roomIndex = getRoomIndex(room);
          if (room.timerId) {
            clearInterval(room.timerId);
          }
          rooms.splice(roomIndex, 1);
          io.emit("DELETE_ROOM", getEmitRoomValue(room));
        } else {
          if (checkGameStart(room)) {
            gameStart(room);
          }
        }
      }

      io.emit("ROOM_INIT", getEmitRoomInitValue());
      const userInAllUserNameIndex = allUserNames.findIndex(
        (user) => user === username
      );
      allUserNames.splice(userInAllUserNameIndex, 1);
    };

    socket.on("disconnect", () => {
      onUserExit();
    });

    socket.on("JOIN_ROOM", (roomName: string): void => {
      const room = findRoomByName(roomName);
      if (
        !room ||
        (room && room.roomUser.length === MAXIMUM_USERS_FOR_ONE_ROOM)
      ) {
        socket.emit("ERROR_JOIN_ROOM");
        return;
      }
      socket.emit("ROOM_USER_INIT", room.roomUser);
      const currentRoomUsers = room.roomUser;

      currentRoomUsers.push({
        name: username,
        isReady: false,
        id: socket.id,
        progress: 0,
        place: 0,
      });

      socket.join(roomName);
      socket.emit("JOIN_SUCCESS", roomName);
      io.emit("ROOM_INIT", getEmitRoomInitValue());
      io.to(roomName).emit(
        "NEW_USER_JOIN",
        currentRoomUsers[currentRoomUsers.length - 1]
      );
    });

    let preGameTimerController = function (this: roomInterface): void {
      if (this.timerValue === 0 && this.timerId) {
        clearInterval(this.timerId);
        io.to(this.roomName).emit("GAME_START", SECONDS_FOR_GAME);
        this.eventObserver.broadcast(null, OBSERVER_EVENT_NAME.GAME_START);
        this.timerValue = SECONDS_FOR_GAME;
        this.timerId = setInterval(gameTimerController, 1000);
        return;
      }
      if (this.timerValue) {
        this.timerValue--;
        io.to(this.roomName).emit("TIMER_BEFORE_START_CHANGE", this.timerValue);
      }
    };
    let gameTimerController = function (this: roomInterface): void {
      if (this.timerValue === 0 && this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
        this.eventObserver.broadcast(null, OBSERVER_EVENT_NAME.GAME_END);
        game_over(this, io);
        return;
      }
      if (this.timerValue) {
        this.timerValue--;
        io.to(this.roomName).emit("GAME_TIMER_CHANGE", this.timerValue);
        this.eventObserver.broadcast(
          this.timerValue,
          OBSERVER_EVENT_NAME.GAME_TIMER_CHANGE
        );
      }
    };
    const gameStart = (room) => {
      const textId: number = generateRandomTextId();
      io.to(room.roomName).emit("PRE_GAME_TIMER_START", {
        timeToStart: SECONDS_TIMER_BEFORE_START_GAME,
        textId: textId,
      });
      room.textId = textId;
      room.timerValue = SECONDS_TIMER_BEFORE_START_GAME;
      preGameTimerController = preGameTimerController.bind(room);
      gameTimerController = gameTimerController.bind(room);
      initAllUserTextMap(room, texts[textId]);
      room.timerId = setInterval(preGameTimerController, 1000);
      room.eventObserver.broadcast(
        null,
        OBSERVER_EVENT_NAME.PRE_GAME_TIMER_START
      );
      io.emit("ROOM_INIT", getEmitRoomInitValue());
    };
    socket.on("USER_CHANGE_READY_STATUS", (isReady) => {
      const room = getUserRoom(socket);
      if (!room) {
        return;
      }
      const userIndex = getUserInRoomListIndex(room, username);
      if (room) {
        room.roomUser[userIndex].isReady = isReady;
        io.to(room.roomName).emit("CHANGE_USER_READY", { username, isReady });
        if (checkGameStart(room)) {
          gameStart(room);
        }
      }
    });

    socket.on("CREATE_ROOM", (roomId: string) => {
      if (rooms.find((room) => room.roomName === roomId)) {
        socket.emit("CREATE_ROOM_ERROR");
        return;
      }
      const newEventObserver = new EventObserver();

      const newRoom: roomInterface = {
        roomName: roomId,
        roomUser: [
          {
            name: username,
            isReady: false,
            id: socket.id,
            progress: 0,
            place: 0,
          },
        ],
        timerId: null,
        timerValue: null,
        eventObserver: newEventObserver,
      };
      const newCommentator = new Commentator(io, newRoom);
      newRoom.commentator = newCommentator;
      rooms.push(newRoom);
      socket.join(roomId);
      socket.emit("CREATE_ROOM_SUCCESS");
      const currentRoomUsers = rooms[rooms.length - 1].roomUser;
      socket.emit("NEW_USER_JOIN", currentRoomUsers[0]);
      io.emit("ADDED_ROOM", getEmitRoomValue(rooms[rooms.length - 1]));
    });

    socket.on("QUIT_ROOM", (roomName) => {
      const currentRoom = rooms.find((room) => room.roomName === roomName);
      if (currentRoom) {
        onUserExit();
        socket.emit("ROOM_INIT", getEmitRoomInitValue());
      }
    });
  });
};
export { roomInterface };
