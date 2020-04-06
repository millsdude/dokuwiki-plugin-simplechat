jQuery(document).ready(function(){
  var $sc_chatstatus = {};
  var $sc_semaphore = {};
  var $sc_activated = {};
  var $sc_loop = {};
  var $sc_user = jQuery('.sc-wrap');
  var $sc_period = 5000;
  var $sc_osc = undefined;

  function _sendmsg_(room, user, cmd, cb, msg, complete){
    if (!$sc_activated[room]) return;
    jQuery.ajax(DOKU_BASE + 'lib/plugins/simplechat/ajax.php', {
      method: 'post',
      error: function(err) {
          console.log('ajax.php error : ' + err.status);
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

  function unmute(){
    $sc_osc = {};
    $sc_osc.a = new(window.AudioContext || window.webkitAudioContext)();
    $sc_osc.o = $sc_osc.a.createOscillator();
    $sc_osc.g = $sc_osc.a.createGain();
    $sc_osc.o.type = 'sine';
    $sc_osc.g.gain.value = 0;
    $sc_osc.o.frequency.value = 440;
    $sc_osc.g.connect($sc_osc.a.destination);
    $sc_osc.o.connect($sc_osc.g);
    $sc_osc.t = 400; // duration
    $sc_osc.f = 329; // frequency
    $sc_osc.p = function (id) {
      $cur_time = Math.floor(2 + ($sc_osc.a.currentTime*10))/10;
      $sc_osc.o.frequency.value = $sc_osc[id] || $sc_osc.f;
      $cur_attack = [0.5,0.5,0.4,0.35,0.12,0];
      $sc_osc.g.gain.setValueCurveAtTime($cur_attack.map(function(x){
        return x*(440/$sc_osc.o.frequency.value);
      }), $cur_time, $sc_osc.t/1000);
    };
    $sc_osc.o.start();
  }
  function mute(){
    $sc_osc.o.stop();
    $sc_osc = undefined;
  }
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

      function sc_add_msg(data){
        if( data != "" ) {
          var $mydiv = jQuery('#sc-chatarea-'+scid);
          // if ($mydiv.length == 0) { $sc_activated[room] = false; return; }
          var $msgs = data.split("\n");
          if ($msgs.length > 1)
            $sc_chatstatus[room] = $msgs.pop();
          while( $msgs.length ) {
            var $msgname = $msgs[0].split("\t")[0];
            var $msginfo = $msgs[0].substr($msgname.length+1).replace(/\\r/g, '<br/>');
            if( $msgname == "." ) {
              $mydiv.append( "<p class='sc-info'>"+ $msginfo + "</p>");
            } else if ($msgname == '_') {
              $mydiv.append( "<p class='sc-system'>" + $msginfo + "</p>");
            } else if ($msgname == ':') {
              var $mycss = $msginfo.split("\t");
              var cls='sc-player-'+$mycss[0];
              jQuery('#'+cls+'-css').remove();
              jQuery('<style id="'+cls+'-css">.'+ cls + " {" + $mycss[1] + "}</style>").appendTo('head');
            } else {
              $mydiv.append("<p class='sc-player-"+$msgname.split(/[^A-Za-z0-9]/).join('')+"'><span>"+$msgname+"</span>"+$msginfo+"</p>");
              if ($sc_osc) $sc_osc.p($msgname);
            }
            $msgs.shift();
          }
          $mydiv.scrollTop($mydiv.get(0).scrollHeight);
        }
      }

      jQuery('#sc-send-'+scid).keydown( function(e) {
        if(e.which == 13 && !e.shiftKey){
          var $mymsg = this.value.replace(/^\s+|\s+$/g,'');
          if( $mymsg.length > 0 ) {
            if ($mymsg == '/fast') {
              $sc_period=1000;
            } else if ($mymsg == '/slow') {
              $sc_period=5000;
            } else if ($mymsg == '/unmute') {
              unmute();
              $sc_osc.p();
            } else if ($sc_osc && $mymsg == '/mute') {
              mute();
            } else if ($sc_osc && $mymsg.startsWith('/tune')) {
              t = $mymsg.substr(6).split(' ');
              if (t.length == 1) $sc_osc.f = parseFloat(t[0]) || 440;
              else if (t.length == 2) $sc_osc[t[0]] = parseFloat(t[1]) || 440;
              $sc_osc.p();
            } else if ($mymsg.startsWith('/font ')) {
              font = $mymsg.substr(6);
              jQuery('#sc-chatarea-'+scid).css('font-family', font);
            } else if ($mymsg.startsWith('/fontsize ')) {
              font = $mymsg.substr(10);
              jQuery('#sc-chatarea-'+scid).css('font-size', parseInt(font));
            } else {
              _sendmsg_(room, user, 'send', sc_add_msg, $mymsg);
              clearInterval($sc_loop[room]);
              refresh();
            }
          }
          this.value = "";
          return false;
        }
      });

        // if ($sc_loop[room]) clearInterval($sc_loop[room]);

      function refresh(){
        $sc_loop[room] = setInterval(function(){
          if( ($sc_semaphore[room] || 0) >= 0 && jQuery('#sc-chatarea-'+scid+':hover').length == 0) {
            $sc_semaphore[room]--;
            _sendmsg_(room, user, 'update', sc_add_msg,
              undefined , function( data ) { $sc_semaphore[room] = ($sc_semaphore[room]||0) + 1; });
          }
        }, $sc_period);
      }

      _sendmsg_(room, user, 'entered', sc_add_msg, undefined, refresh);
    }
  });

});
