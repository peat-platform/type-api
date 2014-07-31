/*
 * openi_data_api
 * openi-ict.eu
 *
 * Copyright (c) 2013 dmccarthy
 * Licensed under the MIT license.
 */

'use strict';

var openiLogger  = require('openi-logger')
var openiUtils   = require('openi-cloudlet-utils')
var querystring  = require('querystring')


var init = function(logger_params){
   this.logger = openiLogger(logger_params);
}


var getType = function (path) {

   var parts   = path.split('/')
   var namePos = 4;

   return parts[namePos]

}

var validateType = function(type){
   //validate that it:
   // has a valid _reference
   // has a _context
   // Check that type is valid
   // --- needs to be of type {integer, long, float, double, string, boolean, byte, date, OPENi}
   // pull down reference and check that context is apt
}


var genPostMessage = function(msg){

   var typeId = 't_' + openiUtils.hash(msg.json)

   var typeRestUrl = "http://" + msg.headers.host + "/api/v1/types/" + typeId;

   msg.json._id = typeRestUrl;

   //validateType(msg.json)

   return {
      'dao_actions'      : [
         { 'action'       : 'POST',
            'database'    : typeId,
            'object_name' : 'meta',
            'object_data' : msg.json,
            'rest_uuid'   : typeRestUrl }
      ],
      'mongrel_resp' : {'value':true, data : {type_id : typeId} },
      'clients'      : [
         {'uuid' : msg.uuid, 'connId' : msg.connId }
      ]
   }
}


var genGetMessage = function(msg){

   var params = querystring.parse(msg.headers.QUERY);

   var type =  getType(msg.path).replace('/api/v1/types/','')

   var typeRestUrl = "http://" + msg.headers.host + "/api/v1/types/" + type;

   return {
      'dao_actions'      : [
         { 'action' : 'GET', 'database': type, 'object_name'  : {}, 'rest_uuid'   : typeRestUrl, 'content-type' : params['content-type'] }
      ],
      'mongrel_resp' : { 'value':true },
      'clients'      : [
         {'uuid' : msg.uuid, 'connId' : msg.connId }
      ]
   }
}


var genPatchMessage = function(msg){

   var actions = []

   for ( var i =0; i < msg.json.length; i++){
      var entry       = msg.json[i]
      var typeId      = 't_' + openiUtils.hash(entry)
      var typeRestUrl = "http://" + msg.headers.host + "/api/v1/types/" + typeId;

      actions.push({ 'action' : 'POST',
         'database'    : typeId,
         'object_name' : 'meta',
         'object_data' : entry,
         'rest_uuid'   : typeRestUrl });
   }

   return {
      'dao_actions'  : actions,
      'mongrel_resp' : {'value':true },
      'clients'      : [
         {'uuid' : msg.uuid, 'connId' : msg.connId }
      ]
   }
}


var processMongrel2Message = function (msg) {

   this.logger.logMongrel2Message(msg)

   var dao_msg = null;

   switch(msg.headers['METHOD']){
   case 'POST':
      dao_msg = genPostMessage(msg)
      break;
   case 'GET':
      dao_msg = genGetMessage(msg)
      break;
   case 'PATCH':
      dao_msg = genPatchMessage(msg)
      break;
   default:
      break;
   }

   this.logger.log('debug', dao_msg)

   return dao_msg
}


module.exports.init                   = init
module.exports.getObject              = getType
module.exports.processMongrel2Message = processMongrel2Message