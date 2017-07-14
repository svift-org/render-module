/*
 *
 * Add header info here
 *
 */

'use strict';

var renderer = {},
  renderer.SVG = require('svift-render-svg'),
  renderBundle = require('svift-render-bundle');

var render = (function () {
 
  var module = {},
    rendererCount = 0,
    rendererCCount = 0;

  for(var key in renderer){ rendererCount++; }
 
  /**
  * Initiate the rendering process by sending a data object containing params, vis and data (see data/example.json for structure)
  *
  * @param {Object} `data` Parameters for the rendering process.
  * @api public
  */

  module.render = function (data) {
    for(var key in renderer){
      renderer[key].render(data, module.renderCallback)
    }
  };

  module.renderCallback = function () {
    rendererCCount++;
    if(rendererCCount >= rendererCount){
      console.log('render complete');
      renderBundle.bundle(module.bundleCallback);
    }
  };

  module.bundleCallback = function () {
    console.log('everything done');
  };
 
  return module;
 
})();

module.exports = render;