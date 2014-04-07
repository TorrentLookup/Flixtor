var $ = window.$;
var main = require('../js/main.js');
//External functions
var searchTable = function (tableName, searchKey, searchValue, ext, sorColumn, sortReverse, sortTypeId, randomSort, randomSeed, skip, max, callback) {

    if (!ext) {
        ext = "";
    }

    var input = parseSearch(searchKey, searchValue);
        var BasicHttpBinding = require('wcf.js').BasicHttpBinding,
            Proxy = require('wcf.js').Proxy,
            binding = new BasicHttpBinding({
                SecurityMode: "None"
            }),
            proxy = new Proxy(binding, "http://www.torrentlookup.com/services/v4/services/extensionservices/searchservice.svc"),
            message = "<Envelope xmlns='http://schemas.xmlsoap.org/soap/envelope/'>" +
                "<Header />" +
                "<Body>" +
                "<JSONSearch xmlns='http://tempuri.org/'>" +
                "<tableName>" + tableName + "</tableName>" +
                "<input>" + input + " " + ext + "</input>" +
                "<skip>" + skip + "</skip>" +
                "<max>" + max + "</max>" +
                "<total>0</total>" +
                "<sortColumn>" + sorColumn + "</sortColumn>" +
                "<sortReverse>" + sortReverse + "</sortReverse>" +
                "<sortType>" + sortTypeId + "</sortType>" +
                "<randomSort>" + randomSort + "</randomSort>" +
                "<randomSeed>" + randomSeed + "</randomSeed>" +
                "</JSONSearch>" +
                "</Body>" +
                "</Envelope>"
        proxy.send(message, "http://tempuri.org/ISearchService/JSONSearch", function (response, ctx) {
            try{
            var results = $(response).find("JSONSearchResult").text();
            var total = $(response).find("Total").text();
            results = results.replace(/(\r\n|\n|\r)/gm, "");
            var jsonResult = JSON.parse(results);
            jsonResult.Total = total;
            callback(jsonResult);
            }catch(error)
            {
                main.showMessage("Error","Flixtor services are unavailable at the moment, please try again later. You can follow us on facebook to find out when the service will be online. <a target='blank' href='http://www.facebook.com/flixtorapp'>http://www.facebook.com/flixtorapp</a>");
                callback("error");
            }
        });
}

var getSimpleTopSerieTorrents = function (serieId, callback) {
    var BasicHttpBinding = require('wcf.js').BasicHttpBinding,
        Proxy = require('wcf.js').Proxy,
        binding = new BasicHttpBinding({
            SecurityMode: "None"
        }),
        proxy = new Proxy(binding, "http://www.torrentlookup.com/services/v4/services/torrentservices/torrentservice.svc"),
        message = "<Envelope xmlns='http://schemas.xmlsoap.org/soap/envelope/'>" +
            "<Header />" +
            "<Body>" +
            "<JSONSimpleTopSerieTorrents xmlns='http://tempuri.org/'>" +
            "<serieId>" + serieId + "</serieId>" +
            "</JSONSimpleTopSerieTorrents>" +
            "</Body>" +
            "</Envelope>";

    proxy.send(message, "http://tempuri.org/ITorrentService/JSONSimpleTopSerieTorrents", function (response, ctx) {
        var results = $(response).find("JSONSimpleTopSerieTorrentsResult").text();
        results = results.replace(/(\r\n|\n|\r)/gm, "");

        var jsonResult = JSON.parse(results);

        callback(jsonResult);
    });
}
var reloadInstance = function () {
    $ = window.$;
}
var parseSearch = function (key, search) {
    if (search) {
        search = search.replace("[^\w\s_]", " ").replace("_", " ");
        var terms = search.trim().split(' ');
        $(terms).each(function (index) {
            terms[index] = "+" + key + ":" + terms[index].trim() + "*";
        });

        return terms.join(" ");
    }

    return "";
}

var getGenres = function (id) {
    $.getJSON("http://www.torrentlookup.com/services/v4/services/mediaservices/mediadataservice.svc/Genres?$format=json", function (data) {
        var items = [];
        $.each(data.d.results, function (key, val) {
            if (val.Name.indexOf("&") == -1) {
                $('#' + id).append("<li><a onclick=\"changeFilterGenre('" + val.Name + "');\">" + val.Name + "</a></li>");
            }
            //items.push( "<li id='" + key + "'>" + val + "</li>" );
        });
    });
}

//Exports
module.exports.getGenres = getGenres;
module.exports.parseSearch = parseSearch;
module.exports.getSimpleTopSerieTorrents = getSimpleTopSerieTorrents;
module.exports.searchTable = searchTable;
module.exports.reloadInstance = reloadInstance;
