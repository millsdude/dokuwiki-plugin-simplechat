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

    function getAllowedTypes() { return array('substition','protected','disabled','formatting'); }
    function getType(){ return 'protected'; }
    function getPType(){ return 'block'; }
    function getSort(){ return 315; }

    /**
     * Connect lookup pattern to lexer.
     *
     * @param string $mode Parser mode
     */
    public function connectTo($mode) {
        $this->Lexer->addSpecialPattern('~~simplechat~~',$mode,'plugin_simplechat');
        $this->Lexer->addSpecialPattern('\{\{simplechat>[^}]*\}\}',$mode,'plugin_simplechat');
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
        $match = substr($match,13,-2); //strip markup from start and end
        $data = array();
        foreach(explode('|',$match) as $param){
            if (strlen($param) == 0) continue;
            $splitparam = explode('=',$param,2);
            $key = $splitparam[0];
            $val = count($splitparam)==2 ? $splitparam[1]:Null;
            if (is_null($val)) {
                $data[$key] = true;
            } elseif (isset($data[$key])){  // agregate with | for color in order to separate
                $data[$key] .= ','.$val; 
            } else {
                $data[$key] = $val; 
            }
        }
        return $data;
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
            $filename = DOKU_INC.'data/chats/'.$room.'.txt';
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

        $renderer->doc .= $this->chatroomform($data);
        return true;
    }

    private function chatroomform($data) {
        // e.g. {{simplechat>unfolded|fast|id=1|share=color,tune|title=Chat|unmuted|color=user1 red.vlam,user2 blue|tune=329,user1 440,user2 326}}
        global $USERINFO, $ID;
        $scid = bin2hex(random_bytes(8));
        if (isset($USERINFO['name']) || ($this->getConf('showanonymousip') == 1)) {
            $username = $USERINFO['name'];
        } else {
            $username = 'anonymous';
        }
        $fileid = $ID;
        $divid = $scid;
        if (isset($data['id'])) {
            $fileid .= '#'.$data['id'];
            $divid = $data['id'];
        }
        $unmuted = (isset($data['unmuted']) ? 't':'');
        $tune = (isset($data['tune']) ? $data['tune']:'');
        $color = (isset($data['color']) ?  $data['color']:'');
        $fast = (isset($data['fast']) ? 't':'');
        $view_mode = (isset($data['fixed']) ? (($data['fixed'] == 'left') ? '2':'1'):'0');
        if (isset($data['share'])){
            $shareopts = explode(",", $data['share']);
            $sharestyle = in_array('color', $shareopts) ? 't':'';
            $sharetune = in_array('tune', $shareopts) ? 't':'';
        } else {
            $sharestyle = ''; $sharetune = '';
        };
        $title = str_replace("\t"," ",isset($data['title'])?$data['title']:'Chat');

        // live coding maintenance mode
        /* $title = 'Chat not usable currently (dev)';*/

        $unfolded = isset($data['unfolded']);
        $nbusers = 0;
        if (!$unfolded) {
            require_once(dirname(__FILE__).'/db.php');
            $sc_user = strip_tags(trim($username));
            simplechat_db::init($fileid, $sc_user);
            $nbusers = simplechat_db::countUsers();
        }
        $result  = "";
        $result .= "<div ";
        if (!is_null($divid)) $result .= "id='".$divid."' ";
        $result .= "class='sc-wrap' data-sc='";
        $result .= $fileid."\t".$title."\t".($unfolded?'':'1')."\t".$scid."\t".$username."\t".$unmuted."\t".$tune."\t".$sharetune."\t".$color."\t".$sharestyle."\t".strval($nbusers)."\t".$view_mode."\t".$fast;
        $result .= "'></div>";

        return $result;
    }

}

// vim:ts=4:sw=4:et:
