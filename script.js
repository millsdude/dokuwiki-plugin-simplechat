jQuery(document).ready(function(){
	var $sc_chatstatus = {};
	var $sc_semaphore = {};
  var $sc_activated = {};
  var $sc_loop = {};
  var $sc_user = jQuery('.sc-wrap');

  function _sendmsg_(room, user, cmd, cb, msg, complete){
    console.log(room, user, cmd);
    jQuery.ajax(DOKU_BASE + 'lib/plugins/simplechat/ajax.php', {
      method: 'post',
      error: function(err) {
        if (err.status == 404) {
          console.log('ajax.php not found');
        }
      },
      data: { cmd: cmd, msg: msg,
        room: room,
        user: user,
        start: $sc_chatstatus[room] || 0,
        async: (cmd=='send' || cmd=='update') 
      },
      success: cb,
      complete: complete
    });
  };

	jQuery('body').on('change', 'input.sc-activate', function() {
    var room = jQuery(this).parent().data('room');
    if (this.checked && !$sc_activated[room]){
      var user = jQuery(this).parent().data('user');
      var scid = jQuery(this).parent().data('id');
      $sc_activated[room] = true;

      // setup unload to report user leaving chat
      jQuery(window).unload( function(){
        _sendmsg_(room, user, 'exited');
      });
      jQuery(this).on('remove', function(){
        _sendmsg_(room, user, 'exited');
        $sc_activated[room] = false;
        clearInterval($sc_loop[room]);
      });
      
      jQuery('#sc-send-'+scid).keydown( function(e) {
        if(e.which == 13 && !e.shiftKey ){
          var $mymsg = this.value.replace(/^\s+|\s+$/g,'');
          if( $mymsg.length > 0 ) {
            _sendmsg_(room, user, 'send', function( data ){
                // add any response to the window as server text
                if( data != "" ) {
                  var $mydiv = jQuery('#sc-chatarea-'+scid);
                  $mydiv.append( "<p class='sc-info'>"+ data + "</p>");
                  $mydiv.scrollTop($mydiv.get(0).scrollHeight);
                } else {
                  //update the window early
                  sc_chatwindow();
                }
              }, $mymsg);
          }
          this.value = "";
          return false;
        }
      });

      function sc_chatwindow() {
        if( ($sc_semaphore[room] || 0) >= 0 && jQuery('#sc-chatarea-'+scid+':hover').length == 0) {
          $sc_semaphore[room]--;
          _sendmsg_(room, user, 'update', function( data ) {
              var $mydiv = jQuery('#sc-chatarea-'+scid);
              if ($mydiv.length == 0) return;
              var $msgs = data.split("\n");
              $sc_chatstatus[room] = $msgs.pop();
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
              $mydiv.scrollTop($mydiv.get(0).scrollHeight);

            },
            undefined , function( data ) { $sc_semaphore[room] = ($sc_semaphore[room]||0) + 1; });
        }
      };
      
      // fire off first one
      $sc_loop[room] = setInterval(sc_chatwindow,5000);
      _sendmsg_(room, user, 'entered', function( data ){
        //update the window
        sc_chatwindow();
      });
    }
  });

});
