/*
 *
 * Add header info here
 *
 */

'use strict';

var fs = require('fs')

var renderBundle = require('svift-render-bundle'),
  rNightmare = require('svift-render-nightmare'),
  rHtml = require('svift-render-html'),
  utils = require('svift-utils'),
  rGif = require('svift-render-gif'),
  rVideo = require('svift-render-video')

var render = (function () {
 
  var module = {},
    render_callback,
    path = '/output/',
    init_callback,
    render_data,
    rootDir

  /**
  * Initiate the rendering process by sending a data object containing params, vis and data (see data/example.json for structure)
  *
  * @param {Object} `data` Parameters for the rendering process.
  * @api public
  */

  module.init = function (dir, callback) {
    rootDir = dir
    init_callback = callback

    //init HTML
    rHtml.init(rootDir)

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
    console.log('render')
    render_callback = callback
    render_data = data

    //TODO: Make rendering phases optional via config or something

    //1. Make Folder (Delete if exists)
    //TODO: Path from config
    if (fs.existsSync(path+data.id)) {
      utils.deleteFolderRecursive(path+data.id)
    }
    fs.mkdirSync(rootDir + path+data.id);
    fs.mkdirSync(rootDir + path+data.id + '/html');
    fs.mkdirSync(rootDir + path+data.id + '/svg');
    fs.mkdirSync(rootDir + path+data.id + '/png');

    //2. HTML
    rHtml.render(data.params, path+data.id)

    //3. Nightmare
    //TODO: //3.2 > Final frame (SVG/PNG > JPEG Social Media Sizes)
    rNightmare.render(data.params, data.id, path+data.id);
  }

  module.render_part2 = function(){
    //Implement Feedback, so each finished element can already be accessed by the user
    //6. Bundle Sequence ZIPs
    renderBundle.bundle(rootDir + path+render_data.id+'/svg', true, function(){
      renderBundle.bundle(rootDir + path+render_data.id+'/png', true, function(){
        module.render_part3()      
      })
    })
  }

  module.render_part3 = function(){
    //4. GIF
    rGif.render(rootDir + path+render_data.id, 500, 500, module.render_part4) //render_data.params.width, render_data.params.height
  }

  module.render_part4 = function(){
    //5. Video
    rVideo.render( rootDir + path + render_data.id, 500, 500, module.render_part5)
  }

  module.render_part5 = function(){
    //6. Bundle Complete ZIPs
    renderBundle.bundle(rootDir + path+render_data.id, false, function(){
      render_callback()
    })
  }

  return module;
 
})();

module.exports = render;