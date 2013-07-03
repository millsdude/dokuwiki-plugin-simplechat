<?php
/**
 * english language file for simplechat plugin
 *
 * @author Matthew Mills <millsm@csus.edu>
 */

// keys need to match the config setting name
$lang['chatretentiontimer'] = 'The number of unattended minutes to allow a room to keep its log. A value of zero will never clear the room log (which will eventually be a bad thing). A value of 0 will also disable the max line count. This retention is checked when someone enters the page with the chat window, not during the ajax chatting.';
$lang['savelogsflag'] = 'When checked the log will be moved into a folder matching the room name and timestamped, instead of deleted.';
$lang['maxloglinecount'] = 'How many lines maximum to allow the log to grow before clearing it. Depending upon the save logs flag it will delete the chat or save it. This check is done when someone enters the page with the chat, not during the ajax chatting.';
$lang['showanonymousip'] = 'When checked anonymous users will be displayed as their IP address, when unchecked they are named anonymous.';
//Setup VIM: ex: et ts=4 :
