(function(){
  var defaults, extend;
  defaults = {
    messages: {
      // MEDIA_ERR_ABORTED
      1: "The video download was cancelled",
      // MEDIA_ERR_NETWORK
      2: "The video connection was lost, please confirm you're connected to the internet",
      // MEDIA_ERR_DECODE
      3: "The video is bad or in a format that can't be played",
      // MEDIA_ERR_SRC_NOT_SUPPORTED
      4: "This video is unavailable",
      // MEDIA_ERR_ENCRYPTED (Chrome)
      5: "The video you're trying to watch is encrypted and we don't know how to decrypt it",
      unknown: "An unanticipated problem was encountered, check back soon and try again"
    }
  };
  extend = function(obj){
    var arg, prop, source;
    for (arg in arguments) {
      source = arguments[arg];
      for (prop in source) {
        if (source[prop] && typeof source[prop] === 'object') {
          obj[prop] = extend(obj[prop] || {}, source[prop]);
        } else {
          obj[prop] = source[prop];
        }
      }
    };
    return obj;
  };

  videojs.plugin('errors', function(options){
    var addEventListener, messages, settings;

    settings = extend(defaults, options);
    messages = settings.messages;
    addEventListener = this.el().addEventListener || this.el().attachEvent;

    this.on('error', function(event){
      var code, dialog, player;
      player = this;
      code = event.target.error ? event.target.error.code : event.code;

      // create the dialog
      dialog = document.createElement('div');
      dialog.className = 'vjs-error-dialog';
      dialog.textContent = messages[code] || messages['unknown'];
      addEventListener.call(dialog, 'click', function(event){
        player.el().removeChild(dialog);
      }, false);

      // add it to the DOM
      player.el().appendChild(dialog);
    });
  });
})();
