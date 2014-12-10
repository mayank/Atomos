var path = require('path');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(path.join(__dirname, 'assets')));
app.engine('.html', require('ejs').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');

app.get('/', function(req, res){
  res.render('index');
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});


/* code for game */
var _users = [];
var _games = [];

// when user connects to the game
io.on('connection', function(socket){ 

	var __username = null;
	var __game = null;

	// adds a user
	socket.on('add-username', function(user) {
		
		__username = {
			id: user.id,
			name: user.name
		};

		_users[__username.id] = socket;
		socket.emit('status','Welcome ! '+ __username.name);

		socket.emit('user-added');
		socket.emit('game-list', _games);
	});

	// creates a new game
	socket.on('create-game',function(max) {
		
		__game = {
			id: Date.now(),
			owner: __username,
			players: [__username],
			max: max,
			turns: 0
		};

		_games.push(__game);

		socket.emit('status', 'Waiting for '+ (__game.max - __game.players.length) +' players to join...');
	});

	// join an existing game
	socket.on('join-game', function(id) {
		for(var i=0;i<_games.length;i++) 
		{
			var game = _games[i];

			if( game.id == id )
			{
				__game = game;

				game.players.push(__username);

				if( game.players.length == game.max )
				{
					io.sockets.emit('status', 'Game is Started !');
					io.sockets.emit('start-game', game);

					playNextTurn();
				}
				else
				{
					io.sockets.emit('status', 'Waiting for '+ (game.max - game.players.length) +' players to join...');
				}
				return;
			}
		}
	});

	socket.on('turn', function(data) {
		socket.broadcast.emit('move',data);
		__game.turns++;

		playNextTurn();
	});

	function playNextTurn() {
		
		var player = __game.players[__game.turns%__game.players.length];
		
		_users[player.id].emit('unlock',null);
		_users[player.id].broadcast.emit('status','player is thinking...');
		_users[player.id].emit('status','Its your turn !');
	}

	/*
	// creates a new user 
	var user = { 
		id:socket.id, 
		color: __colors[__players.length % __colors.length],
		socket: socket
	};


	// limit of two players
	if( __players.length < 2 )
	{
		__players.push(user);
		socket.emit('console','You have joined as ' + user.color);
		socket.broadcast.emit('console',user.color +' has joined !');

		if( __players.length == 2 )
		{
			io.sockets.emit('console','Game has Started !');
			io.sockets.emit('start-game', null);

			playNextTurn();
		}
	}

	function playNextTurn() {
		var player = __players[__turn%__players.length];
		player.socket.emit('console', '<strong>Its your turn !</strong>');
		player.socket.broadcast.emit('console', player.color + ' is thinking...');
		player.socket.emit('unlock',null);
	}

	socket.on('turn', function(data){
		socket.emit('console','You have played your turn');
		socket.broadcast.emit('move',data);
		__turn++;

		playNextTurn();
	});

	socket.on('disconnect', function() {
		var flag = 0;
		for(var i=0;i<__players.length;i++)
		{
			if( __players[i].id == socket.id )
			{
				__players.splice(i,1);
				flag = 1;
			}
		}
		if( flag == 1 )
			socket.broadcast.emit('console',user.color+' has left the game :(');
	});
	*/
});
