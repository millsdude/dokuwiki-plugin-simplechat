jQuery(document).ready(function(){
	var $sc_chatstatus = 0;
	var $sc_semaphore = 0;
  var $sc_activated = false;

  function _sendmsg_(cmd, cb, msg, complete){
    jQuery.ajax(DOKU_BASE + 'lib/plugins/simplechat/ajax.php', {
      method: 'post',
      error: function(err) {
        if (err.status == 404) {
          console.log('ajax.php not found');
        }
      },
      data: { cmd: cmd, msg: msg,
        room: jQuery('#sc-wrap').data('room'),
        user: jQuery('#sc-wrap').data('user'),
        start: $sc_chatstatus,
        async: (cmd=='send' || cmd=='update') 
      },
      success: cb,
      complete: complete
    });
  };

	jQuery('#sc-activate').change( function() {
    if (this.checked && !$sc_activated){
      $sc_activated = true;

      // setup unload to report user leaving chat
      jQuery(window).unload( function(){
        _sendmsg_('exited');
      });
      
      jQuery('#sc-send').keydown( function(e) {
        if(  e.which == 13 && !e.shiftKey ){
          var $mymsg = this.value.replace(/^\s+|\s+$/g,'');
          if( $mymsg.length > 0 ) {
            _sendmsg_('send', function( data ){
                // add any response to the window as server text
                if( data != "" ) {
                  var $mydiv = jQuery('#sc-chatarea');
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
        if( $sc_semaphore >= 0 && jQuery('#sc-chatarea:hover').length == 0) {
          $sc_semaphore--;
          _sendmsg_('update', function( data ) {
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
              $mydiv.scrollTop($mydiv.get(0).scrollHeight);

            },
            undefined , function( data ) { $sc_semaphore++; });
        }
      };
      
      // fire off first one
      setInterval(sc_chatwindow,5000);
      _sendmsg_('entered', function( data ){
        //update the window
        sc_chatwindow();
      });
    }
  });

});
