import { Server } from "socket.io";
import {
  MAXIMUM_USERS_FOR_ONE_ROOM,
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
interface userInterface {
  name: string;
  id: string;
  isReady: boolean;
}

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
export default (io: Server) => {
  io.on("connection", (socket): void => {
    const username: string | null = socket.handshake.query.username as string;
    if (allUserNames.includes(username) || !username) {
      socket.emit("CONNECT_ERROR");
      return;
    }

    socket.emit("ROOM_INIT", rooms);
    allUserNames.push(username);
    const onUserExit = () => {
      /* rooms.forEach((room,index)=>{
					const roomUser = room.roomUser;
					const disconnectUserRoom = roomUser.find (user => user.id === socket.id);
					if (disconnectUserRoom){
						room.roomUser = room.roomUser.filter((el)=> el !== disconnectUserRoom);
						if (room.roomUser.length === 0){
							rooms.splice(index,1);
						}
						allUserNames = allUserNames.filter((userName)=> userName !== disconnectUserRoom.name);
						io.to(room.roomName).emit('USER_LEAVE', disconnectUserRoom);

					}
				}
			) */
      const room = getUserRoom(socket);
      if (room) {
        deleteUserFromRoom(room, socket);
        if (room.roomUser.length === 0) {
          const roomIndex = getRoomIndex(room);
          rooms.splice(roomIndex, 1);
          io.emit("DELETE_ROOM", room);
        }
        io.to(room.roomName).emit("USER_LEAVE", getUserRoom(socket));
      }
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
      });

      socket.join(roomName);
      socket.emit("JOIN_SUCCESS", roomName);
      io.emit("UPDATE_ROOM_USER_NUM", room);
      io.to(roomName).emit(
        "NEW_USER_JOIN",
        currentRoomUsers[currentRoomUsers.length - 1]
      );
    });

    let preGameTimerController = function (this: roomInterface): void {
      if (this.timerValue === 0 && this.timerId) {
        clearInterval(this.timerId);
        io.to(this.roomName).emit("GAME_START");
        return;
      }
      if (this.timerValue) {
        this.timerValue--;
        io.to(this.roomName).emit("TIMER_BEFORE_START_CHANGE", this.timerValue);
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
          },
        ],
        timerId: null,
        timerValue: null,
      });
      socket.join(roomId);
      socket.emit("CREATE_ROOM_SUCCESS");
      const currentRoomUsers = rooms[rooms.length - 1].roomUser;
      socket.emit("NEW_USER_JOIN", currentRoomUsers[0]);
      io.emit("ADDED_ROOM", rooms[rooms.length - 1]);
    });

    const generateRandomTextId = (): number => {
      return getRandomIntInclusive(0, texts.length - 1);
    };
    socket.on("QUIT_ROOM", (roomName) => {
      const currentRoom = rooms.find((room) => room.roomName === roomName);
      if (currentRoom) {
        onUserExit();
        socket.emit("ROOM_INIT", rooms);
      }
    });
  });
};
export { roomInterface };
