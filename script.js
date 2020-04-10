jQuery(document).ready(function(){
  var $ScChatstatus = {};
  var $ScSemaphore = {};
  var $ScActivated = {};
  var $ScLoop = {};
  var $ScUser = jQuery('.sc-wrap');
  var $ScPeriod = 5000;
  var $ScOsc = {
    t:400, // duration
    f:329, // frequency
    F:{}
  };

  function ScMSG(room, user, cmd, cb, msg, complete){
    if (!$ScActivated[room]) return;
    jQuery.ajax(DOKU_BASE + 'lib/plugins/simplechat/ajax.php', {
      method: 'post',
      error: function(err) {
          console.log('ajax.php error : ' + err.status);
      },
      data: { cmd: cmd, msg: msg,
        room: room,
        user: user,
        start: $ScChatstatus[room] || 0,
        async: (cmd=='send' || cmd=='update') 
      },
      success: cb,
      complete: complete
    });
  }

  function unmute(){
    $ScOsc.a = new(window.AudioContext || window.webkitAudioContext)();
    $ScOsc.o = $ScOsc.a.createOscillator();
    $ScOsc.g = $ScOsc.a.createGain();
    $ScOsc.o.type = 'sine';
    $ScOsc.g.gain.value = 0;
    $ScOsc.o.frequency.value = 440;
    $ScOsc.g.connect($ScOsc.a.destination);
    $ScOsc.o.connect($ScOsc.g);
    $ScOsc.p = function (id) {
      $CurTime = Math.floor(2 + ($ScOsc.a.currentTime*10))/10;
      $ScOsc.o.frequency.value = $ScOsc.F[id] || $ScOsc.f;
      $CurAttack = [0.3,0.4,0.3,0.2,0.1,0];
      $ScOsc.g.gain.setValueCurveAtTime($CurAttack.map(function(x){
        return x*(440/$ScOsc.o.frequency.value);
      }), $CurTime, $ScOsc.t/1000);
    };
    $ScOsc.o.start();
  }
  function mute(){
    $ScOsc.o.stop();
    $ScOsc.p = undefined;
  }

  function tune(v){
    v.split(',').forEach(function (vv){
      var t = vv.split(' ');
      if (t.length == 1) $ScOsc.f = parseFloat(t[0]) || 440;
      else if (t.length == 2) $ScOsc.F[t[0]] = parseFloat(t[1]) || 440;
    });
  }

  $classnames = {};
  function color(v){
    v.split(',').forEach(function (vv){
      var t = vv.split(" "); var c, css='';
      var cls='sc-player-'+t[0].split(/[^A-Za-z0-9]/).join('');
      jQuery('#'+cls+'-css').remove();
      if (/[#0-9a-z]*\.[a-z-]+/.test(t[1])){
        c = t[1].split('.');
      } else if (/[#0-9a-z]+( [#0-9a-z]+)?/.test(t[1])){
        css = "background:"+(t.length>2?t[2]:'inherit')+";";
        c = [t[1],''];
      } else { 
        c = [t[1],''];
      }
      $classnames[t[0]]=cls+' '+c[1];
      jQuery('.'+cls).each(function(){
        this.className = cls + ' ' + c[1];
      });
      if (c[0].length) css += "color:"+c[0]+" !important;";
      jQuery('<style id="'+cls+'-css">.'+cls+"{"+css+"}</style>").appendTo('head');
    });
  }

  function scActivate(){
    var room = jQuery(this).parent().data('room');
    if (this.checked && !$ScActivated[room]){
      var [scid, user, tuning, shtune, coloring, shstyle, fast]  = jQuery(this).parent().data('sc').split('\t');
      $ScActivated[room] = true;

      // setup unload to report user leaving chat
      jQuery(window).unload( function(){
        ScMSG(room, user, 'exited');
      });
      jQuery(this).on('remove', function(){
        ScMSG(room, user, 'exited');
        $ScActivated[room] = false;
        clearInterval($ScLoop[room]);
      });

      function ScAddMsg(data){
        if( data != "" ) {
          var $mydiv = jQuery('#sc-chatarea-'+scid);
          // if ($mydiv.length == 0) { $ScActivated[room] = false; return; }
          var $msgs = data.split("\n");
          if ($msgs.length > 1)
            $ScChatstatus[room] = $msgs.pop();
          while( $msgs.length ) {
            var $msgname = $msgs[0].split("\t")[0];
            var $msginfo = $msgs[0].substr($msgname.length+1).replace(/\\r/g, '<br/>');
            if( $msgname == "." ) {
              $mydiv.append( "<p class='sc-info'>"+ $msginfo + "</p>");
            } else if ($msgname == '_') {
              $mydiv.append( "<p class='sc-system'>" + $msginfo + "</p>");
            } else if ($msgname == '#') { // read tuning
              tune($msginfo);
            } else if ($msgname == ':') { // read color infos 
              color($msginfo, 1);
            } else {
              cls =  $classnames[$msgname] ||( "sc-player-" + $msgname.split(/[^A-Za-z0-9]/).join('') );
              $mydiv.append("<p class='"+cls+"'><span>"+$msgname+"</span>"+$msginfo+"</p>");
              if ($ScOsc.p) $ScOsc.p($msgname);
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
              $ScPeriod=1000;
            } else if ($mymsg == '/slow') {
              $ScPeriod=5000;
            } else if ($mymsg == '/unmute') {
              unmute();
              $ScOsc.p();
            } else if ($ScOsc.p && $mymsg == '/mute') {
              mute();
            } else if (!shtune && $mymsg.startsWith('/tune')) {
              tune($mymsg.substr(6));
            } else if (!shstyle && $mymsg.startsWith('/color')) {
              color(user + ' ' + $mymsg.substr(7), 0);
            } else if ($mymsg.startsWith('/font ')) {
              font = $mymsg.substr(6);
              jQuery('#sc-chatarea-'+scid).css('font-family', font);
            } else if ($mymsg.startsWith('/fontsize ')) {
              font = $mymsg.substr(10);
              jQuery('#sc-chatarea-'+scid).css('font-size', parseInt(font));
            } else {
              ScMSG(room, user, 'send', ScAddMsg, $mymsg);
              clearInterval($ScLoop[room]);
              refresh();
            }
            if ($ScOsc.p && $mymsg.startsWith('/tune')) {
              $ScOsc.p();
            }
          }
          this.value = "";
          return false;
        }
      });

        // if ($ScLoop[room]) clearInterval($ScLoop[room]);

      function refresh(){
        $ScLoop[room] = setInterval(function(){
          if( ($ScSemaphore[room] || 0) >= 0 && jQuery('#sc-chatarea-'+scid+':hover').length == 0) {
            $ScSemaphore[room]--;
            ScMSG(room, user, 'update', ScAddMsg,
              undefined , function( data ) { $ScSemaphore[room] = ($ScSemaphore[room]||0) + 1; });
          }
        }, $ScPeriod);
      }
      function endinit(){
        if (coloring){
          if (!(shstyle && Object.keys($classnames).length)) color(coloring);
        }
        if (tuning){
          if (!(shtune && Object.keys($ScOsc.F).length) && tuning != 't') tune(tuning);
          if (!$ScOsc.p) unmute();
        }
        refresh();
      }

      ScMSG(room, user, 'entered', ScAddMsg, undefined, endinit);

    }
  }
  jQuery('body').on('change', 'input.sc-activate', scActivate);
  jQuery('input.sc-activate').each(scActivate);

});
