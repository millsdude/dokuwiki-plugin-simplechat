<?php

if(!defined('DOKU_INC')) define('DOKU_INC',realpath(dirname(__FILE__).'/../../../').'/');
require_once(DOKU_INC.'inc/init.php');
require_once(DOKU_INC.'inc/common.php');

function startsWith($haystack, $needle)
{
    return !strncmp($haystack, $needle, strlen($needle));
}
	$result="";
	$cmd = $_GET['cmd'];
	$room = str_replace(array(' ','.','/',':'),array('','','-','-'),$_GET['room']); // need to clean this. remove spaces, remove dots , change slashes to underlines
	$filename = DOKU_INC.'data/chats/log_'.$room.'.txt';
	switch( $cmd ){
	case 'send':// got a message from user
		$msg = str_replace( array("\r","\n"), '\r', trim($_GET['msg']) );
		if( strlen($msg) > 0 ) {
			// here is where you check for special commands
			$newmsgline = "";
			if( startsWith($msg,"/" )) {
				if( startsWith( $msg, "/me ") ) {
					$newmsgline = ".\t&laquo;".htmlspecialchars($_GET['user'])." ".htmlspecialchars( substr( $msg , 4) )."&raquo;\n";
				} elseif ( startsWith( $msg, "/time") ){
					$newmsgline = ".\t&laquo;Current server time is ".date('Y-m-d H:i:s')." [".date_default_timezone_get()."]&raquo;\n";
				} elseif ( startsWith( $msg, "/flip") ){
					$coin = array("heads","tails");
					$newmsgline = ".\t&laquo;".htmlspecialchars($_GET['user'])." flips a coin. It is ".$coin[rand(0,1)]."&raquo;\n";
				} elseif ( startsWith( $msg, "/roll") ){
					$dicesides = intval(substr( $msg , 6 )); 
					if( $dicesides < 2 ) { $dicesides = 100; }
					$newmsgline = ".\t&laquo;".htmlspecialchars($_GET['user'])." rolls a ".rand(1,$dicesides)." out of ".$dicesides."&raquo;\n";
				} else {
					$result = "Commands:<br>";
					$result .= "/me action - emote an action. (/me smiles)<br>";
					$result .= "/time - display server time.<br>";
					$result .= "/flip - user flips a coin.<br>";
					$result .= "/roll # - user rolls a # sided dice (defaults 100).<br>";
				}
			} else {
				// store the user and message in tab separated text columns. prevent HTML injection
				$newmsgline = htmlspecialchars($_GET['user'])."\t".htmlspecialchars($msg)."\n";
			}
			if( $newmsgline != "" ) {
				$fh = fopen($filename,'a+');
				fwrite( $fh , $newmsgline );
				fclose($fh );
			}
			break;
		} else {
			$result = "";
			break;
		}
	case 'update': // give us lines after previous count, and the new count
		$linecount = 0;
		$result = "";
		$startline = $_GET['start'];
		$fh = @fopen( $filename, "r" );
		if( $fh ) {
			while(!feof($fh)){
				$line = fgets($fh);
				if( $linecount >= $startline ) $result .=  $line;
				$linecount++;
			}
			fclose($fh);
			if( $startline > $linecount ) {
				// file was reset, start the client at the beginning
				$linecount = 0;
			}
		}
		$result .= (string)($linecount-1); // last line in response is the new current count
		break;
	case 'entered': // someone entered the chat room.
		$newmsgline = ".\t".htmlspecialchars($_GET['user'])." entered the chat.\n";
		$fh = fopen($filename,'a+');
		fwrite( $fh , $newmsgline );
		fclose($fh );
		break;
	case 'exited': // someone left the chat room.
		$newmsgline = ".\t".htmlspecialchars($_GET['user'])." left the chat.\n";
		$fh = fopen($filename,'a+');
		fwrite( $fh , $newmsgline );
		fclose($fh );
		break;

	default: break;
	}
	
echo $result;
?>