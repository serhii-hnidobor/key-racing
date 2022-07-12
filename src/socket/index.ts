import { Server } from "socket.io";
import {
  MAXIMUM_USERS_FOR_ONE_ROOM,
  SECONDS_FOR_GAME,
  SECONDS_TIMER_BEFORE_START_GAME,
} from "./config";
import { texts } from "../data";

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const rooms: roomInterface[] = [];
interface roomInterface {
  roomName: string;
  roomUser: userInterface[];
  timerId: ReturnType<typeof setInterval> | null;
  timerValue: number | null;
  textId?: number;
}
interface emittedRoomData {
  roomName: string;
  numberOfUser: number;
}
interface textMap {
  needType: string[];
  typped: string[];
}

interface userInterface {
  name: string;
  id: string;
  isReady: boolean;
  textMap?: textMap;
  progress: number;
  place: number;
}
const initAllUserTextMap = (room: roomInterface, text: string): void => {
  for (const user of room.roomUser) {
    user.textMap = {
      needType: text.split(""),
      typped: [],
    };
  }
};
const checkGameStart = (room: roomInterface): boolean => {
  if (room.roomUser.length > 1) {
    for (const user of room.roomUser) {
      if (!user.isReady) {
        return false;
      }
    }
    return true;
  }
  return false;
};
const getUserBySocket = (socket): null | userInterface => {
  for (const room of rooms) {
    const allRoomUser = room.roomUser;
    const requiredUser = allRoomUser.find(
      (curUser) => curUser.id === socket.id
    );
    if (requiredUser) {
      return requiredUser;
    }
  }
  return null;
};
const getUserRoom = (socket): roomInterface | null => {
  for (const room of rooms) {
    const roomUsers = room.roomUser;
    const roomUser = roomUsers.find((user) => user.id === socket.id);
    if (roomUser) {
      return room;
    }
  }
  return null;
};
const deleteUserFromRoom = (room: roomInterface, socket): void => {
  room.roomUser = room.roomUser.filter((user) => {
    return user.id !== socket.id;
  });
};
const getUserInRoomListIndex = (room, userName) => {
  const allRoomUser = room.roomUser;
  return allRoomUser.findIndex((user) => user.name === userName);
};
const getRoomIndex = (room) => {
  return rooms.findIndex((curRoom) => curRoom === room);
};
const findRoomByName = (roomName: string): roomInterface | null => {
  for (const room of rooms) {
    if (room.roomName === roomName) {
      return room;
    }
  }
  return null;
};
let allUserNames: string[] = [];
const getEmitRoomInitValue = () => {
  const result: emittedRoomData[] = [];
  for (const room of rooms) {
    result.push({
      roomName: room.roomName,
      numberOfUser: room.roomUser.length,
    });
  }
  return result;
};
const getEmitRoomValue = (room): emittedRoomData | null => {
  if (!room) {
    return null;
  }
  return {
    roomName: room.roomName,
    numberOfUser: room.roomUser.length,
  };
};
export default (io: Server) => {
  io.on("connection", (socket): void => {
    const username: string | null = socket.handshake.query.username as string;
    /* ERROR*/
    if (allUserNames.includes(username) || !username) {
      socket.emit("CONNECT_ERROR");
      return;
    }

    socket.emit("ROOM_INIT", getEmitRoomInitValue());
    allUserNames.push(username);
    const onUserExit = () => {
      const room = getUserRoom(socket);
      if (room) {
        io.to(room.roomName).emit("USER_LEAVE", getUserBySocket(socket));
        deleteUserFromRoom(room, socket);
        if (room.roomUser.length === 0) {
          const roomIndex = getRoomIndex(room);
          rooms.splice(roomIndex, 1);
          io.emit("DELETE_ROOM", getEmitRoomValue(room));
        }
      }
      const userInAllUserNameIndex = allUserNames.findIndex(
        (user) => user === username
      );
      allUserNames.splice(userInAllUserNameIndex, 1);
      io.emit("UPDATE_ROOM_USER_NUM", getEmitRoomValue(room));
    };
    socket.on("disconnect", () => {
      onUserExit();
    });
    //-----------------------------------------
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
      io.emit("UPDATE_ROOM_USER_NUM", getEmitRoomValue(room));
      io.to(roomName).emit(
        "NEW_USER_JOIN",
        currentRoomUsers[currentRoomUsers.length - 1]
      );
    });

    let preGameTimerController = function (this: roomInterface): void {
      if (this.timerValue === 0 && this.timerId) {
        clearInterval(this.timerId);
        io.to(this.roomName).emit("GAME_START", SECONDS_FOR_GAME);
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
        game_over(this);
        return;
      }
      if (this.timerValue) {
        this.timerValue--;
        io.to(this.roomName).emit("GAME_TIMER_CHANGE", this.timerValue);
      }
    };
    socket.on("USER_CHANGE_READY_STATUS", (isReady) => {
      const room = getUserRoom(socket);
      const userIndex = getUserInRoomListIndex(room, username);
      if (room) {
        room.roomUser[userIndex].isReady = isReady;
        io.to(room.roomName).emit("CHANGE_USER_READY", { username, isReady });
        if (checkGameStart(room)) {
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
        }
      }
    });

    socket.on("CREATE_ROOM", (roomId: string) => {
      if (rooms.find((room) => room.roomName === roomId)) {
        socket.emit("CREATE_ROOM_ERROR");
        return;
      }

      rooms.push({
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
      });
      socket.join(roomId);
      socket.emit("CREATE_ROOM_SUCCESS");
      const currentRoomUsers = rooms[rooms.length - 1].roomUser;
      socket.emit("NEW_USER_JOIN", currentRoomUsers[0]);
      io.emit("ADDED_ROOM", getEmitRoomValue(rooms[rooms.length - 1]));
    });

    const generateRandomTextId = (): number => {
      return getRandomIntInclusive(0, texts.length - 1);
    };
    socket.on("QUIT_ROOM", (roomName) => {
      const currentRoom = rooms.find((room) => room.roomName === roomName);
      if (currentRoom) {
        onUserExit();
        socket.emit("ROOM_INIT", getEmitRoomInitValue());
      }
    });
    /* game logic*/
    const getAllUserPlaces = (room): number[] => {
      const result: number[] = [];
      for (const user of room.roomUser) {
        if (user.place > 0) {
          result.push(user.place);
        }
      }
      return result;
    };
    const getUserByPlace = (room, place: number): userInterface | null => {
      for (const user of room.roomUser) {
        if (user.place === place) {
          return user;
        }
      }
      return null;
    };
    const getUserWithoutPlace = (room): userInterface[] => {
      const result: userInterface[] = [];
      for (const user of room.roomUser) {
        if (user.place === 0) {
          result.push(user);
        }
      }
      return result;
    };
    const listUserNamesFromUserArray = (
      userArray: userInterface[]
    ): string[] => {
      const result: string[] = [];
      for (const user of userArray) {
        result.push(user.name);
      }
      return result;
    };
    const allUserTyppedTextCheck = (room) => {
      const userThatEndTypeText: userInterface[] = [];
      for (const user of room.roomUser) {
        if (user.textMap.needType.length === 0) {
          userThatEndTypeText.push(user);
        }
      }
      if (userThatEndTypeText.length === room.roomUser.length) {
        clearInterval(room.timerId);
        room.timerId = null;
        game_over(room);
      }
    };
    const resetUserReady = (room: roomInterface) => {
      for (const user of room.roomUser) {
        user.isReady = false;
        user.place = 0;
        user.progress = 0;
      }
      io.to(room.roomName).emit("ROOM_USER_INIT", room.roomUser);
    };
    const game_over = (room) => {
      const winner_list: string[] = [];
      const allPlaces = getAllUserPlaces(room);
      if (allPlaces === room.roomUser) {
        const userSortedByPlace = room.roomUser.sort(
          (prevUser: userInterface, curUser: userInterface): number => {
            return curUser.place - prevUser.place;
          }
        );
        io.to(room.roomName).emit("GAME_OVER", userSortedByPlace);
        resetUserReady(room);
        return;
      }
      let i: number;
      for (i = 1; i <= MAXIMUM_USERS_FOR_ONE_ROOM; i++) {
        const userByPlace = getUserByPlace(room, i);
        if (userByPlace) {
          winner_list.push(userByPlace.name);
        }
      }
      let userWithoutPlace = getUserWithoutPlace(room);
      userWithoutPlace = userWithoutPlace.sort(
        (prevUser: userInterface, curUser: userInterface): number => {
          return curUser.progress - prevUser.progress;
        }
      );
      winner_list.push(...listUserNamesFromUserArray(userWithoutPlace));
      resetUserReady(room);
      io.to(room.roomName).emit("GAME_OVER", winner_list);
    };

    const setUserPlace = (room, user) => {
      const allUserPlace: number[] = getAllUserPlaces(room);
      if (allUserPlace.length === 0) {
        user.place = 1;
        return;
      }
      user.place = Math.max(...allUserPlace) + 1;
    };

    socket.on("USER_KEY_PRESS", (keyValue: string) => {
      const user = getUserBySocket(socket);
      const room = getUserRoom(socket);
      if (user && user.textMap) {
        const userNeedType = user.textMap.needType;
        if (keyValue == userNeedType[0] && room?.textId && room.timerId) {
          const typpedSymbol = userNeedType.shift();
          if (userNeedType.length == 0) {
            setUserPlace(room, user);
          }
          user.textMap.typped.push(typpedSymbol as string);
          user.progress =
            100 -
            ((userNeedType?.length as number) * 100) /
              texts[room.textId].length;
          socket.emit("UPDATE_TEXT", user.textMap);
          io.to(room.roomName).emit("CHANGE_USER_PROGRESS", user);
          allUserTyppedTextCheck(room);
        }
      }
    });
  });
};
export { roomInterface };
