<?php

if(!defined('DOKU_INC')) define('DOKU_INC',realpath(dirname(__FILE__).'/../../../').'/');
require_once(DOKU_INC.'inc/init.php');
require_once(DOKU_INC.'inc/common.php');
require_once(dirname(__FILE__).'/db.php');

if (isset($conf['plugin']['simplechat']['command_parser'])){
  try {
    require_once($conf['plugin']['simplechat']['command_parser']);
  } catch (Exception $e) {
    echo ".\t" . $e->getMessage();
  }
} else {
  require_once(dirname(__FILE__).'/commands.php');
}

$sc_user = strip_tags(trim($_POST['user']));
$directmsg = "";

simplechat_db::init($_POST['room'], $sc_user, $_POST['start']);
if ($_POST['cmd'] == 'send'){
  $msg = str_replace( array("\r","\n"), '\r', trim($_POST['msg']) );
  if( strlen($msg) > 0 ) {
    global $USERINFO;
    list($newmsg, $infomsg, $directmsg, $colorstyle, $tune, $break) = plugin_simplechat_parse_cmd($msg, $USERINFO, simplechat_db::class);
    if ($newmsg != "") {
      // store the user and message in tab separated text columns. prevent HTML injection
      simplechat_db::addMsg($sc_user, htmlspecialchars($newmsg));
    }
    if( $infomsg != "" ) simplechat_db::addMsg(".", $infomsg);
    if( $colorstyle != "" ) simplechat_db::addMsg(":", preg_replace('/\W/', '', $sc_user).simplechat_db::$sep.$colorstyle);
    if( $tune != "" ) simplechat_db::addMsg("#", $tune);
  }
}
$result = simplechat_db::proceed();
if( $directmsg != "" ) {
  echo "_".simplechat_db::$sep.$directmsg;
} else {
  echo $result;
}
?>
