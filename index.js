var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var users = {};
var numUsers = 0;
var chatLog = [];

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	numUsers = numUsers + 1;
	console.log('user ' + socket.id + ' connected');
	users[socket.id] = assignNickname(socket.id);
	console.log('Nickname: ' + users[socket.id]["name"]);
	socket.on('disconnect', function(){
	  console.log('user '+ socket.id + ' disconnected');
    broadcastUserList();
  	});

  io.to(socket.id).emit('message log',chatLog);
  io.to(socket.id).emit('cookie check',[users[socket.id]["name"],users[socket.id]["color"]]);
  broadcastUserList();


});

io.on('connection', function(socket){
  socket.on('chat message', function(msg){


    if (msg.startsWith("/nickcolor")){

  		console.log("Checking color change...");
  		var newColor = msg.slice(11,msg.length);

  		var isHexColor  = /^[0-9A-F]{6}$/i.test(newColor);
  		console.log(isHexColor);

  		if (isHexColor){
  			users[socket.id]["color"] = newColor;
        io.to(socket.id).emit('refresh cookie',[users[socket.id]["name"],users[socket.id]["color"]]);
  			console.log("Color changed");
  		}

  		return;
  	}

  	if (msg.startsWith("/nick")){
  		var oldNick = users[socket.id]["name"];
  		var newNick = msg.slice(6,msg.length);
      var userSpecified = true;

  		assignNewNickname(socket,oldNick,newNick, userSpecified);
  		return;
  	}

    if (msg.startsWith("/cookienick")){
  		var oldNick = users[socket.id]["name"];
  		var newNick = msg.slice(12,msg.length);
      var userSpecified = false;

  		assignNewNickname(socket,oldNick,newNick,userSpecified);
  		return;
  	}


    console.log(users[socket.id]["name"] + ': ' + msg);

    var msgJSON = {
    	"messageType": "user",
    	"time": getTime(new Date()),
    	"message": msg,
    	"userInfo": users[socket.id]
    };

    chatLog.push(msgJSON);
    io.emit('chat message',msgJSON);
  });
});



http.listen(3000, function(){
  console.log('listening on *:3000');
});




function assignNickname(userID){
	var userInfo = {
		"id":userID,
		"name" : "Anon " + numUsers,
		"color":"000000"
	};
	return userInfo;
}

function broadcastUserList(){
  var userNames = [];
  console.log("CURRENTLY CONNECTED USERS:");
  Object.keys(io.sockets.sockets).forEach(function(id){
    userNames.push(users[id]);
  });

  io.emit('userListUpdate',userNames);
}



function assignNewNickname(socket,oldNick,newNick,userSpecified){
  var nonDuplicate = true

  Object.keys(io.sockets.sockets).forEach(function(id){
    console.log(users[id]["name"], " vs. ", newNick);
    if (users[id]["name"] === newNick) {
      nonDuplicate = false;
    }
  });

  if (nonDuplicate){
    users[socket.id]["name"] = newNick;
    var msg = oldNick + " changed name to " + newNick;
    console.log(msg);
    broadcastUserList();

  if (userSpecified){
    var msgJSON = {
    "messageType": "server",
    "time": getTime(new Date()),
    "message": msg
    };

    chatLog.push(msgJSON);
    io.emit('chat message',msgJSON);
    io.to(socket.id).emit('refresh cookie',[users[socket.id]["name"],users[socket.id]["color"]]);
  }
  }

}

function getTime(date){
  return date.getHours() + ":" + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes());

}
