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
  //Removing video component temporarily
  //rVideo = require('svift-render-video'),
  aws = require('aws-sdk'),
  config = require('./config.json')

  aws.config.region = 'eu-central-1'

var render = (function () {
 
  var module = {},
    render_callback,
    transfer_count = 0,
    update_callback,
    path = '/output/',
    init_callback,
    render_data,
    rootDir,
    s3,
    scan_path,
    upload_state,
    gif_init = false

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
    rHtml.init(rootDir);

    //init nightmare
    rNightmare.init(module.renderCallback, update_callback, module.socialCallback, config)
      .then(()=>{
        console.log('nightmare running')
        module.renderCallback('initDone')
      })
      .catch(()=>{
        console.log('nightmare not running')
      })
  }

  module.renderCallback = function(msg){
    console.log('render callback', msg);
    if(msg == 'initDone'){
      init_callback()
    }else if(msg == 'renderDone'){
      module.render_part2()
    }
  }

  module.socialCallback = function(){
    render_data['transfer'] = [];
    transfer_count = 0;
    scan_path = rootDir + path + render_data.id;
    upload_state = 'social';

    (['/social']).forEach((p) => {
      fs.readdirSync(scan_path + p).forEach(file => {
        if((['','.']).indexOf(file) == -1){
          render_data.transfer.push(scan_path + p + '/' + file)
        }
      })
    })

    console.log('social done');

    module.nextAwsUpload()
  }

  module.render = function (data, callback) {
    console.log('render', data.id, data.params.vis.type)
    render_callback = callback
    render_data = data
    gif_init = false

    //TODO: Make rendering phases optional via config or something

    //1. Make Folder (Delete if exists)
    //TODO: Path from config
    if (fs.existsSync(path+data.id)) {
      utils.deleteFolderRecursive(path+data.id)
    }

    fs.mkdirSync(rootDir + path+data.id);
    fs.mkdirSync(rootDir + path+data.id + '/social');
    fs.mkdirSync(rootDir + path+data.id + '/html');
    //fs.mkdirSync(rootDir + path+data.id + '/svg');
    fs.mkdirSync(rootDir + path+data.id + '/png');

    //2. HTML
    rHtml.render(data.params, path+data.id)
    update_callback('html',1)

    //3. Nightmare
    //TODO: //3.2 > Final frame (SVG/PNG > JPEG Social Media Sizes)
    rNightmare.render(data.params, data.id, path+data.id, update_callback)
      .then(()=>{
        console.log('rendering done')
        module.renderCallback('renderDone')
      })
      .catch(()=>{
        console.log('rendering error')
      })
  }

  module.render_part2 = function(){
    //Implement Feedback, so each finished element can already be accessed by the user
    //6. Bundle Sequence ZIPs
    //TEMPORARY: AWS UPLOAD IS QUITE SLOW THEREFORE NO SVG AND PNG ZIPS AT THIS TIME
    // renderBundle.bundle(rootDir + path + render_data.id+'/svg', false, function(){
    //   update_callback('svg',1)
    // renderBundle.bundle(rootDir + path + render_data.id+'/png', false, function(){
    //   update_callback('png',1)
    //   renderBundle.bundle(rootDir + path + render_data.id+'/social', false, function(){
    //     module.render_part3()      
    //   })
    // })
    // })
    module.render_part3()      
  }

  var start;

  module.render_part3 = function(){
    //4. GIF
    if(!gif_init){
      gif_init = true
      console.log('gif start', render_data.id)
      start = new Date().getTime()
      rGif.render(rootDir + path + render_data.id, config.video.output.width, config.video.output.height, module.render_part5)
    }
  }

  //Removing video component temporarily
  /*module.render_part4 = function(){
    //5. Video
    rVideo.render( rootDir + path + render_data.id, 500, 500, module.render_part5)
    update_callback('mpeg',1)
  }*/

  module.render_part5 = function(){
    console.log('gif done', render_data.id, new Date().getTime() - start)
    update_callback('gif',1)

    //6. Bundle Complete ZIPs
    //utils.deleteFolderRecursive(rootDir + path+render_data.id+'/svg')
    utils.deleteFolderRecursive(rootDir + path+render_data.id+'/png')
    
    //renderBundle.bundle(rootDir + path + render_data.id, true, function(){
      upload_state = 'all';

      var contents = {
        date:Date.now(),
        social:[],
        files:[
          { class:'zip', icon:'zip', file:'gif', name:'GIF Animation'},
          { class:'zip', icon:'zip', file:'svg', name:'SVG'}
        ],
        zips:[
          //{ class:'zip', icon:'zip', file:render_data.id, name:'All Visualisations'},
          //{ class:'zip', icon:'zip', file:'social', name:'Social Media'}//,
          //{ class:'zip', icon:'zip', file:'png', name:'PNG Sequence'},
          //{ class:'zip', icon:'zip', file:'svg', name:'SVG'}
        ],
        html:true
      }

      config.sizes.forEach(s=>{
        contents.social.push({
          class:s.class,
          icon:s.icon,
          file:s.file,
          name:s.name
        })
      })

      fs.writeFile(rootDir + path + render_data.id + '/contents.json', JSON.stringify(contents), 'utf8', function(err){
        (['','/html']).forEach((p) => {
          fs.readdirSync(scan_path + p).forEach(file => {
            if((['','.','html','social']).indexOf(file) == -1){
              render_data.transfer.push(scan_path + p + '/' + file)
            }
          })
        })

        // let index = false
        // render_data.transfer.forEach((t,i)=>{
        //   if(t.indexOf('png.zip')>-1){
        //     index = i
        //   }
        // })
        
        // if(index){
        //   render_data.transfer.push(render_data.transfer.slice(index,1)[0])
        // }

        module.nextAwsUpload()
      })
    //})
  }

  module.nextAwsUpload = function(){
    if(transfer_count<render_data.transfer.length){
      module.awsUpload()
    }else{
      //delete everything
      if(upload_state == 'all'){
        utils.deleteFolderRecursive(rootDir + path + render_data.id)

        update_callback('zip',1)
        render_callback()
      }else if(upload_state == 'social'){
        update_callback('social', 1)
      }
    }
  }

  module.awsUpload = function(){
    console.log(render_data.transfer)
    console.log(render_data.transfer[transfer_count])
    let file = render_data.transfer[transfer_count]
    if(file == undefined){
      transfer_count++
      module.nextAwsUpload()
    }else{
      fs.readFile(file, function (err, data) {
          if (err) { throw err }

          // Buffer Pattern; how to handle buffers; straw, intake/outtake analogy
          var base64data = new Buffer(data, 'binary');

          let type = 'application/octet-stream',
            ext = file.split('.')

          switch(ext[ext.length-1]){
            case 'txt':
              type = 'plain/text'
            break;
            case 'html':
              type = 'text/html' //application/xhtml+xml
            break;
            case 'xml':
              type = 'application/xml'
            break;
            case 'png':
              type = 'image/png'
            break;
            case 'zip':
              type = 'application/zip'
            break;
            case 'ico':
              type = 'image/x-icon'
            break;
            case 'gif':
              type = 'image/gif'
            break;
            case 'mp4':
              type = 'video/mp4'
            break;
          }

          //This is the last file, let the frontend know we are almost done...
          if(file.indexOf('png.zip')>-1){
            update_callback('aws',1)
          }

          s3.putObject({
             'Bucket': 'svift-vis-output',
              'Key': process.env.S3_FOLDER+file.substr(file.indexOf('output')+6),
              'Body': base64data,
              'ACL': 'public-read',
              'ContentType': type
           }, function (resp) {
              if(resp){
                console.log(resp)
              }
              
              transfer_count++
              module.nextAwsUpload()
          })
      })
    }
  }

  return module;
 
})();

module.exports = render;