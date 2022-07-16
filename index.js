// 1. 서버 생성
const express = require('express');
const socket = require('socket.io');
const http = require('http');
const moment = require('moment');
const cors = require('cors');
// file
var fs = require('fs');
// var socketio = require('socket.io');
const upload = require('./config/multer');

// users.js
const { addUser, removeUser, getUser, getUsersInRoom } = require('./users');

const PORT = process.env.PORT || 5080;

// 2. 라우터 설정
const router = require('./router');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socket(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// file
// app.get('/', (request, response) => {
//   fs.readFile('HTMLPage.html', (error, data) => {
//     response.writeHead(200, { 'Content-Type': 'text/html' });
//     response.end(data);
//   });
// });

// const io = new Server(server, {
//   cors: {
//     origin: "http://localhost:3000",
//     methods: ["GET", "POST"],
//   },
// });

// 3. 소켓 연결 및 이벤트
io.on('connection', (socket) => {
  console.log('소켓 연결 완료');

  // 클라이언트에서 join이벤트를 보냈을 경우에 대해서 처리 `on`
  socket.on('join', ({ name, room }, callback) => {
    // console.log(name, room);
    // console.log(socket.id, "socketid");
    const { error, user } = addUser({ id: socket.id, name, room });
    if (error) return callback(error); // username taken
    // 해당 유저 방에 접속처리
    socket.join(user.room);
    // console.log(user.room);
    // 관리자(서버)에서 소켓으로 보내는 이벤트
    socket.emit('message', {
      user: 'admin',
      text: `${user.name}, welcome to the room ${user.room}`,
      time: moment(new Date()).format('h:ss A'),
    });
    // 같은 방에 있는 유저에게 보내는 서버측 전달
    socket.broadcast.to(user.room).emit('message', {
      user: 'admin',
      text: `${user.name}, has joined!`,
      time: moment(new Date()).format('h:ss A'),
    });

    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room),
      time: moment(new Date()).format('h:ss A'),
    });

    callback();
    // const error = true;
    // if (error) {
    //   callback({ error: "error" });
    // }
  });
  // 유저가 생성한 이벤트에 대한 처리 `on`
  socket.on('sendMessage', (message, callback) => {
    console.log('socket', socket);

    const user = getUser(socket.id);
    // console.log(user); //
    // 해당 방으로 메세지를
    io.to(user.room).emit('message', {
      user: user.name,
      text: message,
      time: moment(new Date()).format('h:ss A'),
    });

    // callback();
  });

  // file
  // socket.on('image', (data) => {
  //   io.sockets.in(roomName).emit('image', data);
  //   console.log(data);
  // });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);
    console.log('유저가 떠났습니다..');

    if (user) {
      io.to(user.room).emit('message', {
        user: 'Admin',
        text: `${user.name} has left.`,
      });
      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

// 2-1, 라우터 설정
app.use(router);

server.listen(PORT, () => console.log(`server has started on port ${PORT}`));
