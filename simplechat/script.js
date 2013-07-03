

jQuery(document).ready(function(){
	var $sc_chatstatus = 0;
	var $sc_semaphore = 0;
	
	// setup unload to report user leaving chat
	jQuery(window).unload( function(){
		// send message we left the room
		var $username = jQuery('#sc-username').val();
		var $room = jQuery('#sc-roomname').val();
		jQuery.ajax({
					url: "/lib/plugins/simplechat/ajax.php" ,
					data: { cmd : 'exited' , user : $username, room : $room } ,
					async: false
				});
	});	
	
	jQuery('#sc-send').keydown( function(e) {
		if(  e.keyCode == 13 ){
			var $mymsg = this.value.replace(/^\s+|\s+$/g,'');
			if( $mymsg.length > 0 ) {
			var $username = jQuery('#sc-username').val();
			var $room = jQuery('#sc-roomname').val();
			jQuery.ajax({
				url: "/lib/plugins/simplechat/ajax.php" ,
				data: { cmd : 'send' , msg : $mymsg, user : $username, room : $room , start: $sc_chatstatus } ,
				success: function( data ){
					// add any response to the window as server text
					if( data != "" ) {
						var $mydiv = jQuery('#sc-chatarea');
						$mydiv.append( "<p class='sc-info'>"+ data + "</p>");
						$mydiv.scrollTop( $mydiv.get(0).scrollHeight);
					} else {
						//update the window early
						sc_chatwindow();
					}
				}
			});
			}
			this.value = "";
			return false;
		}
	});
	
	function sc_chatwindow() {
		var $room = jQuery('#sc-roomname').val();
		if( $sc_semaphore >= 0 ) {
			$sc_semaphore--;
			jQuery.ajax({
				url: "/lib/plugins/simplechat/ajax.php" ,
				data: { cmd: 'update' , start: $sc_chatstatus , room : $room } ,
				success: function( data ) {
					var $mydiv = jQuery('#sc-chatarea');
					var $msgs = data.split("\n");
					$sc_chatstatus = $msgs.pop();
					while( $msgs.length ) {
						var $msgname = $msgs[0].split("\t")[0];
						var $msginfo = $msgs[0].split("\t")[1];
						if( $msgname == "." ) {
							$mydiv.append( "<p class='sc-info'>"+ $msginfo + "</p>");
						} else {
							$mydiv.append("<p><span>"+$msgname+"</span>"+$msginfo.replace(/\\r/g, '<br />')+"</p>");
						}
						$msgs.shift();
					}
					$mydiv.scrollTop( $mydiv.get(0).scrollHeight);

				} ,
				complete: function( data ) {
					$sc_semaphore++;
				} 
			});
		} 
	};
	
	// fire off first one
	setInterval(sc_chatwindow,5000);
	// send message we entered the room
	var $username = jQuery('#sc-username').val();
	var $room = jQuery('#sc-roomname').val();
	jQuery.ajax({
				url: "/lib/plugins/simplechat/ajax.php" ,
				data: { cmd : 'entered' , user : $username, room : $room } ,
				async: false, 
				success: function( data ){
					//update the window
					sc_chatwindow();
					}

			});
			
});

