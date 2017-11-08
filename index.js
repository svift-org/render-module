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
  rVideo = require('svift-render-video'),
  aws = require('aws-sdk')

  aws.config.region = 'eu-central-1'

var render = (function () {
 
  var module = {},
    render_callback,
    update_callback,
    path = '/output/',
    init_callback,
    render_data,
    rootDir,
    s3

  /**
  * Initiate the rendering process by sending a data object containing params, vis and data (see data/example.json for structure)
  *
  * @param {Object} `data` Parameters for the rendering process.
  * @api public
  */

  module.init = function (dir, callback, _update_callback) {
    rootDir = dir
    init_callback = callback
    update_callback = _update_callback

    s3 = new aws.S3()

    //init HTML
    rHtml.init(rootDir)

    //init nightmare
    rNightmare.init(module.renderCallback, update_callback)
  }

  module.renderCallback = function(msg){
    if(msg == 'initDone'){
      init_callback()
    }else if(msg == 'renderDone'){
      module.render_part2()
    }
  }

  module.render = function (data, callback) {
    console.log('render',data.id)
    render_callback = callback
    render_data = data

    //TODO: Make rendering phases optional via config or something

    //1. Make Folder (Delete if exists)
    //TODO: Path from config
    if (fs.existsSync(path+data.id)) {
      utils.deleteFolderRecursive(path+data.id)
    }

    console.log(rootDir + path+data.id)

    fs.mkdirSync(rootDir + path+data.id);
    fs.mkdirSync(rootDir + path+data.id + '/html');
    fs.mkdirSync(rootDir + path+data.id + '/svg');
    fs.mkdirSync(rootDir + path+data.id + '/png');

    //2. HTML
    rHtml.render(data.params, path+data.id)
    update_callback('html',1)

    //3. Nightmare
    //TODO: //3.2 > Final frame (SVG/PNG > JPEG Social Media Sizes)
    rNightmare.render(data.params, data.id, path+data.id, update_callback);
  }

  module.render_part2 = function(){
    //Implement Feedback, so each finished element can already be accessed by the user
    //6. Bundle Sequence ZIPs
    renderBundle.bundle(rootDir + path + render_data.id+'/svg', false, function(){
      update_callback('svg',1)
      renderBundle.bundle(rootDir + path + render_data.id+'/png', false, function(){
        update_callback('png',1)
        module.render_part3()      
      })
    })
  }

  module.render_part3 = function(){
    //4. GIF
    rGif.render(rootDir + path + render_data.id, 500, 500, module.render_part4) //render_data.params.width, render_data.params.height
    update_callback('gif',1)
  }

  module.render_part4 = function(){
    //5. Video
    rVideo.render( rootDir + path + render_data.id, 500, 500, module.render_part5)
    update_callback('mpeg',1)
  }

  module.render_part5 = function(){
    //6. Bundle Complete ZIPs
    utils.deleteFolderRecursive(rootDir + path+render_data.id+'/svg')
    utils.deleteFolderRecursive(rootDir + path+render_data.id+'/png')
    renderBundle.bundle(rootDir + path+render_data.id, true, function(){

      module.awsUpload(rootDir + path+render_data.id+'/'+render_data.id+'.gif', function(){
        update_callback('zip',1)
        render_callback()
      })
    })
  }

  module.awsUpload = function(file, callback){
    fs.readFile(file, function (err, data) {
        if (err) { throw err }

        // Buffer Pattern; how to handle buffers; straw, intake/outtake analogy
        var base64data = new Buffer(data, 'binary');

        s3.putObject({
           'Bucket': 'svift-vis-output',
            'Key': 'output/'+render_data.id+'/'+file,
            'Body': base64data,
            'ACL': 'public-read'
         }, function (resp) {
            callback()
        })
    })
  }

  return module;
 
})();

module.exports = render;