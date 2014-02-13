/*
 * openi_data_api
 * openi-ict.eu
 *
 * Copyright (c) 2013 dmccarthy
 * Licensed under the MIT license.
 */

'use strict';

var zmq    = require('m2nodehandler');
var helper = require('./helper.js');

var typeApi = function(params){

   helper.init(params.logger_params)

   var daoPush = zmq.bindToPushQ({
      spec: params.dao_in_q.spec
   });


   zmq.bindToMong2PullQ({
      spec: params.mong_out_q.spec,
      id  : params.mong_out_q.id
   }, function(msg) {

      var dao_msg = helper.processMongrel2Message(msg);

      daoPush.push(dao_msg)
   });

}


module.exports = typeApi