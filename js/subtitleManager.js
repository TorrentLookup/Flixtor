var openSubs = require('opensubtitles-client'); //Max 200 srt download per day :S
var http = require('http');
var zlib = require('zlib');
var path = require('path');
var requestManager = require('request');
var url = require('url');
var fs = require('fs');

var subManager = function()
{
    var manager = {};
    manager.server = http.createServer();
    manager.list = [];
    manager.title = "";
    manager.config = {
        size: 30,
        color: '#ffff00'
    }

    //Return the subtitle when a request is sent to the subManager server. Ex: http://127.0.0.1:8000/en.srt
    manager.server.on('request', function(request, response) {
        var u = url.parse(request.url);

        if (u.pathname === '/favicon.ico')
            return response.end();

        var filename = path.basename(u.pathname, '.srt');

        var sub = manager.get(filename);
        if(sub)
        {
            var data = manager.download(sub.SubDownloadLink);
            if(data) {
                data.setEncoding('utf8');
                return data.pipe(response);
            }
        }

        return response.end();
    });


    //Load subtitle into the subManager
    manager.setSubtitles = function(value, cb) {
        var subToken;
        manager.title = value;
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

    //Get the subtitle from the current subManager
    manager.get = function(lang) {
        if(manager.list)
        {
            for(i = 0; i < manager.list.length; i++)
            {
                if(manager.list[i].ISO639 === lang)
                {
                    return manager.list[i];
                }
            }
        }

        return;
    }

    //Download a specific subtitle
    manager.download = function(subLink) {
        if(subLink) {
            return requestManager.get(subLink).pipe(zlib.createGunzip());
        }

        return;
    }

    //Save subtitle in the data folder
    manager.save = function(lang) {
        var sub = manager.get(lang);
        if(sub)
        {
            var path = './data/' + lang + '.srt';
            if (fs.existsSync(path)) {
                //Retrieve subtitle from file
                sub.Data = fs.createReadStream(path);
            }else {
                //Download subtitle & save file
                var data = manager.dowload(sub.SubDownloadLink);
                var wstream = fs.createWriteStream('./data/' + lang + '.srt', {encoding : "UTF-8"});
                data.pipe(wstream);

                if (fs.existsSync(path)) {
                    //Retrieve subtitle from file
                    sub.Data = fs.createReadStream(path);
                }
            }
        }
    }

    //Load saved subtitle config
    manager.loadConfig = function() {
        if (window.localStorage.getItem('subtitleConfig')) {
            manager.config = JSON.parse(window.localStorage.getItem('subtitleConfig'));
        } else {
            window.localStorage.setItem('subtitleConfig', JSON.stringify(manager.config));
        }
    }

    //Reset subtitle config
    manager.resetConfig = function() {
        window.localStorage.removeItem('subtitleConfig');
    }

    //Save subtitle config
    manager.saveConfig = function() {
        window.localStorage.setItem('subtitleConfig', JSON.stringify(manager.config));
    }

    //Add delay to the subtitle of your choice
    manager.addDelay = function(lang, value) {
        var sub = manager.get(lang);
    }

    //Remove delay to the subtitle of your choice
    manager.removeDelay = function(lang, value) {
        var sub = manager.get(lang);
    }

    return manager;
}

module.exports = subManager;
