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
    self::$filename = DOKU_INC.'data/chats/'.$room.'.txt';
  }

  public static function info()
  {
    $ret = "";
    $dir = str_replace('.txt', '', self::$filename);
    $ret .= "room        : ".$_POST['room'].'<br>';
    $ret .= "active file : ".self::$filename.'<br>';
    if (!is_file(self::$filename)) $ret .= ' file not found';
    $ret .= "archives in : ".$dir.'<br>';

    if (is_dir($dir)) {
      foreach(glob(str_replace('.txt', '/*.txt',self::$filename)) as $file) {
        $ret .= "- ".$file." (" . filesize($file) . ")<br>";
      }
    } else $ret .= ' directory not found';
    return $ret;

  }
  public static function purge()
  {
    try {
      unlink( self::$filename );
      foreach(glob(str_replace('.txt', '/*.txt',self::$filename)) as $file) {
        unlink( $file );
      }
      rmdir(str_replace('.txt', '/',self::$filename));
      return "All file related to ".$_POST['room']." are delete";
    } catch (Exception $e) {
      return $e->getMessage();
    }
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
    try {
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
    } catch (Exception $e) {
      $result = $e->getMessage()."\n0"; 
    }
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
    global $USERINFO;
    list($newmsg, $infomsg, $directmsg, $colorstyle, $tune, $break) = plugin_simplechat_parse_cmd($msg, $USERINFO, simplechat_db::class);
    if ($newmsg != "") {
      // store the user and message in tab separated text columns. prevent HTML injection
      simplechat_db::save_msg(htmlspecialchars($_POST['user'])."\t".htmlspecialchars($newmsg));
    }
    if( $infomsg != "" ) simplechat_db::save_msg(".\t".$infomsg);
    if( $directmsg != "" ) echo "_\t".$directmsg;
    if( $colorstyle != "" ) simplechat_db::save_msg(":\t".preg_replace('/\W/', '', $_POST['user'])."\t".$colorstyle);
    if( $tune != "" ) simplechat_db::save_msg("#\t".$tune);
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
