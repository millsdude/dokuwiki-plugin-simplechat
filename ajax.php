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
global $USERINFO;
/*$username = $USERINFO['name'];*/
/*$scuser = strip_tags(trim($username));*/
$isadmin = in_array('admin', $USERINFO['grps']);
if ($_POST['cmd'] == 'remove'){
  $linedesc = $_POST['msg'];
  if ($isadmin && substr($linedesc, -1) == '-') {
    simplechat_db::dropMsg($sc_user, intval($linedesc));
  } else {
    simplechat_db::requestDropMsg($sc_user, intval($linedesc));
  }
} else {
  if ($_POST['cmd'] == 'send'){
    $msg = str_replace( array("\r","\n"), '\r', trim($_POST['msg']) );
    if( strlen($msg) > 0 ) {
      list($newmsg, $infomsg, $directmsg, $colorstyle, $tune, $filedata) = plugin_simplechat_parse_cmd($msg, $USERINFO, $isadmin, simplechat_db::class);
      if ($newmsg != "") {
        // store the user and message in tab separated text columns. prevent HTML injection
        // exception for iframe
        if ( startsWith( $msg, "<iframe") ){
          simplechat_db::addMsg($sc_user, $newmsg, True); // with line number
        } else {
          simplechat_db::addMsg($sc_user, htmlspecialchars($newmsg), True); // with line number
        }
      }
      if( $infomsg != "" ) simplechat_db::addMsg(".", $infomsg);
      if( $colorstyle != "" ) simplechat_db::addMsg(":", preg_replace('/\W/', '', $sc_user).simplechat_db::$sep.$colorstyle);
      if( $tune != "" ) simplechat_db::addMsg("#",  preg_replace('/\W/', '', $sc_user).simplechat_db::$sep.$tune);
    }
  }
  $result = simplechat_db::proceed();
  if( $directmsg != "" ) {
    echo "_".simplechat_db::$sep.$directmsg;
  } elseif ( $filedata ) {
    echo "/".simplechat_db::$sep.$filedata;
  } else {
    echo $result;
  }
}
?>
