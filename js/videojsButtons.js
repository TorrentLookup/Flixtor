//Available buttons
var fontsize, fontcolor;

//Font size button
videojs.FontSize = videojs.Button.extend({
    /** @constructor */
    init: function(player, options){
        videojs.Button.call(this, player, options);
        this.on('click', this.onClick);
    }
});

videojs.FontSize.prototype.onClick = function() {

};

var createFontSizeButton = function() {
    var props = {
        className: 'vjs-fontsize-button vjs-menu-button vjs-control',
        innerHTML: '<div class="vjs-control-content"><span class="vjs-control-text">Set font size</span></div><div class="vjs-menu"><ul class="vjs-menu-content"><li class="vjs-menu-item" data-val="100">Huge [100]</li><li class="vjs-menu-item" data-val="50">Bigger [50]</li><li class="vjs-menu-item" data-val="40">Big [40]</li><li class="vjs-menu-item" data-val="30">Medium [30]</li><li class="vjs-menu-item" data-val="20">Small [20]</li><li class="vjs-menu-item" data-val="16">Smaller [16]</li></ul></div>',
        role: 'button'
    };
    return videojs.Component.prototype.createEl(null, props);
};

videojs.plugin('fontsize', function() {
    var options = { 'el' : createFontSizeButton() };
    fontsize = new videojs.FontSize(this, options);
    this.controlBar.el().appendChild(fontsize.el());
});

//Font color button
videojs.FontColor = videojs.Button.extend({
    /** @constructor */
    init: function(player, options){
        videojs.Button.call(this, player, options);
        this.on('click', this.onClick);
    }
});

videojs.FontColor.prototype.onClick = function() {

};

var createFontColorButton = function() {
    var props = {
        className: 'vjs-fontcolor-button vjs-menu-button vjs-control',
        innerHTML: '<div class="vjs-control-content"><span class="vjs-control-text">Set font color</span></div><div class="vjs-menu"><ul class="vjs-menu-content"><li class="vjs-menu-item" data-val="#ffffff">White</li><li class="vjs-menu-item" data-val="#ffff00">yellow</li><li class="vjs-menu-item" data-val="#ff0000">red</li><li class="vjs-menu-item" data-val="rainbow">rainbow</li></ul></div>',
        role: 'button'
    };
    return videojs.Component.prototype.createEl(null, props);
};

videojs.plugin('fontcolor', function() {
    var options = { 'el' : createFontColorButton() };
    fontcolor = new videojs.FontColor(this, options);
    this.controlBar.el().appendChild(fontcolor.el());
});
