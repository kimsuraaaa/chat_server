// 1. 서버 생성
const express = require('express');
const socket = require('socket.io');
const http = require('http');
const moment = require('moment');
const cors = require('cors');
// file upload (1/3)
const socketUpload = require('socketio-file-upload');
const socketio = require('socket.io');

// users.js
const { addUser, removeUser, getUser, getUsersInRoom } = require('./users');

const PORT = process.env.PORT || 5080;

// 2. 라우터 설정
const router = require('./router');

const app = express();
app.use(cors());
// file upload (2/3)
app
  .use(socketUpload.router) // @details express 모듈과 같은 연결 기반 미들웨어를 사용하는 경우 값을 미들웨어로 전달한다.
  .use(express.static(__dirname)) // @details 경로를 지정( __dirname : 현재경로 )
  .listen(52273); // @details 포트를 지정

const server = http.createServer(app);
const io = socket(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// file upload (3/3)
io.sockets.on('connection', function (socket) {
  // @breif 업로드를 수행할 소켓( socketio-file-upload ) 인스턴스 생성
  let uploader = new socketUpload();
  // @breif 업로드 경로를 지정
  uploader.dir = '/nodejs';
  uploader.listen(socket);
  // @breif 파일이 저장될 때 수행
  uploader.on('saved', function (event) {
    console.log(event.file);
  });

  // @breif 오류 처리
  uploader.on('error', function (event) {
    console.log('Error from uploader', event);
  });
});

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

// const io = socketio.listen( app );
