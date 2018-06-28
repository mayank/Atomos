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
  res.render('new');
});

http.listen(process.env.PORT || 3000, function(){
  console.log('server started');
});


/* code for game */
var _users = {};
var _games = {};
var _sockets = {};

var generateGameId = function(){
	return Math.floor(1000 + Math.random() * 9000);
};

// when user connects to the game
io.on('connection', function(socket){ 

	var __username = null;
	var __game = null;

	// adds a user
	socket.on('/user/add', function(user) {
		
		_users[user.id] = socket;
		_sockets[socket.id] = user;

		socket.emit('/status',{ message: 'Welcome ! '+ user.name});
		socket.emit('/action', {action:'user-added'});
		console.log('Adding New User', JSON.stringify(user));
	});


	socket.on('/game/create', function(){
		var userId = _sockets[socket.id].id;
		var name = _sockets[socket.id].name;
		var gameId = generateGameId();

		var game = {
			id: gameId,
			owner: userId,
			players: [userId],
			playerNames: [name],
			turns: 0,
			started: false
		};

		_games[gameId] = game;

		console.log('Game Created with Id : '+ gameId);
		socket.emit('/status', {message: 'Game created, Passcode : ' + gameId, time: 99999999});
		socket.emit('/action', { action: 'game-created', gameId: gameId});
		socket.emit('/action', { action: 'player-added', players: game.playerNames});
	});

	socket.on('/game/start', function(id){
		var game = _games[id];

		_games[id].started = true;
		console.log('Admin Started the Game! => ', id);

		game.players.forEach(function(playerId){
			console.log('Notifying Game start to ', playerId);
			_users[playerId].emit('/action', { action: 'game-started', count: game.players.length});
		});

		playNextTurn(id);
		
	});

	// join an existing game
	socket.on('/game/join', function(id) {
		var game = _games[id];
		var userId = _sockets[socket.id].id;
		var name = _sockets[socket.id].name;

		if(game){
			if(game.started) {
				console.log('Joining Existing Game');
				socket.emit('/status', {message: 'You cannot join a game that is already started'});
			}
			else {
				game.players.push(userId);
				game.playerNames.push(name);

				_games[id] = game;

				console.log('Game Joined by User : '+ userId);
				socket.emit('/status', {message: 'You Joined, Waiting for Admin to start'});
				socket.emit('/action', {action: 'game-joined', gameId: id});

				game.players.forEach(function(id){
					_users[id].emit('/action', { action: 'player-added', players: game.playerNames});
					if(game.owner == id){
						_users[id].emit('/action', { action: 'enable-start'});
					}
				});	
			}
		} else {
			console.log('Game DNE with Id : ', id);
			socket.emit('/status', { message: 'Game doesnot exists, try creating new one'});
		}
	});

	socket.on('/game/turn', function(data) {
		_games[data.game].turns++;
		var player = _sockets[socket.id].id;

		_games[data.game].players.forEach(function(playerId){
			if(player !== playerId){
				_users[playerId].emit('/action', {action: 'move', x:data.x, y:data.y});		
			}
		});
		
		playNextTurn(data.game);
	});

	socket.on('/game/pass', function(data){
		_games[data.game].turns++;

		_games[data.game].players.forEach(function(playerId){
			_users[playerId].emit('/action', {action: 'pass'});
		});

		playNextTurn(data.game);
	});

	socket.on('/game/winner', function(data){
		console.log('/game/winner', JSON.stringify(data));

		var game = _games[data.game];
		var playerId = _games[data.game].players[data.player];
		var winner = _sockets[_users[playerId].id].name;

		game.players.forEach(function(player){
			if( player !== playerId ) {
				_users[player].emit('/status', { message: winner + ' won the Game!', time: 999999});
			} else {
				_users[player].emit('/status', { message: 'You won the Game!', time: 999999});
			}
		});

		game.players.forEach(function(player){
			_users[player].emit('/action', {action: 'game-ended'});
		});
	});

	socket.on('/game/lose', function(data){
		var playerId = _games[data.game].players[data.player];

		console.log('/game/lose', JSON.stringify(data));
		console.log('Player ', playerId, ' Lost!');
		_users[playerId].emit('/status', {message: 'You are out of Game now!', time: 9999999});
	});

	function playNextTurn(id) {
		var game = _games[id];
		var player = game.players[game.turns % game.players.length];
		
		_users[player].emit('/action', {action:'your-turn'});
		_users[player].emit('/status',{ message: 'Its your turn !', time: 999999});

		game.players.forEach(function(playerId){
			if(player !== playerId){
				_users[playerId].emit('/action', {action: 'wait-for-turn'});
				_users[playerId].emit('/status', { message: 'Waiting for Player to Move', time: 999999});
			}
		});
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
