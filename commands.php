<?php

function startsWith($haystack, $needle)
{
  return !strncmp($haystack, $needle, strlen($needle));
}

/**
 * Plugin_simplechat_parse_cmd
 * 
 * @param string $msg          received msg
 * 
 * @return array (unparsed msg, info msg, direct msg)
 */
function plugin_simplechat_parse_cmd($msg){
  $info = '';
  $directmsg = '';
  $style = '';
  if( startsWith( $msg, "/") ) {
    if( startsWith( $msg, "/me ") ) {
      $info = "&laquo;".htmlspecialchars($_POST['user'])." ".htmlspecialchars( substr( $msg , 4) )."&raquo;\n";
    } elseif ( startsWith( $msg, "/time") ){
      $info = "&laquo;Current server time is ".date('Y-m-d H:i:s')." [".date_default_timezone_get()."]&raquo;\n";
    } elseif ( startsWith( $msg, "/color") ){
      $color = substr( $msg , 7 );
      if (!preg_match('/[<>&]/', $color)) {  // avoid XSS
        if (trim($color) == "") {
          $style = "color:inherit;background:inherit;";
        } else {
          $fgbg = explode(' ', $color);
          $style = "color:".trim($fgbg[0]).";";
          if (count($fgbg)>1) $style .= "background:".trim($fgbg[1]).";";
        }
      }
    } elseif ( startsWith( $msg, "/flip") ){
      $coin = array("heads","tails");
      $info = "&laquo;".htmlspecialchars($_POST['user'])." flips a coin. It is ".$coin[rand(0,1)]."&raquo;\n";
    } elseif ( startsWith( $msg, "/roll") ){
      $dicesides = intval(substr( $msg , 6 )); 
      if( $dicesides < 2 ) { $dicesides = 100; }
      $info = "&laquo;".htmlspecialchars($_POST['user'])." rolls a ".rand(1,$dicesides)." out of ".$dicesides."&raquo;\n";
    } else {
      $directmsg = "Commands:<br>";
      $directmsg .= "/me action - emote an action. (/me smiles)<br>";
      $directmsg .= "/time - display server time.<br>";
      $directmsg .= "/flip - user flips a coin.<br>";
      $directmsg .= "/roll # - user rolls a # sided dice (defaults 100).<br>";
      $directmsg .= "/color fg bg - set color in chat.<br>";
    }
    $msg = '';
  }
  return array($msg, $info, $directmsg, $style); 
}

?>
