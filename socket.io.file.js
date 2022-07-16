const socketUpload = require('socketio-file-upload');
const socketio = require('socket.io');
const express = require('express');

// @breif express 서버 생성
const app = express()
  .use(socketUpload.router) // @details express 모듈과 같은 연결 기반 미들웨어를 사용하는 경우 값을 미들웨어로 전달한다.
  .use(express.static(__dirname)) // @details 경로를 지정( __dirname : 현재경로 )
  .listen(52273); // @details 포트를 지정
const io = socketio.listen(app);

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
