constants
===============
MAX_SYNC_STRING_SIZE
MAX_NUMBER_SPLITS

local variables
===============
drawerOpen
localStorage
defaultBlockPatterns
blockList
playlistList
savedQueueName

keys and prefixes
===============
bankPrefix
trackListPrefix
playlistPrefix
splitListContinuePrefix
currentCassetteKey
cassettePagePrefix
repeatKey
syncKey
volumeKey
blockKey
lastSyncWarningKey

* Subsystems *
==============
FileSystem
Memory
PlaylistList

Methods
============

// This method initializes all keys and subsystems,
// it also unpacks the playlistList and browseList from memory,
// lastly, it defines the current browseList and binds our change listener
init

// Blocklist management functions
getBlockList
saveBlockList

// Volume management
saveVolume
getVolume

// Current Cassette management
getCurrentCassette
saveCurrentCassette
saveCassettePage


// single bit data managment functions
setDrawerOpened
getDrawerOpened
toggleRepeat
getRepeat
toggleSync
getSync
isSyncOn

// delegated to Memory, seaches through the Memory.trackLists for a track with
// the desired tdID
// TODO confirm how the same track is shared between queue and browseList
getTrack

// Nukes playlistList, localStorage, and Filesytem
// TODO confirm how this should interact with Memory
clear

// searches for all keys that match the param regex
findKeys

// playlist management functions, really just adds to playlistList which
// handles the saving, etc.
savePlaylist
removePlaylist

// populate PlaylistList = basically PlaylistList.init
preparePlaylistList

// remove the playlist
// TODO this function is a mess, and doesn't do anything in non-sync case
clearList

/* The only trackList saved is the Queue, this is a Playlist?
 * TrackList < SavedTrackList < PlayList?
 * Playlists are tracklists that are:
 *  modified in localStorage on changes
 *  dirtied on changes
 *  Added to the playlistlist?
 *  temp properties are stripped?
 */

// get and rebuild tracklists, queue is a special case
getSavedTrackList
recoverSavedTrackList
getQueue

// The browseList is only memoized by the Bank, it will be created and events attached here as well
savedBrowseListName
saveCurrentBrowseList
getCurrentBrowseList



checkQuota
storageChangeListener