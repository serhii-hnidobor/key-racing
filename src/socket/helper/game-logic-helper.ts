import { roomInterface, userInterface } from "../interfaces";
import { MAXIMUM_USERS_FOR_ONE_ROOM } from "../config";

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
const listUserNamesFromUserArray = (userArray: userInterface[]): string[] => {
  const result: string[] = [];
  for (const user of userArray) {
    result.push(user.name);
  }
  return result;
};
const allUserTyppedTextCheck = (room, io) => {
  const userThatEndTypeText: userInterface[] = [];
  for (const user of room.roomUser) {
    if (user.textMap.needType.length === 0) {
      userThatEndTypeText.push(user);
    }
  }
  if (userThatEndTypeText.length === room.roomUser.length) {
    clearInterval(room.timerId);
    room.timerId = null;
    game_over(room, io);
  }
};
const resetUserReady = (room: roomInterface, io) => {
  for (const user of room.roomUser) {
    user.isReady = false;
    user.place = 0;
    user.progress = 0;
  }
  io.to(room.roomName).emit("ROOM_USER_INIT", room.roomUser);
};
const game_over = (room, io) => {
  const winner_list: string[] = [];
  const allPlaces = getAllUserPlaces(room);
  if (allPlaces === room.roomUser) {
    const userSortedByPlace = room.roomUser.sort(
      (prevUser: userInterface, curUser: userInterface): number => {
        return curUser.place - prevUser.place;
      }
    );
    io.to(room.roomName).emit("GAME_OVER", userSortedByPlace);
    resetUserReady(room, io);
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
  resetUserReady(room, io);
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

export {
  setUserPlace,
  game_over,
  allUserTyppedTextCheck,
  getAllUserPlaces,
  getUserWithoutPlace,
  getUserByPlace,
  resetUserReady,
};
