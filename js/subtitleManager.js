var openSubs = require('opensubtitles-client'); //Max 200 srt download per day :S
var http = require('http');
var zlib = require('zlib');
var pathManager = require('path');
var requestManager = require('request');
var url = require('url');
var fs = require('fs');
var charset = require('jschardet');
var iconv = require('iconv-lite');
var main = require('../js/main.js');
var localization = require('../js/localization.js');

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

        var filename = pathManager.basename(u.pathname, '.srt');

        var sub = manager.get(filename);
        if(sub.isDownloaded) {
            if(sub.data) {
                response.end(manager.decode(sub.data, sub.ISO639));
            }
        }else {
            sub.download(function (data) {
                response.end(manager.decode(data, sub.ISO639));
            });
        }
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
                            var result = results[i];
                            if(result.SubFormat === "srt")
                            {
                                var found = false;
                                for(var a = 0; a < manager.list.length; a++) {
                                    if (manager.list[a].ISO639 == result.ISO639) {
                                        found = true;
                                        break;
                                    }
                                }

                                if(!found) {
                                    var subtitle = new sub(result.LanguageName, result.ISO639, result.SubDownloadLink);
                                    manager.list.push(subtitle);
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
    manager.decode = function(data, ISO639) {
        console.log(ISO639);
        var charsetData = charset.detect(data);
        var detecdedEncoding = charsetData.encoding;
        var targetEncoding = "utf8";
        console.log(detecdedEncoding);
        //Iconv-lite is not detecting the good encoding for certain language like pt-br (WTF I get IBM855 when choosing brazillian :O)
        if(detecdedEncoding == "IBM855" || detecdedEncoding == "windows-1250" || detecdedEncoding == "windows-1251" || detecdedEncoding == "windows-1252" || detecdedEncoding == "windows-1254" || detecdedEncoding == "windows-1255") {
            if(ISO639) {
                var lang = localization().languages[ISO639];
                if(lang) {
                    detecdedEncoding = lang.encoding[0]; //We take the true real encoding now!
                    console.log(detecdedEncoding);
                }
            }
        }

        //We don't need to convert UTF-8
        if(detecdedEncoding != "utf-8") {
            data = iconv.encode(iconv.decode(data, detecdedEncoding), targetEncoding);
        }

        return data.toString("utf-8");
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

    return manager;
}

var sub = function(lang, iso, subLink)
{
    var sub = {};
    sub.ISO639 = iso;
    sub.languageName = lang;
    sub.downloadLink = subLink;

    sub.isDownloaded = false;
    sub.data;

    //Save subtitle to a file
    sub.save = function(path) {
        if(!sub.isDownloaded) {
            sub.download();
        }

        //Save
        var wstream = fs.createWriteStream(path);
        sub.data.pipe(wstream);
    }

    //Download & decompress the subtitle
    sub.download = function(cb) {
        //Download
        var req = requestManager.get(subLink);

        req.on('response', function (res) {
            var chunks = [];
            res.on('data', function (chunk) {
                chunks.push(chunk);
            });

            res.on('end', function () {
                var buffer = Buffer.concat(chunks);

                //Decompress
                zlib.gunzip(buffer, function (err, decoded) {
                    sub.data = decoded;
                    sub.isDownloaded = true;
                    cb(decoded);
                });
            });
        });

        req.on('error', function (err) {
            console.log(err);
        });
    }

    //Add delay to the subtitle of your choice TODO!!
    sub.addDelay = function(value) {

    }

    //Remove delay to the subtitle of your choice TODO!!
    sub.removeDelay = function(value) {

    }

    return sub;
}

module.exports = subManager;
