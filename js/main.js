//External modules
var address = require('network-address');
var http = require('http');
var fs = require('fs');
var peerflix = require('peerflix');
var request = require('request');
var gui = window.require('nw.gui');
var win = gui.Window.get();
var requestManager = require('request');
var path = require('path');
var NA = require('nodealytics');
var os = require('os');

//Internal modules
var subtitle = require('../js/subtitle.js');
var utilities = require('../js/utilities.js');
var localization = require('../js/localization.js');

//Global variables
var engine, subManager, enginePort, subPort;

//NA.initialize('UA-42435534-2', 'www.flixtor.com', function () {});
NA.trackPage('Torrents', '/fixtorapp/open/', function (err, resp) {}); //Track when user is opening the application

var playTorrent = function (infoHash) {
    var torrent;
    enginePort = 3549 //popcorn-time use 8888 so let's change it to 3549 which means [flix] in telephone numbers :P
    subPort = 3550

    var randPort = Math.floor(Math.random() * (65535 - 49152 + 1)) + 49152; //Choose port between 49152 and 65535

    if (engine) {
        if (!engine.swarm._destroyed) {
            console.log("The engine is already starded!");
            return;
        }
    }

    engine = peerflix( "magnet:?xt=urn:btih:" + infoHash, {
        connections: os.cpus().length > 1 ? 100 : 30,
        path: './data',
        port: enginePort
    });

    var started = Date.now();
    var wires = engine.swarm.wires;
    var swarm = engine.swarm;

    engine.on('ready', function() {
        console.log(engine.torrent);
        console.log(engine.tracker);

        subManager = subtitle(subPort);
        subManager.searchSubtitles(engine.torrent.name, function (success) {
            if(!success) {
                engine.skipSubtitles = true;
            }

            engine.langFound = success;
        });
    });

    engine.server.on('listening', function () {
        if (!engine.server.address())
            return;

        var port = engine.server.address().port;
        console.log(port);

        var href = 'http://' + address() + ':' + port + '/';
        console.log('Server is listening on ' + href);
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

    //engine.server.listen(enginePort);
}

var rmDir = function(dirPath) {
    try { var files = fs.readdirSync(dirPath); }
    catch(e) { return; }
    if (files.length > 0) {
        for (var i = 0; i < files.length; i++) {
            var filePath = dirPath + '/' + files[i];
            if (fs.statSync(filePath).isFile())
                fs.unlinkSync(filePath);
        }
    }
};

var stopDownload = function () {
    if (engine) {
        try {
            engine.destroy();
            engine.server.listen(0);
            engine.server.close();

            if(subManager) {
                subManager.server.close();
            }
        }
        catch (e)
        {
            console.log(e);
        }

        console.log("Download has stopped!");
        rmDir("./data");
        console.log("Data has been deleted!");

        return true;
    }

    return false;
}

var stopPlayer = function (backCount) {
    stopDownload();
    window.history.go(-backCount);
}

var closeApp = function () {
    stopDownload();
    var $ = window.$;

    //Disable prompt if VLC because VLC is always in front of every element.
    if($("#VLC").length) {
        gui.App.closeAllWindows();
        return;
    }

    //Ask the user if he really want to close the app
    utilities.showPrompt("Confirm close","You are about to close the application. Are you sure you want to continue?", "question", function (answer) {
        if(answer) {
            gui.App.closeAllWindows();
        }
    });
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

function goBack() {
    if(engine) {
        stopDownload();
    }

    if(window.sessionStorage.history) {
        var  historyList = JSON.parse(window.sessionStorage.history);

        if(historyList.length > 0) {

            window.location = historyList[(historyList.length - 1)];
            var index = historyList.indexOf(historyList.length - 1);
            historyList.splice(index, 1);
            window.sessionStorage.history = JSON.stringify(historyList);
        }
    }
}

//url must be absolute
function go(url) {
    window.location = url;
    saveHistory(url);
}

function changeFrame (frame) {
    var url = frame + ".html";
    window.location = url;
    saveHistory(url);
}

function saveHistory(url)
{
    var url = window.location.href;
    if(window.location.href == path)
        return;

    var historyList = [];
    if(window.sessionStorage.history) {
        historyList = JSON.parse(window.sessionStorage.history);

        //check for back duplicate
        if(historyList.length > 0) {
            if(historyList[(historyList.length - 1)] == url) {
                return;
            }
        }
    }

    historyList.push(url);
    window.sessionStorage.history = JSON.stringify(historyList);
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
            utilities.showPrompt("No internet access", "You don't have access to internet, please check your connection and try again.", "ok", function(answer) {
                gui.App.closeAllWindows();
            });
        }
    });

    //$(".top-titlebar-back-button").removeClass("hide");
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
module.exports.NA = NA;
module.exports.getEngine = getEngine;
module.exports.getSubManager = getSubManager;
module.exports.goBack = goBack;
module.exports.go = go;

process.on('uncaughtException', function (err) {
    //Logging with google analytics
    //If internet connection is available we log the error
    utilities.hasInternetConnection(function (hasInternet) {
        if (hasInternet) {
            NA.trackEvent('FlixtorApp', 'Error Occured', err.message + " -> " + err.stack, function (err, resp) {});
        }
    });

    utilities.showPrompt("An uncaughtException was found", "Error: <span class='text-danger'>" + err.message.toString() + "</span><br/>The program will end.", "ok", function(answer) {
        process.exit(1);
    });
});
