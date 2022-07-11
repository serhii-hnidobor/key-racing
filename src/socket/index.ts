import { Server } from 'socket.io';
//import * as config from './config';
import {MAXIMUM_USERS_FOR_ONE_ROOM} from "./config";

const rooms: roomInterface [] = [];
interface roomInterface{
	roomName: string
	roomUser: userInterface[]
}
interface userInterface {
	name: string
	id: string
	isReady: boolean
}

const getUserRoom = (socket): roomInterface | null => {
    for (const room of rooms){
		const roomUsers = room.roomUser;
		const roomUser = roomUsers.find (user => user.id === socket.id);
		if (roomUser){
			return room;
		}
	}
	return null;
}
const deleteUserFromRoom = (room:roomInterface, socket):void => {
	room.roomUser = room.roomUser.filter(user => {
		return user.id !== socket.id
	})
}
const getUserInRoomListIndex = (room, userName) => {
	const allRoomUser = room.roomUser;
	return allRoomUser.findIndex(user => user.name === userName);
}
const getRoomIndex = (room) => {
	return rooms.findIndex(curRoom => curRoom === room);
}
const findRoomByName = (roomName:string):roomInterface | null => {
	for (const room of rooms){
		if (room.roomName === roomName){
			return room;
		}
	}
	return null;
}
let allUserNames: string [] = [];
export default (io: Server) => {
	io.on('connection', (socket):void => {
		const username:string | null = socket.handshake.query.username as string;
		if (allUserNames.includes(username) || !username){
			socket.emit('CONNECT_ERROR');
			return;
		}

		socket.emit('ROOM_INIT',rooms);
		allUserNames.push(username);
		const onUserExit = () => {
			console.log('exit');
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
			console.log('exit',room, rooms);
			if(room) {
				deleteUserFromRoom(room,socket);
				console.log(room,'after deleted')
				if (room.roomUser.length === 0){
					const roomIndex = getRoomIndex(room);
					rooms.splice(roomIndex, 1);
					console.log(rooms,'deleted room');
					io.emit('DELETE_ROOM',room);
				}
				io.to(room.roomName).emit('USER_LEAVE', getUserRoom(socket));
			}

			const userInAllUserNameIndex = allUserNames.findIndex( user => user === username);
			console.log(allUserNames,userInAllUserNameIndex);
			allUserNames.splice (userInAllUserNameIndex,1);
			console.log(allUserNames);
		}
		socket.on('disconnect', () => {
			onUserExit();
		});

		socket.on('JOIN_ROOM', (roomName:string): void =>
		{
            const room = findRoomByName(roomName);
			if (!room || (room && room.roomUser.length === MAXIMUM_USERS_FOR_ONE_ROOM)){
				socket.emit('ERROR_JOIN_ROOM');
				return;
			}
			socket.emit('ROOM_USER_INIT', room.roomUser);
			const currentRoomUsers = room.roomUser;

			currentRoomUsers.push({
				name: username,
				isReady: false,
				id: socket.id
			});

			socket.join(roomName);
			socket.emit('JOIN_SUCCESS', roomName);
			io.emit('UPDATE_ROOM_USER_NUM', room);
			io.to(roomName).emit('NEW_USER_JOIN', currentRoomUsers[currentRoomUsers.length - 1]);
		});

		socket.on ('USER_CHANGE_READY_STATUS', (isReady) => {
			const room = getUserRoom(socket);
			const userIndex = getUserInRoomListIndex(room, username);
			if (room) {
				room.roomUser[userIndex].isReady = isReady;
				io.to(room.roomName).emit('CHANGE_USER_READY', {username, isReady});
			}
		});

		socket.on('CREATE_ROOM', (roomId:string) => {
			if (rooms.find (room => room.roomName === roomId)){
				socket.emit('CREATE_ROOM_ERROR');
				return;
			}

			rooms.push({
				roomName: roomId,
				roomUser: [{
					name:username,
					isReady: false,
					id: socket.id
				}]
			});
			socket.join(roomId);
			socket.emit('CREATE_ROOM_SUCCESS');
			const currentRoomUsers = rooms[rooms.length - 1].roomUser;
			socket.emit('NEW_USER_JOIN', currentRoomUsers[0]);
			io.emit('ADDED_ROOM', rooms[rooms.length - 1]);
		});

        socket.on('QUIT_ROOM', (roomName)=> {
			const currentRoom = rooms.find(room => room.roomName === roomName);
			if (currentRoom) {
				onUserExit();
				socket.emit('ROOM_INIT',rooms);
			}
		});

	});
};
