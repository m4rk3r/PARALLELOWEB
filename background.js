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
      if ( xhr.readyState == 4 && port ) {
          port.postMessage( {data:JSON.stringify(xhr.responseText)} );
      }
    }
    xhr.send();
}

var has_listeners = false;
var page;
var previous_tab;
var active = false;
var client_id;
var db  = {};
var clients_for_tabs = {}
var client_id = Math.random().toString(36).substring(2);

chrome.extension.onConnect.addListener(function (port) {
    port.onMessage.addListener( function(msg) {
        if( msg.handshake ){
            db[ client_id ] = port;
            clients_for_tabs[ previous_tab ] = client_id;
            port.postMessage( {init:true,client_id:client_id})
        }else{
            req( msg.url+page, port );
        }
    });
});   


function on_exit(data){
    if(active && previous_tab == data.tabId ){
        try{
            if( clients_for_tabs[ previous_tab ] ) db[ client_id ].postMessage( {kill:true} )
        }catch(err){}
    }
}

function on_load(data){
    if(active && previous_tab == data.tabId && data.frameId == 0 ){
        chrome.tabs.executeScript(previous_tab, {file: "jquery-1.8.2.js" });
        chrome.tabs.executeScript(previous_tab, {file: "paralleloweb.js" });            
    
        var parsed = parseUri(data.url);
        page = '&url='+parsed.host + (parsed.relative.length > 1?parsed.relative:'');
    }
}

function tab_replace(data){
    if( previous_tab == data.replacedTabId) previous_tab = data.tabId;
}

chrome.browserAction.onClicked.addListener(function (tab) { 
    if(!active){
        if(!has_listeners){
            has_listeners=true;
            //chrome.webNavigation.onBeforeNavigate.addListener( on_exit );
            chrome.webNavigation.onCompleted.addListener( on_load );
            chrome.webNavigation.onTabReplaced.addListener( tab_replace );
        }
        
        // activate icon
        chrome.browserAction.setIcon({path: 'iconactive.png'});
        
        chrome.tabs.executeScript(tab.id, {file: "jquery-1.8.2.js" });
        chrome.tabs.executeScript(tab.id, {file: "paralleloweb.js" });
        var parsed = parseUri(tab.url);
        page = '&url='+parsed.host + (parsed.relative.length > 1?parsed.relative:'');
        previous_tab = tab.id;
        active = true;
    }else{
        // turn off
        active = false;
        chrome.browserAction.setIcon({path: 'icon.png'});
        try{
            if( clients_for_tabs[ previous_tab ] ) db[ client_id ].postMessage( {kill:true} )
        }catch(err){}
    }
});


chrome.tabs.onRemoved.addListener(function(tabId){
    if(active && tabId == previous_tab){
        chrome.browserAction.setIcon({path: 'icon.png'});
        clients_for_tabs[ previous_tab ]=false;
        active=false;
    }
});