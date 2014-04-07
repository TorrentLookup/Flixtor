var openSubs = require('opensubtitles-client'); //Max 200 srt download per day :S
var http = require('http');
var zlib = require('zlib');
var path = require('path');
var requestManager = require('request');
var url = require('url');

var subManager = function()
{
    var manager = {};
    manager.server = http.createServer();
    manager.list = [];

    manager.server.on('request', function(request, response) {
        var u = url.parse(request.url);

        if (u.pathname === '/favicon.ico')
            return response.end();

        //Check if subtitle exist in the list
        //Download the subtitle
        //Save it in the folder
        //Send the subtitle back in the response
        //Get current subtitles
        var filename = path.basename(u.pathname, '.srt');

        if(manager.list)
        {
            var sub;
            for(i = 0; i < manager.list.length; i++)
            {
                if(manager.list[i].ISO639 === filename)
                {
                    sub = manager.list[i];
                    break;
                }
            }

            if(sub) {
                //res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
                requestManager.get(sub.SubDownloadLink).pipe(zlib.createGunzip()).pipe(response);
                return;
            }
        }

        return response.end();
    });

    manager.setSubtitles = function(value, cb)
    {
        var subToken;
        openSubs.api.login().done(
            function(token){
                subToken = token;
                openSubs.api.search(token, "all", value).done(
                    function(results){
                        for(var i=0; i < results.length; i++)
                        {
                            var sub = results[i];
                            if(sub.SubFormat === "srt")
                            {
                                var found = false;
                                for(var a = 0; a < manager.list.length; a++) {
                                    if (manager.list[a].ISO639 == sub.ISO639) {
                                        found = true;
                                        break;
                                    }
                                }

                                if(!found)
                                {
                                    var langValues = {};
                                    langValues.ISO639 = sub.ISO639;
                                    langValues.Language = sub.LanguageName;
                                    langValues.SubDownloadLink = sub.SubDownloadLink;
                                    manager.list.push(langValues);
                                }
                            }
                        }

                        openSubs.api.logout(token);
                        cb(true);
                    }
                );
            }
        );

        openSubs.api.on("error", function(e){
            cb(false);
        });
    }

    return manager;
}



function Save(link, cb)
{
}

function Get(path)
{
}

//Synchronize subtitle
function AddDelay(value, path)
{
}

function RemoveDelay(value, path)
{
}

module.exports = subManager;
