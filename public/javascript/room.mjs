import {appendUserElement, changeReadyStatus, removeUserElement} from "./views/user.mjs";
import {showInputModal, showMessageModal} from "./views/modal.mjs";
import {
    appendRoomElement,
    displayGameRoom,
    displayRoomList,
    removeRoomElement,
    updateNumberOfUsersInRoom
} from "./views/room.mjs";


const roomSocketEventInit = (socket, username) =>{
    const addEventListenerForRoomBtn =  () => {
        document.getElementById('quit-room-btn').addEventListener('click', quitRoom);
        document.getElementById('ready-btn').addEventListener('click', onReadyChange)
    }
    const onJoinRoom = (event) => {
        const roomName = event.target.dataset.roomName;
        socket.emit('JOIN_ROOM',roomName);
        socket.on ('JOIN_SUCCESS', (roomName) => {
            displayGameRoom(roomName);
            addEventListenerForRoomBtn();
        });
    }

    let newRoomName = '';
    const createRoom = () => {
        socket.emit('CREATE_ROOM', newRoomName);
        socket.on ('CREATE_ROOM_SUCCESS', ()=> {
            displayGameRoom(newRoomName);
            addEventListenerForRoomBtn();
            newRoomName = '';
        })
    }

    const quitRoom = () => {
        const roomNameElement = document.getElementById('room-name');
        socket.emit('QUIT_ROOM', roomNameElement.innerText);
        displayRoomList();
    }


    const onReadyChange = () => {
        const readyBtn = document.getElementById('ready-btn');
        const isBtnReady = readyBtn.dataset.ready;
        if (isBtnReady === 'true'){
            readyBtn.innerText = 'not ready';
            socket.emit('USER_CHANGE_READY_STATUS', true);
            readyBtn.setAttribute('data-ready','false');
        }
        else {
            readyBtn.innerText = 'ready';
            socket.emit('USER_CHANGE_READY_STATUS', false);
            readyBtn.setAttribute('data-ready','true');
        }
    }
    socket.on('ADDED_ROOM', (room) => {
        appendRoomElement({
            name:room.roomName,
            numberOfUsers: room.roomUser.length,
            onJoin: onJoinRoom
        })
    });

    socket.on ('NEW_USER_JOIN', (newUser)=>{
        console.log(newUser);
        appendUserElement({
            username: newUser.name,
            ready: newUser.isReady,
            isCurrentUser: newUser.name === username
        });
    });
    socket.on ('CREATE_ROOM_ERROR', ()=>{
        showMessageModal({
            message:'room with same name already exist try another room name'
        });
    })
    socket.on('ROOM_USER_INIT', (userArray) => {
        for (const user of userArray) {
            appendUserElement({
                username: user.name,
                ready: user.isReady,
                isCurrentUser: username === user.name
            })
        }
    });

    socket.on('UPDATE_ROOM_USER_NUM', (room) => {
        console.log('update_ROOM_NUM', room);
        updateNumberOfUsersInRoom({
            name: room.roomName,
            numberOfUsers:room.roomUser.length
        });
    });

    socket.on('ROOM_INIT', (rooms) => {
        for (const room of rooms){
            appendRoomElement({
                name: room.roomName,
                numberOfUsers: room.roomUser.length,
                onJoin: onJoinRoom
            })
        }
    });
    socket.on ('CHANGE_USER_READY', ({username, isReady}) => {
        changeReadyStatus({username, ready:isReady});
    });

    socket.on('USER_LEAVE', (userLeave) => {
        removeUserElement(userLeave.name);
    });

    socket.on('DELETE_ROOM', (room) => {
        removeRoomElement(room.roomName);
    });

    const onClickCreateRoomButton = () => {
        showInputModal({
            title:"enter room name",
            onSubmit:createRoom,
            onChange: (value)=> newRoomName = value
        })
    };
    document.getElementById('add-room-btn').addEventListener('click',onClickCreateRoomButton);
}

export {roomSocketEventInit}