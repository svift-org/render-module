/*
 *
 * Add header info here
 *
 */

'use strict';

var fs = require('fs')

var renderBundle = require('svift-render-bundle'),
  rNightmare = require('svift-render-nightmare'),
  //rHtml = require('svift-render-html'),
  //rGif = require('svift-render-gif'),
  //rVideo = require('svift-render-html')

var render = (function () {
 
  var module = {},
    render_callback,
    path = './output/',
    init_callback

  /**
  * Initiate the rendering process by sending a data object containing params, vis and data (see data/example.json for structure)
  *
  * @param {Object} `data` Parameters for the rendering process.
  * @api public
  */

  module.init = function (callback) {
    initCallback = callback

    //init nightmare
    rNightmare.init(module.renderCallback)
  }

  module.renderCallback = function(msg){
    if(msg == 'initDone'){
      init_callback()
    }else if(msg == 'renderDone'){
      module.render_part2()
    }
  }

  module.render = function (data, callback) {
    render_callback = callback

    //1. Make Folder (Delete if exists)
    //TODO: Path from config
    if (fs.existsSync(path+data.id)) {
      deleteFolderRecursive(path+data.id)
    }
    fs.mkdirSync(path+data.id);

    //2. HTML
    //rHtml 

    //3. Nightmare
    rNightmare.render(data, data.id, path+data.id);
  }

  module.render_part2 = function(){
    //3.1 > Ani sequence (SVG/PNG) > Folders
    //3.2 > Final frame (SVG/PNG > JPEG Social Media Sizes)
    //4. GIF
    //5. Video
    //6. Bundle Sequence ZIPs, Complete ZIPs

    render_callback()
  }

  function deleteFolderRecursive(path) {
    if( fs.existsSync(path) ) {
      fs.readdirSync(path).forEach(function(file,index){
        var curPath = path + "/" + file;
        if(fs.lstatSync(curPath).isDirectory()) { // recurse
          deleteFolderRecursive(curPath);
        } else { // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  }

  return module;
 
})();

module.exports = render;