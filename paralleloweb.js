var mice_bin = new Array();
var client_id = Math.random().toString(36).substring(2);
var living=[];
var available=true;
var pos = new Object();
pos.x = 50;
pos.y = 50
var count = 0;
var kill = false;
var URL = new Object();
URL.base = 'http://duskjacket.com/MMORPP/';
//URL.base = 'http://localhost:8000/MMORPP/';
URL.update = URL.base + 'get-and-update-json/';


var port = chrome.extension.connect({name: "datapipe-"+client_id});  
port.postMessage({handshake:true,client:client_id}); 

function mk_req( _url ){
    available=false;
    port.postMessage({url:_url,client:client_id,handshake:false});   
}

port.onMessage.addListener(function(msg) {
    if( msg.kill ){
        kill = true;
    }else{
        var data = JSON.parse(JSON.parse( msg.data ));
        process_response( data );
        available = true;
    }
});

document.onmousemove = function(e)
{
    pos.x = e.pageX;
    pos.y = e.pageY;
    // do what you want with x and y
};

function process_response( data ){
    living = [];
    var clients = data.clients;

    for(i=0; i < clients.length; i++){
        var key = clients[i][0];
        living.push( key );
        if(key == client_id) continue // ourself
        if(mice_bin.indexOf(key) != -1){
            mice_bin[key].img.css({ 'left': clients[i][1][0], 'top':clients[i][1][1] });
        }else{
            var cursor = $("<img src='"+chrome.extension.getURL('pointer.png')+"' class='mouse-pointer' >");
            cursor.css({'left':clients[i][1][0],'top':clients[i][1][1],'position':'absolute','width': 10,'z-index':30})
            cursor.attr('id',key)
            $('body').append(cursor);

            mice_bin.push(key)
            var obj = new Object();
            obj.img = cursor;
            mice_bin[key] = obj;
        }
    }
}

interval = setInterval(function (){
    if(available){
        mk_req( URL.update+'?client='+client_id+'&pos_x='+pos.x+'&pos_y='+pos.y) 
    }
        
    for(i=0; i < mice_bin.length; i++){
        // cull phantom mice
        if(living.indexOf(mice_bin[i]) == -1){
            $('#'+mice_bin[i]).fadeOut(500);
            mice_bin.splice(i,1)
        }
    }
    if(kill){
      clearInterval(interval);  
    } 
},30)