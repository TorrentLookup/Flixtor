//External modules
var address = require('network-address');
var http = require('http');
var fs = require('fs');
var peerflix = require('peerflix');
var request = require('request');
var gui = window.require('nw.gui');
var win = gui.Window.get();
var requestManager = require('request');
var $ = window.$;
var path = require('path');
var NA = require('nodealytics');

//Internal modules
var subtitle = require('../js/subtitle.js');
var utilities = require('../js/utilities.js');
var localization = require('../js/localization.js');

//Global variables
var engine, subManager, enginePort, subPort;
var serverFlag;

//NA.initialize('UA-42435534-2', 'www.flixtor.com', function () {});
NA.trackPage('Torrents', '/fixtorapp/open/', function (err, resp) {}); //Track when user is opening the application

var playTorrent = function (infoHash) {
    var torrent;
    serverFlag = false;
    enginePort = 3549 //popcorn-time use 8888 so let's change it to 3549 which means [flix] in telephone numbers :P
    subPort = 3550

    var randPort = Math.floor(Math.random() * (65535 - 49152 + 1)) + 49152; //Choose port between 49152 and 65535
    $('#popup').load("loader.html");

    if (engine) {
        if (!engine.swarm._destroyed) {
            console.log("The engine is already starded!");
            return;
        }
    }

    engine = peerflix( "magnet:?xt=urn:btih:" + infoHash, {
        path: './data',
        connections: 100,
        port: randPort,
        dht: true,
        tracker: true
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

    engine.on('ready', function() {
        console.log(engine.torrent);
        console.log(engine.tracker);

        subManager = subtitle(subPort);
        subManager.searchSubtitles(engine.torrent.name, function (success) {
            if(!success)
                engine.skipSubtitles = true;

            engine.langFound = success;
        });
    });

    var statsLog = function () {
        var runtime = Math.floor((Date.now() - started) / 1000);

        console.log(utilities.toBytes(swarm.downloaded) + " - " + runtime + " - " + swarm.queued);

        if (!swarm._destroyed) {
            setTimeout(statsLog, 500);
        }
    };

    statsLog();

    engine.server.once('error', function (err) {
        engine.server.listen(0);
        console.log(err);
    });

    engine.server.listen(enginePort);
}

var rmDir = function(dirPath) {
    try { var files = fs.readdirSync(dirPath); }
    catch(e) { return; }
    if (files.length > 0)
        for (var i = 0; i < files.length; i++) {
            var filePath = dirPath + '/' + files[i];
            if (fs.statSync(filePath).isFile())
                fs.unlinkSync(filePath);
        }
};

var reloadInstance = function () {
    $ = window.$;
}

var stopDownload = function () {
    if (engine) {
        serverFlag = true;

        setTimeout(function () {
            //engine.myass.destroy();

            try {
                engine.destroy();
                engine.server.listen(0);
                engine.server.close();

                if(subManager)
                    subManager.server.close();
            }catch (e)
            {
                console.log(e);
            }

            rmDir("./data");
            console.log("Download has stopped!");
        }, 500);
    }
}

var stopPlayer = function (backCount) {
    stopDownload();
    window.history.go(-backCount);
}

var closeApp = function () {
    stopDownload();
    gui.App.closeAllWindows();
}

var getEngine = function() {
    return engine;
}

var getSubManager = function () {
    return subManager;
}

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
    $("#progress-bar-status").text(utilities.toBytes(downloadSpeed));
}

//Inject html frame into index.html and change the sidebar menu
var changeFrame = function (frame) {
    window.location = frame + ".html";
}

//Disable file drop over
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
    utilities.hasInternetConnection(function (hasInternet) {
        if (!hasInternet) {
            utilities.showMsg("No internet access", "<span>You don't have access to internet, please check your connection and try again.</span>");
        }
    });
});

var getPlatform = function() {
    return process.platform;
}

//Force the app to focus on startup
win.focus();

//Exports
module.exports.minimize = minimize;
module.exports.toggleFullScreen = toggleFullScreen;
module.exports.stopDownload = stopDownload;
module.exports.stopPlayer = stopPlayer;
module.exports.closeApp = closeApp;
module.exports.playTorrent = playTorrent;
module.exports.changeFrame = changeFrame;
module.exports.reloadInstance = reloadInstance;
module.exports.$ = $;
module.exports.NA = NA;
module.exports.getEngine = getEngine;
module.exports.getSubManager = getSubManager;

/*
process.on('uncaughtException', function (err) {
    console.error('An uncaughtException was found, the program will end.');

    //Logging with google analytics
    //If internet connection is available we log the error
    utilities.checkInternetConnection(function (hasInternet) {
        if (hasInternet) {
            NA.trackEvent('FlixtorApp', 'Error Occured', err.message + " -> " + err.stack, function (err, resp) {});
            utilities.showMsg('Error', 'An uncaughtException was found and an error report has been sent to improve future versions of Flixtor.<br> The program will end.');
        }
    });

    //Close the application within 6 sec
    setTimeout(function () {
        process.exit(1);
    }, 6000);
});
*/
