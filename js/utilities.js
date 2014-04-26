//External modules
var gunzip = require('zlib').createGunzip();
var http = require('http');
var numeral = require('numeral');
var $ = window.$;

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
    this.showMsg = function (title, message) {
        $("#popup").html("<div id='messageModal' class='modal fade in show'>" +
                         "<div class='modal-dialog'>" +
                         "<div class='modal-content'>" +
                         "<div class='modal-header'>" +
                         "<button type='button' class='close' />" +
                         "<span class='glyphicon glyphicon-remove'></span>" +
                         "</button>" +
                         "<span>" + title + "</span>" +
                         "</div>" +
                         "<div class='m-10'>" + message +
                         "</div>" +
                         "<div class='clearfix'></div>" +
                         "</div>" +
                         "</div>" +
                         "</div>" +
                         "<div class='modal-backdrop fade in'></div>" +
                         "</div>");
    }

    this.toBytes = function (num) {
        return numeral(num).format('0.0b').toLowerCase();
    }

    this.getQueryString = function (key)
    {
        var url = window.location.search.substring(1);
        console.log(url);
        var querystrings = url.split('&');
        for (var i = 0; i < querystrings.length; i++) {
            var keys = querystrings[i].split('=');
            if (keys[0] == key) {
                return keys[1];
            }
        }
    }

}

module.exports = new Utilities();




