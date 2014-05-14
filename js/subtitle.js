//External modules
var openSubs = require('opensubtitles-client'); //Max 200 srt download per day :S
var http = require('http');
var zlib = require('zlib');
var path = require('path');
var request = require('request');
var url = require('url');
var fs = require('fs');
var charset = require('jschardet');
var iconv = require('iconv-lite');
var localization = require('../js/localization.js');

var SubManager = function(port)
{
    //Initialization
    //Load the http server
    var manager = {};
    manager.server = http.createServer();
    manager.server.listen(port);

    //Assign variables
    manager.list = [];
    manager.config = {
        size: 30,
        color: '#ffff00'
    }

    //Return the subtitle when a request is sent to the subManager server. Ex: http://127.0.0.1:3550/en.srt
    manager.server.on('request', function(req, res) {
        var u = url.parse(req.url);

        if (u.pathname === '/favicon.ico')
            return res.end();

        var filename = path.basename(u.pathname, '.srt');

        var sub = manager.get(filename);
        if(sub) {
            if(sub.isDownloaded) {
                if(sub.data) {
                    res.end(manager.decode(sub.data, sub.iso639));
                }
            }else {
                sub.download(function (data) {
                    res.end(manager.decode(data, sub.iso639));
                });
            }
        }
    });

    //Search for subtitle with the torrent name
    manager.searchSubtitles = function (value, cb) {
        manager.list = []; //Clear the subtitle list
        openSubs.api.login().done(
            function(token){
                openSubs.api.search(token, 'all', value).done(
                    function(results){
                        for(var i=0; i < results.length; i++)
                        {
                            var result = results[i];
                            if(result.SubFormat === 'srt')
                            {
                                var found = false;
                                for(var a = 0; a < manager.list.length; a++) {
                                    if (manager.list[a].iso639 == result.ISO639) {
                                        found = true;
                                        break;
                                    }
                                }

                                if(!found) {
                                    var subtitle = new Subtitle(result.LanguageName, result.ISO639, result.SubDownloadLink);
                                    manager.list.push(subtitle);
                                }
                            }
                        }

                        console.log(manager.list);
                        openSubs.api.logout(token);
                        cb(true);
                    }
                );
            }
        );

        //If an error occurs show it in the console
        openSubs.api.on('error', function(e){
            console.log(e);
            cb(false);
        });
    }

    manager.hasSubtitles = function() {
        if(manager.list) {
            if(manager.list.length > 0) {
                return true;
            }
        }

        return false;
    }

    //Get the subtitle from the current subManager
    manager.get = function(lang) {
        if(manager.hasSubtitles) {
            for(i = 0; i < manager.list.length; i++) {
                if(manager.list[i].iso639 === lang) {
                    return manager.list[i];
                }
            }
        }
    }

    //Decode a specific subtitle Iconv-lite is fucking awesome
    manager.decode = function(data, iso639) {
        var charsetData = charset.detect(data);
        var detecdedEncoding = charsetData.encoding;
        var targetEncoding = 'utf8';

        //Charset is not detecting the good encoding for certain language like pt-br (WTF I get IBM855 when choosing brazillian :O)
        if(detecdedEncoding == 'IBM855' || detecdedEncoding == 'windows-1250' || detecdedEncoding == 'windows-1251' || detecdedEncoding == 'windows-1252' || detecdedEncoding == 'windows-1254' || detecdedEncoding == 'windows-1255') {
            if(iso639) {
                var lang = localization.languages[iso639];
                if(lang) {
                    detecdedEncoding = lang.encoding[0]; //We take the true real encoding now!
                    console.log(detecdedEncoding);
                }
            }
        }

        //We don't need to convert UTF-8
        if(detecdedEncoding != 'utf-8') {
            data = iconv.encode(iconv.decode(data, detecdedEncoding), targetEncoding);
        }

        return data.toString('utf-8');
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

var Subtitle = function(lang, iso639, subLink)
{
    var sub = {};
    sub.iso639 = iso639;
    sub.languageName = lang;
    sub.downloadLink = subLink;

    sub.isDownloaded = false;
    sub.data;

    //Save subtitle to a file
    sub.save = function(filePath) {
        if(!sub.isDownloaded) {
            sub.download();
        }

        //Save
        var wstream = fs.createWriteStream(filePath);
        sub.data.pipe(wstream);
    }

    //Download & decompress the subtitle
    sub.download = function(cb) {
        //Download
        var req = request.get(subLink);

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

module.exports = SubManager;
