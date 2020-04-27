<?php

function startsWith($haystack, $needle)
{
  return !strncmp($haystack, $needle, strlen($needle));
}

/**
 * Plugin_simplechat_parse_cmd
 * 
 * @param string $msg          received msg
 * @param string $userinfo     info about current user
 * @param string $db           static class db manager
 * 
 * @return array (unparsed msg, info msg, direct msg)
 */
function plugin_simplechat_parse_cmd($msg, $userinfo, $dbm){
  $info = '';
  $directmsg = '';
  $colorstyle = '';
  $tune = '';
  $isadmin = in_array('admin', $userinfo['grps']);
  if( startsWith( $msg, "/") ) {
    if( startsWith( $msg, "/me ") ) {
      $info = "&laquo;".htmlspecialchars($_POST['user'])." ".htmlspecialchars( substr( $msg , 4) )."&raquo;\n";
    } elseif ( startsWith( $msg, "/time") ){
      $info = "&laquo;Current server time is ".date('Y-m-d H:i:s')." [".date_default_timezone_get()."]&raquo;\n";
    } elseif ( startsWith( $msg, "/color") ){
      $color = trim(substr( $msg , 7 ));
      if (preg_match('/^([a-z0-9#]*\.?[a-z-]+|[#0-9a-z]+( [#0-9a-z]+)?)$/', $color)) {
        $colorstyle = $color;
      }
    } elseif ( startsWith( $msg, "/tune") ){
      $tune = trim(substr( $msg , 6 ));
    } elseif ( startsWith( $msg, "/flip") ){
      $coin = array("heads","tails");
      $info = "&laquo;".htmlspecialchars($_POST['user'])." flips a coin. It is ".$coin[rand(0,1)]."&raquo;\n";
    } elseif ( startsWith( $msg, "/roll") ){
      $dicesides = intval(substr( $msg , 6 )); 
      if( $dicesides < 2 ) { $dicesides = 100; }
      $info = "&laquo;".htmlspecialchars($_POST['user'])." rolls a ".rand(1,$dicesides)." out of ".$dicesides."&raquo;\n";
    } elseif ( $msg == '/' || $msg == '/help') {
      $directmsg = "<h5>Commands</h5><p>";
      $directmsg .= "/me action - emote an action. (/me smiles)<br>";
      $directmsg .= "/time - display server time.<br>";
      $directmsg .= "/flip - user flips a coin.<br>";
      $directmsg .= "/roll # - user rolls a # sided dice (defaults 100).<br>";
      $directmsg .= "/color fg bg - set color in chat.<br>";
      $directmsg .= "/tune [name] 220 - change freq of the sound notification<br>";
      $directmsg .= "</p><h5>Local commands</h5><p>";
      $directmsg .= "/fast - enable a faster chat update<br>";
      $directmsg .= "/slow - disable faster chat update<br>";
      $directmsg .= "/resize x - resize chatter height to see x lines<br>";
      $directmsg .= "/unmute - enable sound notification<br>";
      $directmsg .= "/mute - disable sound notification<br>";
      $directmsg .= "/hide name - remove messages from name<br>";
      $directmsg .= "/unhide name - re-enable messages from name<br>";
      $directmsg .= "/filter [name] [name2...] - if name is set then show only messages written by name<br></p>";
      if ($isadmin) {
        $directmsg .= "<h5>Admin commands</h5><p>";
        $directmsg .= "/forgetall - remove the content of this chatroom<br>";
        $directmsg .= "/sysinfo   - syteminfos of this chatroom<br>";
        $directmsg .= "/listrooms - list all chat rooms <br>";
        $directmsg .= "/debug     - very verbose debug infos <br>";
        $directmsg .= "</p>";
      }
    } elseif ( $isadmin ) {
      if (startsWith($msg, '/forgetall')){
        $directmsg = "<p>".$dbm::purge(trim(substr($msg,10)))."</p>";
      } elseif ($msg == '/sysinfo'){
        $directmsg = "<p>".$dbm::info()."</p>";
      } elseif ($msg == '/listrooms'){
        $directmsg = "<p>".$dbm::listrooms()."</p>";
      } elseif ($msg == '/debug'){
        $directmsg = "<pre>".$dbm::debug()."</pre>";
      }
    }
    $msg='';
  }
  return array($msg, $info, $directmsg, $colorstyle, $tune); 
}

?>
