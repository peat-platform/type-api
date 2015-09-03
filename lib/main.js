/*
 * peat_data_api
 * peat-platform.org
 *
 * Copyright (c) 2013 dmccarthy
 */

'use strict';

var zmq    = require('m2nodehandler');
var helper = require('./helper.js');

var typeApi = function(config) {

   helper.init(config.logger_params);

   var senderToDao    = zmq.sender(config.dao_sink);
   var senderToClient = zmq.sender(config.mongrel_handler.sink);

   zmq.receiver(config.mongrel_handler.source, config.mongrel_handler.sink, function(msg) {
      helper.processMongrel2Message(msg, senderToDao, senderToClient, config.mongrel_handler.sink);
   });
};


module.exports = typeApi;