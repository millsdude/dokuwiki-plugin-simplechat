<?php
class simplechat_storage_file {
  private static $filename = '';
  private static $filename_meta = '';
  private static $roomname = '';
  private static $newMsgs = array();  // an array of messages to add in db
  private static $user;
  private static $startidx=0;  // user index for message
  public static $sep = "\t";  // column separator for returned columns in text format

  public static function init($roomname, $user="", $start=NULL)
  {
    // clean room name to generate a file
    self::$roomname = $roomname;
    $room = str_replace(array(' ','.','/',':'),array('','','-','-'),$roomname);
    self::$filename = DOKU_INC.'data/chats/'.$room.'.txt';
    self::$filename_meta = DOKU_INC.'data/chats/'.$room.'.users';
    if (!is_null($start)) self::$startidx = $start;
    self::$user = $user;
  }

  public static function addMsg($name, $content){
    array_push(self::$newMsgs, $name."\t".$content);
  }

  public static function info()
  {
    $ret = "";
    $dir = str_replace('.txt', '', self::$filename);
    $ret .= "room        : ".self::$roomname.'<br>';
    $ret .= "user        : ".self::$user.'<br>';
    $ret .= "active file : ".self::$filename.'<br>';
    if (!is_file(self::$filename)) $ret .= '- file not found<br>';
    $ret .= "archives in : ".$dir.'<br>';

    if (is_dir($dir)) {
      foreach(glob(str_replace('.txt', '/*.txt',self::$filename)) as $file) {
        $ret .= "- ".$file." (" . filesize($file) . ")<br>";
      }
    } else $ret .= '- directory not found<br>';

    $ret .= "meta file : ".self::$filename_meta.'<br>';
    if (is_file(self::$filename_meta)) {
      $ret .= "users/timestamps : <br>";
      $fh = fopen(self::$filename_meta, "r");
      if( $fh ) {
        while(!feof($fh)){
          $line = fgets($fh);
          if ($line === false) break;
          $ret .= "- ".rtrim($line)."<br>";
        }
        fclose($fh);
      }
    } else $ret .= '- file not found<br>';
    return $ret;

  }

  public static function purge()
  {
    try {
      if (is_file(self::$filename)) unlink( self::$filename );
      if (is_file(self::$filename_meta)) unlink( self::$filename_meta );
      foreach(glob(str_replace('.txt', '/*.txt',self::$filename)) as $file) {
        unlink( $file );
      }
      rmdir(str_replace('.txt', '/',self::$filename));
      return "All file related to ".self::$roomname." are delete";
    } catch (Exception $e) {
      return $e->getMessage();
    }
  }

  public static function countUsers(){
    $nbusers = 0;
    $fh = fopen(self::$filename_meta, "r" );
    $curtime= (new DateTime())->getTimestamp();
    if( $fh ) {
      while(!feof($fh)){
        $line = fgets($fh);
        $userstatus = explode(" ",rtrim($line));
        if ($curtime > (intval($userstatus[1]) + 5)){
          self::addMsg('-',$userstatus[0]);
        } else {
          $nbusers ++;
        }
      }
      fclose($fh);
    }
    return $nbusers;
  }

  public static function proceed(){
    if (is_null(self::$user)) return;
    $linecount = 0;
    $result = "";
    try {
      $now = new DateTime();
      $curtime= $now->getTimestamp();
      // check previous users
      $fh = fopen(self::$filename_meta, "r");
      $stats = array();
      if( $fh ) {
        $newuser = True;
        while(!feof($fh)){
          $line = fgets($fh);
          if ($line === false) break;
          $userstatus = explode(" ",rtrim($line));
          if ($userstatus[0] == self::$user) {
            $newuser = False;
          } elseif ($curtime > (intval($userstatus[1]) + 5)){
            self::addMsg('-',$userstatus[0]);
          } else {
            array_push($stats, $line);
          }
        }
        fclose($fh);
        array_push($stats, self::$user.' '.((string) $curtime)."\n");
        if ($newuser) self::addMsg('+', self::$user);
      }
      $fh = fopen(self::$filename_meta, "w");
      if( $fh ) {
        foreach($stats as $l){
          fwrite($fh, $l);
        }
        fclose($fh);
      }
      // read write, point to start of file
      $fh = fopen(self::$filename, 'r');
      if( $fh ) {
        while(!feof($fh)){
          $line = fgets($fh);
          if( $linecount >= self::$startidx ) {
            $result .=  $line;
          }
          $linecount++;
        }
        fclose($fh);
      }
      if (count(self::$newMsgs)>0) {
        $fh = fopen(self::$filename, "a+");
        if ($fh){
          //write new messages
          foreach(self::$newMsgs as $newmsgline) { 
            $newmsgline .= "\n";
            fwrite($fh, $newmsgline);
            $result .= $newmsgline;
            $linecount++;
          }
          fclose($fh);
        }
        self::$newMsgs = array();
      }
      // last line in response is the new current count
      if( self::$startidx > $linecount ) {
        // file was reset, start the client at the beginning
        $linecount = 0;
      }
      if (strlen($result)) $result .= (string)($linecount-1);
    } catch (Exception $e) {
      $result = $e->getMessage()."\n0"; 
    }
    return $result;
  }
}

class simplechat_db extends simplechat_storage_file {};
?>
