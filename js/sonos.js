jQuery.noConflict();

var _sonosIP = "192.168.1.105";
var _sonosID = "RINCON_000E5828B42A01400";
var _sonosName = "Office";

// Global variables that don't need to be customized to the environment.
var _soapRequestTemplate = '<?xml version="1.0" encoding="utf-8"?><s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>{0}</s:Body></s:Envelope>';
var _port = ':1400';
var _currentArtist = "";
var _currentComposer = "";
var _currentAlbum = "";
var _selectedZone = 0;  // zone serving up media
var _refreshRate = 15000; // milliseconds
var _autoSetToMaster = true;
var _trackChange = true;
var RequestType = { "metadata": 0, "transport": 1, "playlists": 2, "oneplaylist": 3 };


/*
    // Once the DOM is loaded then we can work with HTML elements.
    jQuery(document).ready(function () {
        var zoneName = _sonosName;
        refreshCurrentlyPlaying();
        setInterval(refreshCurrentlyPlaying, _refreshRate);
        jQuery("#addthisdiv").click(function () {
        });
    });
*/

// Refresh metadata.
function refreshCurrentlyPlaying() {
    // Set some globals to default.
    _currentAlbum = _currentArtist = _currentComposer = "";

    if (_trackChange) {
        jQuery.each(jQuery('div[id$=Metadata]'), function (i, item) {
            item.className = "ElementHidden";
        });
    }

    var url, xml, soapBody, soapAction;
    var host = _sonosIP + _port; 
    url = '/MediaRenderer/AVTransport/Control';
    soapAction = 'urn:schemas-upnp-org:service:AVTransport:1#GetPositionInfo';
    soapBody = '<u:GetPositionInfo xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>0</InstanceID><Channel>Master</Channel></u:GetPositionInfo>';
    xml = _soapRequestTemplate.replace('{0}', soapBody);
    sendSoapRequest(url, host, xml, soapAction, RequestType.metadata);
}

// Main Ajax request function. uPnP requests go through here.
// Here we use jQuery Ajax method because it does cross-domain without hassle.
function sendSoapRequest(url, host, xml, soapAction, requestType) {
    url = 'http://' + host + url;

    jQuery.ajax({
        url: url,
        type: "POST",
        async: true,
        beforeSend: function (xhr) {
            xhr.setRequestHeader("SOAPAction", soapAction);
        },
        data: xml,
        success: function (data, status, xhr) {
            if (requestType == RequestType.metadata) {
                processSuccessfulAjaxRequestNodes_Metadata(jQuery(data).find("*"), host);
            }
        },
        complete: function (xhr, status) {
            var response = status || "no response text";
        },
        ajaxError: function (data) {
            var response = data || "no response text";
        },
        error: function (xhr, status, err) {  }
    });
}


    function processSuccessfulAjaxRequestNodes_Metadata(responseNodes, host) {
    for (var i = 0; i < responseNodes.length; i++) {
        var currNodeName = responseNodes[i].nodeName;
        if (currNodeName == "TrackURI") {
            var result = responseNodes[i].firstChild.nodeValue;
            if (result.indexOf("x-rincon") > -1) {
                var master = result.split(":")[1];
                var indx = _selectedZone;
                
                if (!_autoSetToMaster) {
                    jQuery('#coordinatorName')[0].innerHTML = "slaved to " + _sonosName;
                    jQuery('#CoordinatorMetadata')[0].className = "ElementVisible";
                }
                else {
                    refreshCurrentlyPlaying();
                }
            }
            else {
                _masterFound = true;
            }
        }
        if (currNodeName == "TrackMetaData") {
            var responseNodes2 = jQuery(responseNodes[i].firstChild.nodeValue).find("*");
            var isStreaming = false;
            for (var j = 0; j < responseNodes2.length; j++) {
                switch (responseNodes2[j].nodeName) {
                    case "DC:CREATOR":
                        _currentComposer = XMLEscape.unescape(responseNodes2[j].firstChild.nodeValue);
                        if (_currentComposer !== jQuery('#composerName')[0].innerHTML) {
                            jQuery('#composerName')[0].innerHTML = _currentComposer;
                        }
                        jQuery('#ComposerMetadata')[0].className = "ElementVisible";
                        break;
                    case "albumArtist":
                        _currentArtist = XMLEscape.unescape(responseNodes2[j].firstChild.nodeValue);
                        if (_currentArtist !== jQuery('#artistName')[0].innerHTML) {
                            jQuery('#artistName')[0].innerHTML = _currentArtist;
                        }
                        jQuery('#ArtistMetadata')[0].className = "ElementVisible";
                        break;
                    case "DC:TITLE":
                        if (!isStreaming) {
                            _currentTrack = XMLEscape.unescape(responseNodes2[j].firstChild.nodeValue);
                            if (_currentTrack !== jQuery('#trackName')[0].innerHTML) {
                                jQuery('#trackName')[0].innerHTML = XMLEscape.unescape(responseNodes2[j].firstChild.nodeValue);
                                _trackChange = true;
                            }
                            else {
                                _trackChange = false;
                            }
                            jQuery('#TrackMetadata')[0].className = "ElementVisible";
                        }
                        break;

                    case "streamContent":
                        if (responseNodes2[j].attributes.getNamedItem('protocolInfo') !== null) {
                            _currentTrack = responseNodes2[j].attributes.getNamedItem('protocolInfo').value;
                            if (_currentTrack.length > 1) {
                                if (_currentTrack !== jQuery('#trackName')[0].innerHTML) {
                                    jQuery('#trackName')[0].innerHTML = XMLEscape.unescape(responseNodes2[j].firstChild.nodeValue);
                                    _trackChange = true;
                                }
                                else {
                                    _trackChange = false;
                                }
                                jQuery('#TrackMetadata')[0].className = "ElementVisible";
                                isStreaming = true;
                            }
                        }
                        break;

                    case "UPNP:ALBUM":
                        _currentAlbum = XMLEscape.unescape(responseNodes2[j].firstChild.nodeValue);
                        if (_currentAlbum !== jQuery('#albumName')[0].innerHTML) {
                            jQuery('#albumName')[0].innerHTML = _currentAlbum;
                            jQuery('#albumArt')[0].alt = _currentAlbum;
                        }
                        jQuery('#AlbumMetadata')[0].className = "ElementVisible";
                        break;
                    case "res":
                        var protocolInfo = responseNodes2[j].attributes.getNamedItem('protocolInfo').value;
                        if (protocolInfo !== undefined) {
                            for (var k = 0; k < _providers.length; k++) {
                                if (protocolInfo.toLowerCase().indexOf(_providers[k].keyword) > -1) {
                                    jQuery('#sourceName')[0].innerHTML = _providers[k].name;
                                    jQuery('#SourceMetadata')[0].className = "ElementVisible";
                                }
                            }
                        }
                        break;
                    case "UPNP:ALBUMARTURI":
                        var newPath = XMLEscape.unescape(responseNodes2[j].firstChild.nodeValue);
                        newPath = (newPath.indexOf("http:") > -1) ? newPath : "http://" + host + newPath;
                        var currPath = jQuery('#albumArt')[0].src;
                        if (newPath !== currPath) {
                            jQuery('#albumArt')[0].src = newPath;
                        }
                        break;

                }
            }
        }
    }
}


//
// Utility
//

var XMLEscape = {
    escape: function (string) {
        return this.xmlEscape(string);
    },
    unescape: function (string) {
        return this.xmlUnescape(string);
    },
    xmlEscape: function (string) {
        string = string.replace(/&/g, "&amp;");
        string = string.replace(/"/g, "&quot;");
        string = string.replace(/'/g, "&apos;");
        string = string.replace(/</g, "&lt;");
        string = string.replace(/>/g, "&gt;");
        return string;
    },
    xmlUnescape: function (string) {
        string = string.replace(/&amp;/g, "&");
        string = string.replace(/&quot;/g, "\"");
        string = string.replace(/&apos;/g, "'");
        string = string.replace(/&lt;/g, "<");
        string = string.replace(/&gt;/g, ">");
        return string;
    }
};

    
