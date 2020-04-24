/*
 *  Create the chat frame for each div.sc-wrap
 */

jQuery(document).ready(function($){
  var state = {},  // chat status
    sem = {},      // semaphore
    users = {},    // users connected
    hidden = {},    // users filtering
    lp = {},       // loop for each chat
    period = 5000, // time for update
    osc = {        // monotonic sound generator
      t:400,       //   duration
      f:329,       //   global frequency
      F:{},        //   per user frequency
      env : [0.3,0.4,0.3,0.2,0.1,0]  // envelope
    },             
    clsdef = {},   // css class name for messages by users
    st = {},       // store for html elements
    dom = document;

  /*
   * CORE METHODS 
   */

  /* function Msg apply the ajax transaction 
   *    room    = id of the channel
   *    user    = current user
   *    cmd     = transaction type (
   *       entered, -> notify arrival and get messages
   *       send,    -> send message (msg) and get new messages
   *       update   -> get new messages
   *       )
   *    cb       = callback function
   *    msg      = the message to send
   *    complete = what to do once callback is done
   */
  function Msg(room, user, cmd, cb, msg, complete){
    if (state[room] === undefined) return;
    $.ajax(DOKU_BASE + 'lib/plugins/simplechat/ajax.php', {
      method: 'post',
      error: function(err) {
        console.log('ajax.php error : ' + err.status);
      },
      data: { cmd: cmd, msg: msg,
        room: room,
        user: user,
        start: state[room],
        async: (cmd=='send' || cmd=='update') 
      },
      success: cb,
      complete: complete
    });
  }

  /*
   * unmute the sound generator
   */
  function unmute(){
    osc.a = new(window.AudioContext || window.webkitAudioContext)();
    osc.o = osc.a.createOscillator();
    osc.g = osc.a.createGain();
    osc.o.type = 'sine';
    osc.g.gain.value = 0;
    osc.o.frequency.value = 440;
    osc.g.connect(osc.a.destination);
    osc.o.connect(osc.g);
    osc.p = function (id) {
      osc.o.frequency.value = osc.F[id] || osc.f;
      try {
        osc.g.gain.setValueCurveAtTime(
          osc.env.map(function(x){
            // redefine sound amplitude given frequency
            return x*(440/osc.o.frequency.value);
          }),
          Math.floor(2 + (osc.a.currentTime*10))/10,
          osc.t/1000
        );
      } catch(e) {
        // pass
      }
    };
    osc.o.start();
  }

  /*
   * mute the sound generator
   */
  function mute(){
    osc.o.stop();
    osc.p = undefined;
  }

  /*
   * setup the sound frequency
   *    v = freq, user1 freq, user2 freq
   */
  function tune(v){
    v.split(',').forEach(function (vv){
      var t = vv.split(' ');
      if (t.length == 1) osc.f = parseFloat(t[0]) || 440;
      else if (t.length == 2) osc.F[t[0]] = parseFloat(t[1]) || 440;
    });
  }

  /*
   * setup the color
   *    v = user1 fg bg, user2 fg.class
   */
  function color(v){
    v.split(',').forEach(function (vv){
      var t = vv.split(" "),  // current instruction [username, [color.class|fg bg]]
        c,                    // will store [color fg, color bg]
        css='',               // new css that will be added for username
        cls='sc-player-'+t[0].split(/[^A-Za-z0-9]/).join(''); // classname pointing user messages

      if (!st[cls]) {
        st[cls] = dom.createElement('style');
        dom.head.appendChild(st[cls]);
      }
      if (/[#0-9a-z]*\.[a-z-]+/.test(t[1])){
        c = t[1].split('.');
      } else if (/[#0-9a-z]+( [#0-9a-z]+)?/.test(t[1])){
        css = "background:"+(t.length>2?t[2]:'inherit')+";";
        c = [t[1],''];
      } else { 
        c = [t[1],''];
      }
      clsdef[t[0]]=cls+' '+c[1];
      $('.'+cls).each(function(){
        this.className = cls + ' ' + c[1];
      });
      if (c[0].length) css += "color:"+c[0]+" !important;";
      st[cls].innerHTML='.'+cls+"{"+css+"}";
    });
  }

  /*  create HTML elements faster than jQuery */
  function el(p, t, attrs, cls){
    var a = dom.createElement(t);
    for (var k in attrs)
      if (attrs.hasOwnProperty(k)) {
        a.setAttribute(k, ((k==='id' && cls)?cls+'-':'')+attrs[k]);
      }
    if (cls) a.className = cls;
    p.appendChild(a);
    return a;
  }

  /*
   * MAIN PART
   * manage each chat box on the page
   */
  $('.sc-wrap').each(function(){
    // hoping everybody have js ES6
    var [room, title, fold, scid, user, tuning, shtune, coloring, shstyle, nb, fast]  = $(this).data('sc').split('\t');

    var editbtn = $(this).parent().next();
    var lbl=el(this, 'label', {for:'sc-activate-'+scid}),
      tg=el(this, 'input', {id:scid, type:'checkbox'}, 'sc-activate'),
      us=el(el(this, 'div', {}), 'ul', {}, 'sc-users'),
      frame=el(this, 'div', {}, 'sc-chatframe'),
      view=el(frame, 'div', {id:scid}, 'sc-chatarea'),
      vsize=el(this, 'div', {}, 'sc-resize'),
      mpos, // mouse position
      msgarea=el(this, 'form', {}, 'sc-messagearea'),
      msglbl=el(msgarea, 'label', {for:'sc-send-'+scid}),
      input=el(msgarea, 'textarea', {maxlength:250, id:scid}, 'sc-send');
    tg.checked = !fold;
    lbl.innerText = title;
    var lbs=el(lbl, 'span', {});
    lbs.innerText = ' (' + nb + ')';
    msglbl.innerText = 'Message';

    function resize(e){
      var dy = mpos - e.y;
      mpos = e.y;
      frame.style.height = (parseInt(getComputedStyle(frame, '').height) - dy) + "px";
    }

    vsize.addEventListener("mousedown", function(e){
      mpos = e.y;
      dom.addEventListener("mousemove", resize, false);
      // $(vsize).addClass('grabbing'); // useless
      e.preventDefault();
    }, false);

    dom.addEventListener("mouseup", function(){
      dom.removeEventListener("mousemove", resize, false);
      // $(vsize).removeClass('grabbing'); // useless
    }, false);

    function AddMsg(data){
      if( data ) {
        if (data.startsWith('_')) { // direct messages come alone
          $(view).append( "<div class='sc-system'>" + data.substr(2) + "</div>");
        } else {
          var msgs = data.split("\n");
          if (msgs.length > 1)
            state[room] = msgs.pop();
          while( msgs.length ) {
            var name = msgs[0].split("\t")[0];
            var content = msgs[0].substr(name.length+1).replace(/\\r/g, '<br/>');
            if (name == "+" ) {
              users[content] = 0;
            } else if(name == "-" ) {
              delete users[content];
            } else if(name == "." ) {
              $(view).append( "<p class='sc-info'>"+ content + "</p>");
            } else if (name == '#') { // read tuning
              tune(content);
            } else if (name == ':') { // read color infos 
              color(content, 1);
            } else if (!hidden[name]) {
              cls =  clsdef[name] ||( "sc-player-" + name.split(/[^A-Za-z0-9]/).join('') );
              $(view).append("<p class='"+cls+"'><span>"+name+"</span>"+content+"</p>");
              if (osc.p) osc.p(name);
            }
            msgs.shift();
          }
        }
        scrl();
      }
      $(us).empty();
      Object.keys(users).forEach(function (vv){
        el(us, 'li', {}, hidden[vv]?'sc-hidden':'').innerText = vv;
      });
    }
    function scrl(){
      $(frame).animate({scrollTop:view.scrollHeight}, 1000);
    }

    function On(){
      if (tg.checked) {
        editbtn.hide();
        if (state[room] === undefined){
          state[room] = 0;
          lbs.innerText = '';

          $(tg).on('remove', function(){
            state[room] = undefined;
            clearInterval(lp[room]);
          });

          input.onkeypress = function(e) {
            if(e.which == 13 && !e.shiftKey){
              var msg = input.value.replace(/^\s+|\s+$/g,'');
              if( msg.length > 0 ) {
                if (msg == '/fast') {
                  period=1000;
                } else if (msg == '/clean') {
                  $(view).empty();
                } else if (msg.startsWith('/hide')) {
                  $('p.sc-player-'+msg.substr(6), view).remove();
                  hidden[msg.substr(6)]=1; scrl();
                } else if (msg.startsWith('/unhide')) {
                  hidden[msg.substr(8)]=0;
                } else if (msg.startsWith('/filter')) {
                  $('p', view).removeClass('hidden');
                  var sel=msg.substr(7).split(' ').join('):not(.sc-player-').substr(1);
                  if (sel) $('p' + sel +')',view).addClass('hidden'); scrl();
                } else if (msg == '/slow') {
                  period=5000;
                } else if (msg.startsWith('/resize')) {
                  frame.style.height = msg.substr(6) + "em";
                } else if (msg == '/unmute') {
                  unmute();
                  osc.p();
                } else if (osc.p && msg == '/mute') {
                  mute();
                } else if (!shtune && msg.startsWith('/tune')) {
                  tune(msg.substr(6));
                } else if (!shstyle && msg.startsWith('/color')) {
                  color(user + ' ' + msg.substr(7), 0);
                } else if (msg.startsWith('/font ')) {
                  font = msg.substr(6);
                  $('#sc-chatarea-'+scid).css('font-family', font);
                } else if (msg.startsWith('/fontsize ')) {
                  font = msg.substr(10);
                  $('#sc-chatarea-'+scid).css('font-size', parseInt(font));
                } else {
                  Msg(room, user, 'send', AddMsg, msg);
                  clearInterval(lp[room]);
                  refresh();
                }
                if (osc.p && msg.startsWith('/tune')) {
                  osc.p();
                }
              }
              input.value = ""; AddMsg();
              return false;
            }
          };
          var refresh = function(){
            // loop
            lp[room] = setInterval(function(){
              if( (sem[room] || 0) >= 0 && ($('#sc-chatarea-'+scid+':focus').length == 0 || $('#sc-send-'+scid+':focus'))) {
                sem[room]--;
                Msg(room, user, 'update', AddMsg,
                  undefined , function( data ) { sem[room] = (sem[room]||0) + 1; });
              }
            }, period);
          };
          Msg(room, user, 'entered', AddMsg, undefined,
            function(){  // init chatter and run loop once entered
              if (coloring && !(shstyle && Object.keys(clsdef).length)) color(coloring);
              if (tuning) {
                if (!(shtune && Object.keys(osc.F).length) && tuning != 't') tune(tuning);
                if (!osc.p) unmute();
              }
              refresh();
            });
        }
      } else editbtn.show();
    }
    tg.addEventListener('change', On);
    On();
  });

});
