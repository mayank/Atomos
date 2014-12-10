function Game(socket,username) {
	
	socket.emit('username',username);

	/*

	
	socket.on('clear-console',function(data){
		$('#console').html('');
	});

	socket.on('console', function(msg){
		var loose = $('#console');
		$(loose).html($(loose).html()+msg+'\n');
	});

	socket.on('start-game', function(data){
		cr.loadGame();
	});

	

	
*/

}

