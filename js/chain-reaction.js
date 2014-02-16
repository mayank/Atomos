function ChainReaction(_boxsize,_gridsize,_colors){

	var box_size = _boxsize;
	var grid_size = _gridsize;
	var radius = _gridsize/2 + _gridsize/4;
	var players = _colors.length;
	var turns = 0;
	var max_width = box_size * grid_size + grid_size + 1;
	var colors = _colors;
	var layer_lines = new Kinetic.Layer();
	var layer_atoms = new Kinetic.Layer();
	var layer_click = new Kinetic.Layer();
	var board = new Array();
	var arena = new Kinetic.Stage({
		container: 'arena',
		width: max_width,
		height: max_width
	});
	
	this.loadGame = function() {
		createClickableBase();
		createGrid( colors[ turns % players ] ); 
		createProgramBoard();
	};
	function createProgramBoard() {
		for( var i=0; i<grid_size; i++ ) {
			board[i] = new Array();
			for( var j=0; j<grid_size; j++ ) {
				board[i][j] = new Array();
				board[i][j]['atoms'] = [];
				board[i][j]['animate'] = null;
			}
		}
	}
	function createGrid( color ) {
		for( var i = 0; i <= max_width; i+= box_size ) {
			i++;
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
	function createClickableBase() {
		var base = new Kinetic.Line({
			points: [0,0,0,max_width,max_width,max_width,max_width,0],
			fill: 'rgba(0,0,0,0)',
			closed: true
		});
		base.on('click', function(){
			var pos = arena.getPointerPosition();
			var x =  Math.floor( pos.x / (box_size + 1) );
			var y =  Math.floor( pos.y / (box_size + 1) );
			placeMyAtom( x, y );
		});
		layer_click.add( base );	
	}
	function setClicks() {
		arena.add( layer_click );	
	}
	function placeMyAtom( x, y ) {
		var color = colors[ turns % players ];
		if( 
			board[x][y]['atoms'].length == 0 
		|| 
			board[x][y]['atoms'][0].getFill() == color 
		)
			addNewAtom( x, y, color );
		else
			return;
		turns += 1;
		var color = colors[ turns % players ];
		// checking for the Win == checkTheWin() is required 
		createGrid( color );
	}
	// not implemented yet :(
	function checkTheWin( fill ) {
		for( var i=0; i<grid_size; i++ )
			for( var j=0; j<grid_size; j++ )
				if( board[i][j]['atoms'].length > 0 )
					if( fill != board[i][j]['atoms'][0].getFill() )
						return true;
		return false;
	}
	function checkStability( x, y ) {
		var stable_count = 0;
		if( x > 0 ) 
			stable_count++;
		if( y > 0 )
			stable_count++;
		if( x < grid_size-1 )
			stable_count++;
		if( y < grid_size-1 )
			stable_count++;
		if( board[x][y]['atoms'].length == stable_count - 1 )
			showUnStability( x, y );
		else if( board[x][y]['atoms'].length == stable_count )
			explodeAtoms( x, y );	
	}
	function showUnStability( x, y ) {
		board[x][y]['animate'] = new Kinetic.Animation( function( frame ) {
			var scale = Math.sin( frame.time * 2 * Math.PI / 1500 ) + 0.05;
			for( var i = 0; i < board[x][y]['atoms'].length; i++ )
				board[x][y]['atoms'][i].scale( { x: scale, y: scale } );
		}, layer_atoms );
		board[x][y]['animate'].start();	
	}
	function explodeAtoms( x, y ) {
		var atom_count = 0;
		board[x][y]['animate'].stop();
		if( x > 0 ) {
			moveLeft( x, y , board[x][y]['atoms'][atom_count] );
			atom_count++;
		}
		if( y > 0 ) {
			moveUp( x, y, board[x][y]['atoms'][atom_count] );
			atom_count++;
		}
		if( x < grid_size-1 ) {
			moveRight( x, y, board[x][y]['atoms'][atom_count] );
			atom_count++;
		}
		if( y < grid_size-1 ) {
			moveDown( x, y, board[x][y]['atoms'][atom_count] );
			atom_count++;
		}
		board[x][y]['atoms'] = [];	
	}
	function moveLeft( x, y, atom ) {
		new Kinetic.Animation( function( frame ) {
			var pos = box_size * ( frame.time / 500 );
			var half = box_size / 2 ;
			var posX = box_size * x + half + x;
			if( pos > box_size ) {
				this.stop();
				atom.remove();
				addNewAtom( x-1, y, atom.getFill() );
			}
			atom.setX( posX - pos );
		}, layer_atoms ).start();
	}
	function moveRight( x, y, atom ) {
		new Kinetic.Animation( function( frame ) {
			var pos = box_size * ( frame.time / 500 );
			var half = box_size / 2 ;
			var posX = box_size * x + half + x;
			if( pos > box_size ) {
				this.stop();
				atom.remove();
				addNewAtom( x+1, y, atom.getFill() );
			}
			atom.setX( posX + pos );
		}, layer_atoms ).start();
	}
	function moveDown( x, y, atom ) {
		new Kinetic.Animation( function( frame ) {
			var pos = box_size * ( frame.time / 500 );
			var half = box_size / 2 ;
			var posY = box_size * y + half + y;
			if( pos > box_size ) {
				this.stop();
				atom.remove();
				addNewAtom( x, y+1, atom.getFill() );
			}
			atom.setY( posY + pos );
		}, layer_atoms ).start();
	}
	function moveUp( x, y, atom ) {
		new Kinetic.Animation( function( frame ) {
			var pos = box_size * ( frame.time / 500 );
			var half = box_size / 2 ;
			var posY = box_size * y + half + y;
			if( pos > box_size ) {
				this.stop();
				atom.remove();
				addNewAtom( x, y-1, atom.getFill() );
			}
			atom.setY( posY - pos );
		}, layer_atoms ).start();
	}
	function addNewAtom( x, y, color ) {
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
		checkStability( x, y );	
	}
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
};