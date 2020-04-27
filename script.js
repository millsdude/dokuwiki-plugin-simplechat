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
      env : [0,.16,.15,.15,.12,.09,.08,.05,0],  // envelope
      p: 0
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
    sem[room]--;
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
      complete: function(data){
        sem[room]++;
        if (complete) complete();
      }
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
  function tune(v, p){
    v.split(',').forEach(function (vv){
      var t = vv.split(/([\t ])/);
      if (t.length) { 
        var f = parseFloat(t.pop()) || 440, n=0;
        if (!t.length) osc.f = f;
        else {
           t.pop(); n=t.join(''); osc.F[n] = f; 
        }
        if (p && osc.p) osc.p(n);
      }
    });
    console.log(osc.F);
  }

  /*
   * setup the color
   *    v = user1 fg bg, user2 fg.class
   */
  function color(v){
    v.split(',').forEach(function (vv){
      var t = vv.replace("\t", " ").split(" "),  // current instruction [username, [color.class|fg bg]]
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
      if (c[0]) css += "color:"+c[0]+" !important;";
      st[cls].innerHTML='.'+cls+"{"+css+"}";
    });
  }

  /*  create HTML elements faster than jQuery */
  function el(p, t, cls, attrs){
    var a = dom.createElement(t);
    if (attrs) for (var k in attrs)
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
    var [room, title, fold, scid, user, snd, tuning, shtune, coloring, shstyle, nb, vm, fast]  = $(this).data('sc').split('\t');
    sem[room] = 0;
    var editbtn = $(this).parent().next();
    var
      vinf = el(this, 'a', 'sc-inf', {href:'#' + this.id}), // a litle popup to find the chatter
      lbl=el(this, 'label', 0, {for:'sc-activate-'+scid}),
      tg=el(this, 'input', 'sc-activate', {id:scid, type:'checkbox'}),
      mvdiv=el(this, 'div', 'sc-mvl sc-mv'),
      mvdiw=el(this, 'div', 'sc-mvr sc-mv'),
      mut=el(this, 'div', 'sc-mute'),
      us=el(el(this, 'div'), 'ul', 'sc-users'),
      frame=el(this, 'div', 'sc-chatframe'),
      view=el(frame, 'div', 'sc-chatarea', {id:scid}),
      vsize=el(this, 'div', 'sc-resize'),
      mposy, // mouse position
      dy, // mouse move
      wrap = this,
      msgarea=el(this, 'form', 'sc-messagearea'),
      msglbl=el(msgarea, 'label', 0,{for:'sc-send-'+scid}),
      input=el(msgarea, 'textarea', 'sc-send', {maxlength:300, id:scid}),
      buffer="";
    vinf.innerText = title;
    tg.checked = !fold;
    lbl.innerText = title;
    var lbs=el(lbl, 'span');
    lbs.innerText = ' (' + nb + ')';
    msglbl.innerText = 'Message';
    el(mut, 'img', 0, {src:'lib/images/notify.png'});

    function resize(e){
      dy = mposy - e.y;
      mposy = e.y;
      frame.style.height = (parseInt(getComputedStyle(frame, '').height) - dy) + "px";
    }
    function setViewMode(m){
      vm = m;
      wrap.style.removeProperty('left');
      wrap.style.removeProperty('right');
      if (m == 0) {
        vinf.hidden = false;
        $(wrap).removeClass('sc-win');
      } else {
        vinf.hidden = true;
        $(wrap).addClass('sc-win');
        if (m == 1) wrap.style.left = 0;
        else wrap.style.right = 0;
      }
    }
    vm = parseInt(vm);
    if (vm != 0) setViewMode(vm);
    mvdiv.onclick = function(e) { setViewMode(vm == 1 ? 0 : 1); e.preventDefault();};
    mvdiw.onclick = function(e) { setViewMode(vm == 2 ? 0 : 2); e.preventDefault();};

    var fmut=function(a){
      if (osc.p && a!=2) {
        $(mut).removeClass('on');
        mute(); 
      } else {
        $(mut).addClass('on');
        unmute();
        if (a!=1) osc.p();
      }
    };
    mut.onclick = fmut;
   
    var psnd = function(){
        var name = this.innerText;
        if (osc.p) osc.p(name);
    };

    vsize.addEventListener("mousedown", function(e){
      mposy = e.y;
      dom.addEventListener("mousemove", resize, false);
      e.preventDefault();
    }, false);

    dom.addEventListener("mouseup", function(){
      dom.removeEventListener("mousemove", resize, false);
    }, false);

    function AddMsg(data){
      if( data ) {
        var s = 0, sp, name, exp, msgs, content;
        if (data.startsWith('_')) { // direct messages come alone
          $(view).append( "<div class='sc-system'>" + data.substr(2) + "</div>");
        } else {
          msgs = data.split("\n");
          s = state[room];
          if (msgs.length > 1)
            state[room] = msgs.pop();
          while( msgs.length ) {
            name = msgs[0].split("\t")[0];
            content = " " + msgs[0].substr(name.length+1).replace(/\\r/g, '<br/> ');
            exp = /{{([-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])}}/i;
            content = content.replace(exp,"<img src='$1'/>");
            exp = /\[\[([-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])\]\]/i;
            content = content.replace(exp,"<a href='$1'>$1</a>");
            exp = /\[\[([-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])\|(.*)\]\]/i;
            content = content.replace(exp,"<a href='$1'>$2</a>");
            exp = /([^'"])((https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/i;
            content = content.replace(exp,"$1 <a href='$2'>$2</a>");
            content = content.replace(/^ /, '').replace('<br/> ', '<br/>');
            if (name == "+" ) {
              users[content] = 0;
            } else if(name == "-" ) {
              delete users[content];
            } else if(name == "." ) {
              $(view).append( "<p class='sc-info'>"+ content + "</p>");
              if (s) scrl();
            } else if (name == '#') { // read tuning
              tune(content);
            } else if (name == ':') { // read color infos 
              color(content);
            } else if (!hidden[name]) {
              cls =  clsdef[name] ||( "sc-player-" + name.split(/[^A-Za-z0-9]/).join('') );
              $(view).append("<p class='"+cls+"'><span>"+name+"</span>"+content+"</p>");
              if (osc.p) osc.p(name);
              if (s) scrl();
            }
            msgs.shift();
          }
        }
        if (!s) scrl();
      }
      $(us).empty();
      Object.keys(users).forEach(function (vv){
        var u=el(us, 'li', hidden[vv]?'sc-hidden':'');
        u.innerText = vv;
        $(u).click(psnd);
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
                var cmd = msg.split(' ')[0];
                if (msg == '/fast') {
                  period=1000;
                } else if (cmd == '/clean') {
                  $(view).empty();
                } else if (cmd == '/hide') {
                  $('p.sc-player-'+msg.substr(6), view).remove();
                  hidden[msg.substr(6)]=1; scrl();
                } else if (cmd == '/unhide') {
                  hidden[msg.substr(8)]=0;
                } else if (cmd == '/filter') {
                  $('p', view).removeClass('hidden');
                  var sel=msg.substr(7).split(' ').join('):not(.sc-player-').substr(1);
                  if (sel) $('p' + sel +')',view).addClass('hidden'); scrl();
                } else if (cmd == '/slow') {
                  period=5000;
                } else if (cmd == '/resize') {
                  frame.style.height = msg.substr(6) + "em";
                } else if (cmd == '/unmute') {
                  fmut(2)
                } else if (osc.p && cmd == '/mute') {
                  fmut(0);
                } else if ((!shtune && cmd == '/tune') || cmd == '/ttun') {
                  tune(msg.substr(6), 1);
                } else if (!shstyle && msg == '/color') {
                  color(user + ' ' + msg.substr(7));
                } else if (cmd == '/font') {
                  font = msg.substr(6);
                  $('#sc-chatarea-'+scid).css('font-family', font);
                } else if (cmd == '/fontsize') {
                  font = msg.substr(10);
                  $('#sc-chatarea-'+scid).css('font-size', parseInt(font));
                } else {
                  if (buffer) buffer += "\n" + msg;
                  else buffer = msg;
                }
              }
              input.value = ""; scrl();
              return false;
            }
          };
          var refresh = function(){
            // loop
            lp[room] = setInterval(function(){
              if( sem[room] >= 0 && ($('#sc-chatarea-'+scid+':focus').length == 0 || $('#sc-send-'+scid+':focus'))) {
                Msg(room, user, 'update', AddMsg);
              }
            }, period);
          };
          setInterval(function(){
            // loop for sending messages
            if (buffer && sem[room] >= 0){
              Msg(room, user, 'send', AddMsg, buffer);
              buffer = "";
              clearInterval(lp[room]);
              refresh();
            }
          }, 1000);
          Msg(room, user, 'entered', AddMsg, undefined,
            function(){  // init chatter and run loop once entered
              if (coloring && !(shstyle && Object.keys(clsdef).length)) color(coloring);
              if (tuning) tune(tuning);
              if (snd) fmut(1);
              refresh();
            });
        }
      } else editbtn.show();
    }
    tg.addEventListener('change', On);
    On();
  });

});
