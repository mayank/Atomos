var 
	path 		= require('path'),
	express 	= require('express'),

	app 		= express(),
	
	http 		= require('http').Server(app),
	io 			= require('socket.io')(http),

	bunyan	    = require('bunyan'),
	L 			= bunyan.createLogger({name: "chain-reaction", level: "debug"});


app.use(express.static(path.join(__dirname, 'assets')));

app.engine('.html', require('ejs').__express);

app.set('views', __dirname + '/views');
app.set('view engine', 'html');

app.get('/', function(req, res){
  res.render('new');
});

http.listen(process.env.PORT || 3000, function(){
	L.info('Server', 'Started on PORT', process.env.PORT || 3000);
});


/* code for game */
var _users = {};
var _games = {};
var _sockets = {};

var generateGameId = function(){
	var gameId = Math.floor(1000 + Math.random() * 9000);
	L.info('New Game #', gameId);
	return gameId;
};

// when user connects to the game
io.on('connection', function(socket){ 

	var __username = null;
	var __game = null;

	// adds a user
	socket.on('/user/add', function(user) {

		L.info('/user/add', user);
		
		_users[user.id] = socket;
		_sockets[socket.id] = user;

		socket.emit('/status',{ message: 'Welcome ! '+ user.name});

		L.info('/user/add', 'you are added');
		socket.emit('/action', {action:'user-added'});
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
			losers: [],
			turns: 0,
			started: false
		};

		_games[gameId] = game;

		socket.join(gameId);

		socket.emit('/status', {message: 'Game created, Passcode : ' + gameId, time: 99999999});

		L.debug('/game/create', 'Telling that Game is Created #', gameId);
		socket.emit('/action', { action: 'game-created', gameId: gameId});

		L.debug('/game/create', 'Pushing admin player in Player list', game);
		socket.emit('/action', { action: 'player-added', players: game.playerNames});
	});

	socket.on('/game/start', function(id){
		var game = _games[id];

		_games[id].started = true;
		L.info('/game/start', 'Admin Started the Game #',id, _sockets[socket.id]);

		L.debug('/game/start', 'Notifying all Game started #', game);
		io.in(id).emit('/action', { action: 'game-started', count: game.players.length});

		playNextTurn(id);
		
	});

	socket.on('/game/join', function(id) {
		var game = _games[id];
		var userId = _sockets[socket.id].id;
		var name = _sockets[socket.id].name;

		if(game){
			if(game.started) {
				L.error('/game/join', 'Player #', userId, ' Joining Game #', id, ' : Game already Started');
				socket.emit('/status', {message: 'You cannot join a game that is already started'});
			}
			else {
				game.players.push(userId);
				game.playerNames.push(name);

				_games[id] = game;

				socket.join(id);
				L.info('/game/join', 'Player #', userId, ' Joined Game', id);

				socket.emit('/status', {message: 'You Joined, Waiting for Admin to start'});

				L.debug('/game/join', 'Telling player #', userId, ' he is joined');
				socket.emit('/action', {action: 'game-joined', gameId: id});

				L.debug('/game/join', 'Telling everyone player list updated', game);
				io.in(id).emit('/action', { action: 'player-added', players: game.playerNames});

				L.debug('/game/join', 'Player #', game.owner, ' can start the game');
				_users[game.owner].emit('/action', { action: 'enable-start'});
			}
		} else {
			console.log('Game DNE with Id : ', id);
			socket.emit('/status', { message: 'Game doesnot exists, try creating new one'});
		}
	});

	socket.on('/game/turn', function(data) {

		_games[data.game].turns++;
		var player = _sockets[socket.id].id;

		L.info('/game/turn', 'Player #', player, 'played its turn', data);
		L.debug('/game/turn', 'Asking other players to move', _games[data.game]);
		_users[player].in(data.game).broadcast.emit('/action', {action: 'move', x:data.x, y:data.y});

		_games[data.game].moves = _games[data.game].players.length-1;
		L.debug('/game/move/complete', 'Waiting Player to complete moves', _games[data.game].moves);
	});

	socket.on('/game/move/complete', function(data){
		_games[data.game].moves--;
		L.info('/game/move/complete', 'Player #', data.player, 'Completed its move');
		if(_games[data.game].moves == 0){
			playNextTurn(data.game);
		}
	});

	socket.on('/game/winner', function(data){
		L.info('/game/winner', 'Player won', data);

		var game = _games[data.game];
		var playerId = _games[data.game].players[data.player];
		var winner = _sockets[_users[playerId].id].name;

		_users[playerId].in(data.game).broadcast.emit('/status', { message: winner + ' won the Game!', time: 999999});
		_users[playerId].in(data.game).emit('/status', { message: 'You won the Game!', time: 999999});
		io.in(data.game).emit('/action', {action: 'game-ended'});
	});

	socket.on('/game/lose', function(data){
		var playerId = _games[data.game].players[data.player];

		if( _games[data.game].losers.indexOf(playerId) < 0 ) {
			_games[data.game].losers.push(playerId);
			L.debug('/game/lose', 'Loser created', _games[data.game]);
		}

		L.info('/game/lose', 'Player #', playerId, ' lost the game', _sockets[socket.id]);
		_users[playerId].emit('/status', {message: 'You are out of Game now!', time: 9999999});
	});

	function playNextTurn(id) {
		var game = _games[id];
		var player = game.players[game.turns % game.players.length];

		L.info('[playNextTurn]', 'Its player #', player, ' turn');
		_users[player].emit('/action', {action:'your-turn'});
		_users[player].emit('/status',{ message: 'Its your turn !', time: 999999});

		L.info('[playNextTurn]', 'All players are waiting');
		_users[player].in(id).broadcast.emit('/action', {action: 'wait-for-turn'});
		_users[player].in(id).broadcast.emit('/status', { message: 'Waiting for Player to Move', time: 999999});

		if( _games[id].losers.indexOf(player) >= 0 ) {
			L.info('[playNextTurn]', 'Player #', player, ' not allowed');
			L.info('[playNextTurn]', 'Game State', _games[id]);
			_users[player].emit('/action', {action:'pass'});
		}
	}
});
