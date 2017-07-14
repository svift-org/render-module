/*
 *
 * Add header info here
 *
 */

'use strict';

var bundle = (function () {
 
  var module = {};

  /**
  * Initiate the rendering process by sending a data object containing params, vis and data (see data/example.json for structure)
  *
  * @param {Object} `data` Parameters for the rendering process.
  * @api public
  */

  module.bundle = function (callback) {
    callback();
  };

  return module;
 
})();

module.exports = bundle;