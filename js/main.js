//Modules
var numeral = require('numeral');
var address = require('network-address');
var http = require('http');
var fs = require('fs');
var gunzip = require('zlib').createGunzip();
var peerflix = require('peerflix');
var request = require('request');
var gui = window.require('nw.gui');
var win = gui.Window.get();
var request = require('request'), zlib = require('zlib');
var $ = window.$;
var zlib = require('zlib');
var openSubs = require('opensubtitles-client');
var path = require('path');

//Google analytics tracking
var NA = require("nodealytics");
NA.initialize('UA-42435534-2', 'www.flixtor.com', function () {});
NA.trackPage('Torrents', '/fixtorapp/open/', function (err, resp) {}); //Track when user is opening the application

//Motherfucking awesome engine
var engine;
var serverFlag, engineFrame;

//External functions
var playTorrent = function (infoHash, currentFrame) {
    var torrent;

    serverFlag = false;
    engineFrame = currentFrame;

    var randPort = Math.floor(Math.random() * 65535) + 49152; //Choose port between 49152 and 65535
    $('#popup').load("loader.html");
    requestWithEncoding("http://torrage.com/torrent/" + infoHash + ".torrent", function (err, data) {
        torrent = data;

        if (engine) {
            if (!engine.swarm._destroyed) {
                console.log("The engine is already starded!");
                return;
            }
        }

        engine = peerflix(torrent, {
            path: './data',
            connections: 100,
            port: randPort,
            dht: false,
            tracker: true
        });

        //Check for subtitles while buffering the torrent. OpenSubtitles search is fucking slow!!
        var subToken;
        openSubs.api.login().done(
            function(token){
                subToken = token;
                console.log(engine.torrent.name);
                openSubs.api.search(token, "all", engine.torrent.name).done(
                    function(results){
                        console.log("Found: " + results.length);
                        var langFound = [];
                        for(var i=0; i < results.length; i++)
                        {
                            var sub = results[i];
                            console.log(sub);
                            if(sub.SubFormat === "srt")
                            {
                                var found = false;
                                for(var a = 0; a < langFound.length; a++) {
                                    if (langFound[a].ISO639 == sub.ISO639) {
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
                                    langFound.push(langValues);
                                }
                            }
                        }

                        engine.langFound = langFound;
                        openSubs.api.logout(token);
                    }
                );
            }
        );

        openSubs.api.on("error", function(e){
            console.log(e);
            engine.skipSubtitles = true;
        });

        var hotswaps = 0;
        engine.on('hotswap', function () {
            hotswaps++;
        });

        var started = Date.now();
        var wires = engine.swarm.wires;
        var swarm = engine.swarm;

        var active = function (wire) {
            return !wire.peerChoking;
        };

        engine.on('uninterested', function () {
            engine.swarm.pause();
            console.log('paused');
        });

        engine.on('interested', function () {
            engine.swarm.resume();
            console.log('resumed');
        });

        engine.server.on('listening', function () {
            if (!engine.server.address())
                return;

            if (serverFlag)
                return;

            var port = engine.server.address().port;
            console.log(port);
            var href = 'http://' + address() + ':' + port + '/';
            //var filename = engine.server.index.name.split('/').pop().replace(/\{|\}/g, '');
            console.log('server is listening on ' + href);

            var statsLog = function () {
                var unchoked = engine.swarm.wires.filter(active);
                var runtime = Math.floor((Date.now() - started) / 1000);
                var peerslisted = 0;

                wires.every(function (wire) {

                });

                console.log(bytes(swarm.downloaded) + " - " + runtime + " - " + swarm.queued);

                if (!swarm._destroyed) {
                    setTimeout(statsLog, 500);
                }
            };

            statsLog();

            var minimum = 5242880; //1.5mb
            engine.skipSubtitles = false;
            var isVideoReady = function () {
                if (swarm.downloaded > minimum && port == 8888) {
                    console.log("Ready!");
                    $("#bufferProgressBar").addClass("hide");

                    if(!engine.langFound)
                    {
                        $("#btnSubtitleSkip").removeClass("hide");
                        console.log("Loading subtitles...");
                        $("#bufferModalStatus").html("Loading subtitles...");
                    }

                    //check if subtitles are found
                    var checkSubtitles = function ()
                    {
                        if(engine.langFound || engine.skipSubtitles)
                        {
                            if(!engine.skipSubtitles) {
                                $("#btnSubtitleSkip").addClass("hide");
                                $("#bufferModalStatus").html(engine.langFound.length + " subtitles found.");
                            }

                            setTimeout(function () {window.location = "player.html"; }, 2000);
                        }else {
                            setTimeout(checkSubtitles, 250);
                        }
                    }
                    checkSubtitles();

                } else {
                    console.log("Not ready yet!");
                    if (swarm.downloaded != 0) {
                        updateLoader(swarm.downloaded, minimum, swarm.downloadSpeed());
                    } else {
                        if (Math.floor((Date.now() - started) / 1000) >= 20 && swarm.queued == 0) {
                            /*TO BE IMPLEMENTED: RETRY BUTTON*/
                        }
                        $("#bufferModalStatus").html("Finding peers [" + swarm.queued + "]");
                    }

                    if (!swarm._destroyed) {
                        setTimeout(isVideoReady, 500);
                    }
                }
            };

            isVideoReady();
        });

        engine.server.once('error', function () {
            engine.server.listen(0);
            console.log('server error...');
        });

        engine.server.listen(8888);
    })
}

var reloadInstance = function () {
    $ = window.$;
}

var stopDownload = function () {
    if (engine) {
        serverFlag = true;

        setTimeout(function () {
            //engine.myass.destroy();
            engine.destroy();
            engine.server.listen(0);
            engine.server.close();

            if (window.location == "app://host/frames/player.html") {
                window.location = engineFrame + ".html";
            }

            console.log("Download has stopped!");
        }, 500);
    }
}

var stopPlayer = function () {
    stopDownload();
    changeFrame('movies');
}

var closeApp = function () {
    stopDownload();
    gui.App.closeAllWindows();
}

var getEngine = function() {
    return engine;
}

var bytes = function (num) {
    return numeral(num).format('0.0b').toLowerCase();
};

var updateLoader = function (downloaded, total, downloadSpeed) {
    var status = (downloaded * 100) / total;
    $("#bufferModalStatus").text("Buffering");
    $("#bufferProgressBar").removeClass("hide");
    setProgress(status, downloadSpeed);
}

var setProgress = function (status, downloadSpeed)
{
    $(".progress-bar").css("width", Math.round(status) + "%");
    $("#progress-bar-count").text(Math.round(status) + "%");
    $("#progress-bar-status").text(bytes(downloadSpeed));
}

//Inject html frame into index.html and change the sidebar menu
var changeFrame = function (frameName) {
    window.location = frameName + ".html";
}

//Use this to pop an alert message over the application
var showMessage = function (title, html) {
    $('#popup').html("<div id='messageModalWrapper'>" +
                     "<div id='messageModal' class='modal fade in show'>" +
                     "<div class='modal-dialog'>" +
                     "<div class='modal-content'>" +
                     "<div class='modal-header'>" +
                     "<button type='button' class='close' onclick='$(\"#messageModalWrapper\").remove();'>" +
                     "<span class='glyphicon glyphicon-remove'></span>" +
                     "</button>" +
                     "<span>" + title + "</span>" +
                     "</div>" +
                     "<div class='m-10'>" + html +
                     "</div>" +
                     "<div class='clearfix'></div>" +
                     "</div>" +
                     "</div>" +
                     "</div>" +
                     "<div class='modal-backdrop fade in'></div>" +
                     "</div>");
}

//Disable file drap over
window.addEventListener("dragover", function (e) {
    e = e || event;
    e.preventDefault();
}, false);

//Disable file drop over the application
window.addEventListener("drop", function (e) {
    e = e || event;
    e.preventDefault();
}, false);

//Disable file drap
window.addEventListener("dragstart", function (e) {
    e = e || event;
    e.preventDefault();
}, false);

win.on("loaded", function (e) {
    //Check for internet connection on startup
    checkInternetConnection(function (hasInternetAccess) {
        if (!hasInternetAccess) {
            showMessage("No internet access", "<span>You don't have access to internet, please check your connection and try again.</span>");
        }
    });
});

var checkInternetConnection = function (callback) {
    http.get("http://www.google.com/", function (res) {
        if (res.statusCode == 200 || res.statusCode == 302 || res.statusCode == 301) {
            callback(true);
        }
    }).on('error', function (e) {
        callback(false);
    });
};

function toggleFullScreen() {
    if (win.isFullscreen) {
        win.leaveFullscreen();
    } else {
        win.enterFullscreen();
    }
    win.focus();
}

function minimize() {
    win.minimize();
}

//Focus the app on startup
win.focus();

//Exports
module.exports.checkInternetConnection = checkInternetConnection;
module.exports.minimize = minimize;
module.exports.toggleFullScreen = toggleFullScreen;
module.exports.showMessage = showMessage;
module.exports.stopDownload = stopDownload;
module.exports.stopPlayer = stopPlayer;
module.exports.closeApp = closeApp;
module.exports.playTorrent = playTorrent;
module.exports.changeFrame = changeFrame;
module.exports.reloadInstance = reloadInstance;
module.exports.$ = $;
module.exports.NA = NA;
module.exports.getEngine = getEngine;
module.exports.bytes = bytes;

//Internal functions
var headers = {
    "accept-charset": "ISO-8859-1,utf-8;q=0.7,*;q=0.3",
    "accept-language": "en-US,en;q=0.8",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.13+ (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2",
    "accept-encoding": "gzip,deflate",
};

var requestWithEncoding = function (url, callback) {
    var req = request.get(url);

    req.on('response', function (res) {
        var chunks = [];
        res.on('data', function (chunk) {
            chunks.push(chunk);
        });

        res.on('end', function () {
            var buffer = Buffer.concat(chunks);
            var encoding = res.headers['content-encoding'];
            if (encoding == 'gzip') {
                zlib.gunzip(buffer, function (err, decoded) {
                    callback(err, decoded);
                });
            } else if (encoding == 'deflate') {
                zlib.inflate(buffer, function (err, decoded) {
                    callback(err, decoded);
                })
            } else {
                callback(null, buffer);
            }
        });
    });

    req.on('error', function (err) {
        callback(err);
    });
}
process.on('uncaughtException', function (err) {
    console.error('An uncaughtException was found, the program will end.');

    //Logging with google analytics
    //If internet connection is available we log the error
    checkInternetConnection(function (hasInternetAccess) {
        if (hasInternetAccess) {
            NA.trackEvent('FlixtorApp', 'Error Occured', err.message + " -> " + err.stack, function (err, resp) {});
            showMessage('Error', 'An uncaughtException was found and an error report has been sent to improve future versions of Flixtor.<br> The program will end.');
        }
    });

    //Close the application within 6 sec
    setTimeout(function () {
        process.exit(1);
    }, 6000);
});
