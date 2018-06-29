/**
*	@param _boxsize 	:	size of the box in px 
*	@param _gridcount 	:	no of grids
*	@param _colors 		:	player colors
*/

function ChainReaction(_boxsize, _gridcount){

	var _this = this;

	var colors = [];

	var box_size = _boxsize;
	var grid_count = _gridcount;
	
	var radius = box_size / 6;
	
	var players = 0;
	
	var wins = new Array();

	var losers = new Array();

	var skipChance = null;

	var showLoser = null;

	var rounds = 0;

	var weHaveAWinner = false;
	
	var turns = 0;

	var max_width = box_size * grid_count + grid_count + 1;
	
	var layer_lines = new Kinetic.Layer();
	var layer_atoms = new Kinetic.Layer();
	var layer_click = new Kinetic.Layer();
	
	var board = new Array();
	
	var arena = new Kinetic.Stage({
		container: 'arena',
		width: max_width,
		height: max_width
	});

	this.clickable = false;
	this.atomCallback = null;
	this.showLoserCallback = null;
	this.winnerCallback = null;

	this.setColors = function(_colors)
	{
		colors = _colors;
		players = colors.length;
	};

	this.loadGame = function() {
		createClickableBase();
		createGrid( colors[ turns % players ] ); 
		createProgramBoard();
		setWinnersArray();
	};

	function doThePlaceAtomThing(){
		var pos = arena.getPointerPosition();
		var x =  Math.floor( pos.x / (box_size + 1) );
		var y =  Math.floor( pos.y / (box_size + 1) );

		if( _this.clickable )
			_this.placeMyAtom( x, y );
	};

	function createClickableBase() {
		// creates a rectangle for each box
		var base = new Kinetic.Line({
			points: [0,0,0,max_width,max_width,max_width,max_width,0],
			fill: 'rgba(0,0,0,0)',
			closed: true
		});
		
		base.on('click', function(e){
			doThePlaceAtomThing();
		});

		base.on('tap', function(e){
			doThePlaceAtomThing();
		});

		layer_click.add( base );	
	}

	function createGrid( color ) {
		for( var i = 0; i <= max_width; i+= box_size+1 ) 
		{
			layer_lines.add( new Kinetic.Line({
				points: [i, 0, i, max_width],
				stroke: color
			}) );
			layer_lines.add( new Kinetic.Line({
				points: [0, i, max_width, i],
				stroke: color
			}) );	
		}
		
		arena.add( layer_lines );
		setClicks();
	}
	
	function setClicks() {
		arena.add( layer_click );	
	}
	
	function setWinnersArray() {
		for(var i=0; i<players; i++) {
			wins[i] = 0;
		}
	}
	
	// one time run only
	function createProgramBoard() {
		for( var i=0; i<grid_count; i++ ) 
		{
			board[i] = new Array();
			for( var j=0; j<grid_count; j++ ) 
			{
				board[i][j] = new Array();
				board[i][j]['atoms'] = [];
				board[i][j]['animate'] = null;
				board[i][j]['player'] = null;
			}
		}
	}
	
	this.amIALoser = function(){
		var player = turns % players;
		return losers.indexOf(player) >= 0 ? player : false;
	}
	
	
	this.placeMyAtom = function( x, y ) {
		var player = turns % players;
		if(player == 0) rounds++;
		var color = colors[ player ];

		if(rounds > 1 && wins[player] == 0) {
			turns += 1;

			var color = colors[ turns % players ]; 
			createGrid( color );

			if(typeof _this.atomCallback == 'function') {
				 _this.atomCallback( 0, 0, color );
			}

			return false;
		}

		if( 
			board[x][y]['atoms'].length == 0			// if box is empty
		|| 
			board[x][y]['player'] == player 			// if player is same
		) {
			wins[player] += 1;
			addNewAtom( x, y, color, player ).then(function(){
				
				turns += 1;
				
				var color = colors[ turns % players ]; 
				createGrid( color );

				if( typeof _this.atomCallback == 'function' )
				{
					_this.atomCallback( x, y, color );
				}
			});
		}
		else {
			return false;
		}
		return true;
	}
	
	function checkTheLoser() {
		return wins.indexOf(0);
	}

	function removeTheLoserIfPresent(player){
		var loser = checkTheLoser();
		if(rounds > 1 && loser >= 0 && losers.indexOf(loser) < 0){
			losers.push(loser);

			if(typeof _this.showLoserCallback == 'function'){
				_this.showLoserCallback(loser);
			}
		}
		checkIfWeHaveAWinner(player);
	}

	function checkIfWeHaveAWinner(player){
		if(rounds > 1 && wins.reduce(function(a,b){ return a + b; }, 0) == wins[player]){
			weHaveAWinner = player;
			if( typeof _this.winnerCallback == 'function' ) {
				_this.winnerCallback( weHaveAWinner );
			}
		}	
	}

	function addNewAtom( x, y, color, player ) {

		if( board[x][y]['player'] !== player ) {
			var boardCount = board[x][y]['atoms'].length;
			wins[board[x][y]['player']] -= boardCount;
			wins[player] += boardCount;
		}

		removeTheLoserIfPresent(player);
		if(rounds > 1 && weHaveAWinner) return;
		

		switch( board[x][y]['atoms'].length ) {
			case 0:
				addSingleAtom( x, y, color );
				break;
			case 1:
				addTwoAtoms( x, y, color );
				break;
			case 2:
				addThreeAtoms( x, y, color );
				break;
			case 3:
				addFourAtoms( x, y, color );
				break;
		}
		board[x][y]['player'] = player;
		return checkStability( x, y, player );	
	}

	/* below functions needs to be combined to form a single one */
	function addSingleAtom( x, y, color ) {
		var half = box_size / 2 ;
		var posX = box_size * x + half + x;
		var posY = box_size * y + half + y;
		var atom = new Kinetic.Circle({
			x: posX,
			y: posY,
			radius: radius,
			fill: color,
			stroke: 'black',
			strokeWidth: 1
		});
		board[x][y]['atoms'].push( atom );
		layer_atoms.add( atom );
		arena.add( layer_atoms );
	}
	
	function addTwoAtoms( x, y, color ) {
		var atoms = [];
		var half = box_size / 2 ;
		var posX = box_size * x + half + x;
		var posY = box_size * y + half + y;
		atoms[0] = new Kinetic.Circle({
			x: posX + half / 4,
			y: posY + half / 4,
			radius: radius,
			fill: color,
			stroke: 'black',
			strokeWidth: 1
		});
		atoms[1] = new Kinetic.Circle({
			x: posX - half / 4,
			y: posY - half / 4,
			radius: radius,
			fill: color,
			stroke: 'black',
			strokeWidth: 1
		});
		clearBoard( x, y );
		board[x][y]['atoms'] = atoms;
		layer_atoms.add( atoms[0] );
		layer_atoms.add( atoms[1] );
		arena.add( layer_atoms );	
	}
	
	function addThreeAtoms( x, y, color ) {
		var atoms = [];
		var half = box_size / 2 ;
		var posX = box_size * x + half + x;
		var posY = box_size * y + half + y;
		atoms[0] = new Kinetic.Circle({
			x: posX + half / 3,
			y: posY + half / 3,
			radius: radius,
			fill: color,
			stroke: 'black',
			strokeWidth: 1
		});
		atoms[1] = new Kinetic.Circle({
			x: posX,
			y: posY - half / 3,
			radius: radius,
			fill: color,
			stroke: 'black',
			strokeWidth: 1
		});
		atoms[2] = new Kinetic.Circle({
			x: posX - half / 3,
			y: posY + half / 3,
			radius: radius,
			fill: color,
			stroke: 'black',
			strokeWidth: 1
		});
		clearBoard( x, y );
		board[x][y]['atoms'] = atoms;
		layer_atoms.add( atoms[0] );
		layer_atoms.add( atoms[1] );
		layer_atoms.add( atoms[2] );
		arena.add( layer_atoms );
	}
	
	function addFourAtoms( x, y, color ) {
		var atoms = [];
		var half = box_size / 2 ;
		var posX = box_size * x + half + x;
		var posY = box_size * y + half + y;
		atoms[0] = new Kinetic.Circle({
			x: posX + half / 3,
			y: posY + half / 3,
			radius: radius,
			fill: color,
			stroke: 'black',
			strokeWidth: 1
		});
		atoms[1] = new Kinetic.Circle({
			x: posX + half / 3,
			y: posY - half / 3,
			radius: radius,
			fill: color,
			stroke: 'black',
			strokeWidth: 1
		});
		atoms[2] = new Kinetic.Circle({
			x: posX - half / 3,
			y: posY + half / 3,
			radius: radius,
			fill: color,
			stroke: 'black',
			strokeWidth: 1
		});
		atoms[3] = new Kinetic.Circle({
			x: posX - half / 3,
			y: posY - half / 3,
			radius: radius,
			fill: color,
			stroke: 'black',
			strokeWidth: 1
		});
		clearBoard( x, y );
		board[x][y]['atoms'] = atoms;
		layer_atoms.add( atoms[0] );
		layer_atoms.add( atoms[1] );
		layer_atoms.add( atoms[2] );
		layer_atoms.add( atoms[3] );
		arena.add( layer_atoms );	
	}
	
	function clearBoard( x, y ) {
		for( var i=0; i < board[x][y]['atoms'].length; i++ ) 
			board[x][y]['atoms'][i].remove();
	}

	function getStabilityCount( x, y ) {
		var stable_count = 0;

		if( x > 0 ) 
			stable_count++;
		if( y > 0 )
			stable_count++;
		if( x < grid_count-1 )
			stable_count++;
		if( y < grid_count-1 )
			stable_count++;

		return stable_count;
	}

	function showUnStability( x, y ) {
		board[x][y]['animate'] = new Kinetic.Animation( function( frame ) {
			var scale = Math.sin( frame.time * 2 * Math.PI / 1500 ) + 0.05;
			for( var i = 0; i < board[x][y]['atoms'].length; i++ )
				board[x][y]['atoms'][i].scale( { x: scale, y: scale } );
		}, layer_atoms );
		
		board[x][y]['animate'].start();	
	}
	
	function checkStability( x, y, player ) {
		var stable_count = getStabilityCount( x, y );

		if( board[x][y]['atoms'].length == stable_count - 1 ) {
			showUnStability( x, y );
		}
		else if( board[x][y]['atoms'].length == stable_count ) {
			return explodeAtoms( x, y, player );
		}

		return Promise.resolve();
	}
	
	function explodeAtoms( x, y, player ) {
		var atom_count = 0;
		board[x][y]['animate'].stop();
		var promises = [];

		if( x > 0 ) {
			promises.push(moveLeft( x, y, board[x][y]['atoms'][atom_count], player ));
			atom_count++;
		}
		if( y > 0 ) {
			promises.push(moveUp( x, y, board[x][y]['atoms'][atom_count], player ));
			atom_count++;
		}
		if( x < grid_count-1 ) {
			promises.push(moveRight( x, y, board[x][y]['atoms'][atom_count], player ));
			atom_count++;
		}
		if( y < grid_count-1 ) {
			promises.push(moveDown( x, y, board[x][y]['atoms'][atom_count], player ));
			atom_count++;
		}
		
		board[x][y]['atoms'] = [];
		board[x][y]['player'] = null;

		return new Promise(function(resolve){
			Promise.all(promises).then(function(data){
				var chain = Promise.resolve();

				data.forEach(function(a){
					chain = chain.then(addNewAtom( a.x, a.y, a.color, a.player ));
				});

				chain.then(resolve);
			});
		});
	}
	
	/* below functions needs to be combined to form a single one */

	function moveLeft( x, y, atom, player ) {
		return new Promise(function(resolve){
			new Kinetic.Animation( function( frame ) {
				var pos = box_size * ( frame.time / 500 );
				var half = box_size / 2 ;
				var posX = box_size * x + half + x;
				if( pos > box_size ) {
					this.stop();
					atom.remove();
					resolve({
						x: x-1, 
						y: y, 
						color: atom.getFill(), 
						player: player 
					});
				}
				atom.setX( posX - pos );
			}, layer_atoms ).start();
		});
	}
	
	function moveRight( x, y, atom, player ) {
		return new Promise(function(resolve){
			new Kinetic.Animation( function( frame ) {
				var pos = box_size * ( frame.time / 500 );
				var half = box_size / 2 ;
				var posX = box_size * x + half + x;
				if( pos > box_size ) {
					this.stop();
					atom.remove();
					resolve({
						x: x+1, 
						y: y, 
						color: atom.getFill(), 
						player: player 
					});
				}
				atom.setX( posX + pos );
			}, layer_atoms ).start();
		});
	}
	
	function moveDown( x, y, atom, player ) {
		return new Promise(function(resolve){
			new Kinetic.Animation( function( frame ) {
				var pos = box_size * ( frame.time / 500 );
				var half = box_size / 2 ;
				var posY = box_size * y + half + y;
				if( pos > box_size ) {
					this.stop();
					atom.remove();
					resolve({
						x: x, 
						y: y+1, 
						color: atom.getFill(), 
						player: player 
					});
				}
				atom.setY( posY + pos );
			}, layer_atoms ).start();
		});
	}
	
	function moveUp( x, y, atom, player ) {
		return new Promise(function(resolve){
			new Kinetic.Animation( function( frame ) {
				var pos = box_size * ( frame.time / 500 );
				var half = box_size / 2 ;
				var posY = box_size * y + half + y;
				if( pos > box_size ) {
					this.stop();
					atom.remove();
					resolve({
						x: x, 
						y: y-1, 
						color: atom.getFill(), 
						player: player 
					});
				}
				atom.setY( posY - pos );
			}, layer_atoms ).start();
		});
	}
	
};
