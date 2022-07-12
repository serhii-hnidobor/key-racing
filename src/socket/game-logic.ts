import { texts } from "../data";
import { getUserBySocket, getUserRoom } from "./helper/socket-helper";
import {
  allUserTyppedTextCheck,
  setUserPlace,
} from "./helper/game-logic-helper";

export const gameLogicInit = (io, socket) => {
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
          ((userNeedType?.length as number) * 100) / texts[room.textId].length;
        socket.emit("UPDATE_TEXT", user.textMap);
        io.to(room.roomName).emit("CHANGE_USER_PROGRESS", user);
        allUserTyppedTextCheck(room, io);
      }
    }
  });
};
