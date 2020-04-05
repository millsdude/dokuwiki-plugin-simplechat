<?php
/**
 * DokuWiki Plugin simplechat (Syntax Component)
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 * @author  Matthew Mills <millsm@csus.edu>
 * @author  Luffah <contact@luffah.xyz>
 */

if(!defined('DOKU_INC')) define('DOKU_INC',realpath(dirname(__FILE__).'/../../').'/');
if(!defined('DOKU_PLUGIN')) define('DOKU_PLUGIN',DOKU_INC.'lib/plugins/');
require_once(DOKU_INC.'inc/auth.php');
require_once(DOKU_PLUGIN.'syntax.php');
class syntax_plugin_simplechat extends DokuWiki_Syntax_Plugin {

    function getType(){ return 'protected'; }
    function getAllowedTypes() { return array('substition','protected','disabled','formatting'); }
    function getSort(){ return 315; }
    function getPType(){ return 'block'; }

    /**
     * Connect lookup pattern to lexer.
     *
     * @param string $mode Parser mode
     */
    public function connectTo($mode) {
        $this->Lexer->addSpecialPattern('~~simplechat~~',$mode,'plugin_simplechat');
    }

    private function chatroomform() {
        global $USERINFO, $ID;
        $scid = bin2hex(random_bytes(8));
        if (isset($USERINFO['name']) || ($this->getConf('showanonymousip') == 1)) {
            $username = $USERINFO['name'];
        } else {
            $username = 'anonymous';
        }
        $result .= "<div id='sc-wrap-".$scid."' class='sc-wrap' data-id='".$scid."' data-user='".$username."' data-room='".$ID."'>";
        $result .= "<label for='sc-activate-".$scid."'>Chat</label>";
        $result .= "<input id='sc-activate-".$scid."'  class='sc-activate' name='sc-activate-".$scid."' type='checkbox'/>";
        $result .= "<div class='sc-chatframe'><div class='sc-chatarea' id='sc-chatarea-".$scid."'></div></div>";
        $result .= "<form class='sc-messagearea'><label for='sc-send-".$scid."'>Message</label><textarea  class='sc-send' id='sc-send-".$scid."' maxlength='250'></textarea></form>";
        $result .= "</div>";
        return $result;
    }

    /**
     * Handle matches of the simplechat syntax
     *
     * @param string $match The match of the syntax
     * @param int    $state The state of the handler
     * @param int    $pos The position in the document
     * @param Doku_Handler    $handler The handler
     * @return array Data for the renderer
     */
    public function handle($match, $state, $pos, Doku_Handler $handler){
        return array();
    }

    /**
     * Render xhtml output or metadata
     *
     * @param string         $mode      Renderer mode (supported modes: xhtml)
     * @param Doku_Renderer  $renderer  The renderer
     * @param array          $data      The data from the handler() function
     * @return bool If rendering was successful.
     */
    public function render($mode, Doku_Renderer $renderer, $data) {
        global $conf, $USERINFO, $ID;

        if($mode != 'xhtml') return false;
        $groups = explode(',', $this->getConf('groups'));
        if (count($groups) > 0) {
            if (count(array_intersect($USERINFO['grps'],  $groups))==0) return true;
        }

        // check to see if chat directory is created
        $dirname = DOKU_INC.'data/chats';
        if( !is_dir( $dirname ) ) {
            @mkdir($dirname, 0755 , true );
        }
        // see if we need to clean up an old chat log
        if( $this->getConf('chatretentiontimer') > 0 ) {
            $room = str_replace(array(' ','.','/',':'),array('','','-','-'),$ID); // need to clean this. remove spaces, remove dots , change slashes to underlines
            $filename = DOKU_INC.'data/chats/log_'.$room.'.txt';
            if( file_exists( $filename ) ) {
                // count lines, see if we are over limit
                $linecount = 0;
                $linemax = $this->getConf('maxloglinecount');
                $overlinecount = false;
                $fh = @fopen( $filename, "r" );
                if( $fh ) {
                    while(!feof($fh)){
                        $line = fgets($fh);
                        if( $linecount++ > $linemax ) {
                            $overlinecount = true;
                            break;
                        }
                    }
                    fclose($fh);
                }
                if( ((time() - filemtime( $filename ) ) > ( $this->getConf('chatretentiontimer') * 60 )) or $overlinecount ) {
                    if( $this->getConf('savelogsflag') == 1 ) {
                        $date = date_create();
                        $newdirname = DOKU_INC.'data/chats/'.$room ;
                        $newfilename = DOKU_INC.'data/chats/'.$room.'/log_'.date("Y-m-d_H:i:s").'.txt';
                        @mkdir( $newdirname );
                        @rename( $filename , $newfilename ); 
                    } else {
                        @unlink( $filename ); // its too old. remove it.
                    }
                }
            }
        }

        $renderer->doc .= $this->chatroomform();
        return true;
    }
}

// vim:ts=4:sw=4:et:
