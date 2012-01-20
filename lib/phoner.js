var net = require( 'net' );

var Phoner = function (opts) {
	var actions = [] ;
	var pos = -1 ;
	var add = 0 ;
	var socket ;
	
	opts = opts || {} ;
	opts = {
		remote : opts.remote || '127.0.0.1' ,
		port : opts.port || 8124 ,
		encoding : opts.encoding || 'utf-8' ,
		timeout : opts.timeout || 60 * 1000 
	} ;

	var next = function(){
		add = 0 ;
		pos += 1 ;
		var action = actions[ pos ] ;
		if( action !== undefined ){
			action() ;
		}
	};

	var addAction = function( action ){
		if( pos === -1 ){
			actions.push( action ) ;
		}
		else { //means i'm in the middle of running a command
			//FIXME; this forces you to add commands in reverse in inner functions
			//actions.splice( (pos + 1), 0, action );
			actions.splice( (pos + 1 + add ), 0, action );
			//actions.reverse().splice( (actions.length - pos + add ), 0, action ) ;
			//actions.reverse() ;
			add += 1 ;
		}
	};

	this.send = function(mixed){
		var fnSend = function(){
			var out ;
			switch( typeOf( mixed ) ){
				case 'string' :
					out = mixed ;
					break ;
				case 'function' :
					out = mixed(socket) ;	
					out = JSON.stringify( out );
					break ;
				case 'object' :
					out = JSON.stringify( mixed ) ;
					break ;
			}
			socket.write( out );
			next() ;
		};
		addAction( fnSend ) ;
		return this ;
	} ;
	this.wait = function( time ){
		var fnWait = function(){
			var t = setTimeout( function(){
				next() ;	
			}, time );
		} ;
		addAction( fnWait ) ;
		return this ;
	} ;
	this.expect = function(cb){
		var that = this ;
		var fnExpect = function(){
			var handler = function( str ){
				cb.call( that, str ) ;
				next() ;
				socket.removeListener( 'data', handler ) ;
			};
			socket.on( 'data', handler ) ;
		};
		addAction( fnExpect ) ;
		return this ;
	} ;
	this.run = function(){
		socket = net.createConnection( opts.port, opts.remote ) ;
		socket.setEncoding( opts.encoding ) ;
		socket.setTimeout( opts.timeout ) ;
		next() ;
	} ;
	//other socket related methods
	var that = this ;
	['end','destroy','pause','resume'].forEach( function( action ){
		that[action] = function(){
			var fn = function(){
				(socket[ action ])() ;
				next() ;
			}
			addAction( fn ) ;
			return that;
		} ;
	}) ;
} ;

module.exports = Phoner;
