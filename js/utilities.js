//External modules
var gunzip = require('zlib').createGunzip();
var http = require('http');
var numeral = require('numeral');

var Utilities = function () {

    this.hasInternetConnection = function (callback) {
        http.get("http://www.google.com/", function (res) {
            if (res.statusCode == 200 || res.statusCode == 302 || res.statusCode == 301) {
                callback(true);
            }
        }).on('error', function (e) {
            callback(false);
        });
    }

    //Use this to pop an alert message in the application
    this.showPrompt = function (title, message, type, cb) {
        $ = window.$;
        if($("#promptModal").length) {
            return;
        }

        var buttons;
        switch(type)
        {
            case "question":
                buttons = "<div class='pull-right'><button id='btnPromptNo' class='btn btn-sm btn-default'>No</button> | " +
                    "<button id='btnPromptYes' class='btn btn-sm btn-danger'>Quit</button></div>";
                break;
            case "ok":
                buttons = "<div class='pull-right'><button id='btnPromptNo' class='btn btn-sm btn-default'>Ok</button></div>";
                break;
            default:
                buttons = "";
                break;
        }


        $("#wrapper").append("<div id='promptModal'><div class='modal fade in show color-light-black' style='z-index: 1052;'>" +
                             "<div class='modal-dialog'>" +
                             "<div class='modal-content'>" +
                             "<div class='modal-header'>" +
                             "<span>" + title + "</span>" +
                             "</div>" +
                             "<div class='m-10' style='line-height: 30px;'>" + message + buttons +
                             "<div class='clearfix'></div>" +
                             "</div>" +
                             "</div>" +
                             "</div>" +
                             "</div>" +
                             "<div class='modal-backdrop fade in' style='z-index: 1051;'></div></div>");

        $("body").on("click", "#btnPromptYes", function () {
            $("#promptModal").remove();
            cb(true);
        });

        $("body").on("click", "#btnPromptNo", function () {
            $("#promptModal").remove();
            cb(false);
        });
    }

    this.toBytes = function (num) {
        return numeral(num).format('0.0b').toLowerCase();
    }

    this.getQueryString = function (key) {
        var url = window.location.search.substring(1);
        var querystrings = url.split('&');
        for (var i = 0; i < querystrings.length; i++) {
            var keys = querystrings[i].split('=');
            if(keys[1].indexOf('magnet:?xt') == 0) {
                return keys[1]+"="+keys[2];
            }
            if (keys[0] == key) {
                return keys[1];
            }
        }
    }

}

module.exports = new Utilities();




