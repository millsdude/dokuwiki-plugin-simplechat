<?php

if(!defined('DOKU_INC')) define('DOKU_INC',realpath(dirname(__FILE__).'/../../../').'/');
require_once(DOKU_INC.'inc/init.php');
require_once(DOKU_INC.'inc/common.php');

class simplechat_storage_file {
  private static $filename = '';

  public static function init()
  {
    // clean room name to generate a file
    $room = str_replace(array(' ','.','/',':'),array('','','-','-'),$_POST['room']);
    self::$filename = DOKU_INC.'data/chats/log_'.$room.'.txt';
  }

  public static function save_msg($newmsgline){
    $fh = fopen(self::$filename,'a+');
    fwrite($fh , $newmsgline . "\n");
    fclose($fh);
  }

  public static function get_msgs($startidx){
    $linecount = 0;
    $result = "";
    $prevline = "";
    $fh = @fopen( self::$filename, "r" );
    if( $fh ) {
      while(!feof($fh)){
        $line = fgets($fh);
        if( $linecount >= $startidx ) {
          if ($prevline != $line) { 
            $result .=  $line;
          }
        }
        $linecount++;
        $prevline = $line;
      }
      fclose($fh);
      if( $startidx > $linecount ) {
        // file was reset, start the client at the beginning
        $linecount = 0;
      }
    }
    if (strlen($result)) $result .= (string)($linecount-1); // last line in response is the new current count
    return $result;
  }
}
/* MAIN */
if (isset($conf['plugin']['simplechat']['command_parser'])){
  try {
    require_once($conf['plugin']['simplechat']['command_parser']);
  } catch (Exception $e) {
    echo ".\t" . $e->getMessage();
  }
} else {
  require_once(dirname(__FILE__).'/commands.php');
}
if (true) {
  class simplechat_db extends simplechat_storage_file {};
}
simplechat_db::init();

switch( $_POST['cmd'] ){
case 'send':// got a message from user
  $msg = str_replace( array("\r","\n"), '\r', trim($_POST['msg']) );
  if( strlen($msg) > 0 ) {
    list($newmsg, $infomsg, $directmsg, $css) = plugin_simplechat_parse_cmd($msg);
    if ($newmsg != "") {
      // store the user and message in tab separated text columns. prevent HTML injection
      simplechat_db::save_msg(htmlspecialchars($_POST['user'])."\t".htmlspecialchars($newmsg));
    }
    if( $infomsg != "" ) simplechat_db::save_msg(".\t".$infomsg);
    if( $directmsg != "" ) echo "_\t".$directmsg;
    if( $css != "" ) simplechat_db::save_msg(":\t".preg_replace('/\W/', '', $_POST['user'])."\t".$css);
  }
  echo simplechat_db::get_msgs($_POST['start']);
  break;
case 'update': // give us lines after previous count, and the new count
  echo simplechat_db::get_msgs($_POST['start']);
  break;
case 'entered': // someone entered the chat room.
  simplechat_db::save_msg(".\t".htmlspecialchars($_POST['user'])." entered the chat.");
  echo simplechat_db::get_msgs($_POST['start']);
  break;
case 'exited': // someone left the chat room.
  simplechat_db::save_msg(".\t".htmlspecialchars($_POST['user'])." left the chat.");
  break;

default: break;
}
?>
