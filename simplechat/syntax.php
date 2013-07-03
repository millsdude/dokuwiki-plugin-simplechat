<?php
/**
 * DokuWiki Plugin simplechat (Syntax Component)
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 * @author  Matthew Mills <millsm@csus.edu>
 */

// must be run within Dokuwiki
if (!defined('DOKU_INC')) die();

class syntax_plugin_simplechat extends DokuWiki_Syntax_Plugin {
    /**
     * @return string Syntax mode type
     */
    public function getType() {
        return 'substition';
    }
    /**
     * @return string Paragraph type
     */
    public function getPType() {
        return 'block';
    }
    /**
     * @return int Sort order - Low numbers go before high numbers
     */
    public function getSort() {
        return 155;
    }

    /**
     * Connect lookup pattern to lexer.
     *
     * @param string $mode Parser mode
     */
    public function connectTo($mode) {
        $this->Lexer->addSpecialPattern('~~simplechat~~',$mode,'plugin_simplechat');
    }

	private function chatroomform() {
	global $INFO;
		$result  = "";
		$result .= "<div id='sc-wrap'>";
		// $result .= "<h2>Simple Chat</h2>";
		if( isset($INFO['userinfo'] ) || ($this->getConf('showanonymousip') == 1)) {
			$result .= "<input type='hidden' id='sc-username' value='".$INFO['client']."'>";
		} else {
			$result .= "<input type='hidden' id='sc-username' value='anonymous'>";
		}
		$result .= "<input type='hidden' id='sc-roomname' value='".$INFO['id']."'>";
		$result .= "<div id='sc-chatframe'><div id='sc-chatarea'></div></div>";
		$result .= "<form id='sc-messagearea'><textarea id='sc-send' maxlength = '250'></textarea><p>Your message:</p></form>";
		$result .= "</div><br style='clear:both;'>";
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
    public function handle($match, $state, $pos, &$handler){
        $data = array();
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
    public function render($mode, &$renderer, $data) {
	global $INFO;
	global $conf;
	
        if($mode != 'xhtml') return false;
		// check to see if chat directory is created
		$dirname = DOKU_INC.'data/chats';
		if( !is_dir( $dirname ) ) {
			@mkdir($dirname, 0755 , true );
		}
		// see if we need to clean up an old chat log
		if( $this->getConf('chatretentiontimer') > 0 ) {
			$room = str_replace(array(' ','.','/',':'),array('','','-','-'),$INFO['id']); // need to clean this. remove spaces, remove dots , change slashes to underlines
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
