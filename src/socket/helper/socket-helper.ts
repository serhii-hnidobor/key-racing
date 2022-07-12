import { emittedRoomData, roomInterface, userInterface } from "../interfaces";
import { rooms } from "../index";
import { texts } from "../../data";
import { MAXIMUM_USERS_FOR_ONE_ROOM } from "../config";

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const generateRandomTextId = (): number => {
  return getRandomIntInclusive(0, texts.length - 1);
};

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
    if (
      room.timerId === null &&
      room.roomUser.length < MAXIMUM_USERS_FOR_ONE_ROOM
    ) {
      result.push({
        roomName: room.roomName,
        numberOfUser: room.roomUser.length,
      });
    }
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

export {
  getEmitRoomInitValue,
  getRoomIndex,
  getUserInRoomListIndex,
  getUserBySocket,
  getUserRoom,
  getEmitRoomValue,
  allUserNames,
  deleteUserFromRoom,
  findRoomByName,
  checkGameStart,
  initAllUserTextMap,
};
