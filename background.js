// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License

function parseUri (str) {
	var	o   = parseUri.options,
		m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
		uri = {},
		i   = 14;

	while (i--) uri[o.key[i]] = m[i] || "";

	uri[o.q.name] = {};
	uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
		if ($1) uri[o.q.name][$1] = $2;
	});

	return uri;
};

parseUri.options = {
	strictMode: false,
	key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
	q:   {
		name:   "queryKey",
		parser: /(?:^|&)([^&=]*)=?([^&]*)/g
	},
	parser: {
		strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
		loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
	}
};


function req(qstring,port){
    var xhr = new XMLHttpRequest();
    xhr.open("GET", qstring, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
          port.postMessage( {data:JSON.stringify(xhr.responseText),kill:false} );
      }
    }
    xhr.send();
}

var page;
var previous_tab;
var active = false;
var client_id;
var db  = {};
var clients_for_tabs = {}

chrome.extension.onConnect.addListener(function (port) {
    port.onMessage.addListener( function(msg) {
        active=true;
        if( msg.handshake ){
            client_id = msg.client;
            db[ client_id ] = port;
            clients_for_tabs[ previous_tab ] = client_id;
        }else{
            req( msg.url+page, port );
        }
    });
});   



chrome.browserAction.onClicked.addListener(function test(tab) { 
    if(!active){
        chrome.tabs.executeScript(tab.id, {file: "jquery-1.8.2.js"});
        chrome.tabs.executeScript(tab.id, {file: "paralleloweb.js"});
        var parsed = parseUri(tab.url);
        page = '&url='+parsed.host + (parsed.relative.length > 1?parsed.relative:'');
        previous_tab = tab.id;
    }else{
        // kill old interval, start new one!
        try{
            if( clients_for_tabs[ previous_tab ] ) db[ client_id ].postMessage( {kill:true} )
        }catch(err){
            //console.log('error connecting to port');
        }
        page = '&url='+parseUri(tab.url).host;
        previous_tab = tab.id;
        setTimeout(function (){
            chrome.tabs.executeScript(tab.id, {file: "jquery-1.8.2.js"});
            chrome.tabs.executeScript(tab.id, {file: "paralleloweb.js"});  
        },500)
    }
});


chrome.tabs.onRemoved.addListener(function(tabId){
    if(active && tabId == previous_tab){
        clients_for_tabs[ previous_tab ]=false;
        console.log("REMOVING LISTENER");
        active=false;
    }
});