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
var zmq          = require('m2nodehandler');
var querystring  = require('querystring')


var allowedTypes = ['boolean', 'int', 'float', 'string', 'date', 'timestamp', 'openitype', 'hexadecimal', 'base64']

var init = function(logger_params){
   this.logger = openiLogger(logger_params);
}


var getType = function (path) {

   var parts   = path.split('/')
   var namePos = 4;

   return parts[namePos]

}


var validateType = function(type){

   if ( !('_reference' in  type) || '' === type._reference){
      return false;
   }
   if ( !('_context' in  type) || !Array.isArray(type._context) || 0 === type._context.length ){
      return false;
   }

   for ( var i in type._context){

      var entry = type._context[i];

      if ( !('_property_name' in  entry) || '' === entry._property_name){
         return false;
      }
      if ( !('_property_context' in  entry) ){
         return false;
      }

      if ( !( '_id' in entry._property_context) || '' === entry._property_context._id){
         return false;
      }

      if ( !( '_openi_type' in entry._property_context) ){
         return false;
      }

      if (-1 === allowedTypes.indexOf(entry._property_context._openi_type)){
         return false;
      }

   }

   return true;
}


var genPostMessage = function(msg, senderToDao, senderToClient, terminal_handler){

   var typeId = 't_' + openiUtils.hash(msg.json)

   var typeRestUrl = "http://" + msg.headers.host + "/api/v1/types/" + typeId;

   msg.json._id = typeRestUrl;

   if (!validateType(msg.json)){

      var resp = zmq.Response(zmq.status.BAD_REQUEST_400, zmq.header_json, {'error' : 'Type object isn\'t properly structured' })

      senderToClient.send(msg.uuid, msg.connId, resp);

      return;
   }

   senderToDao.send({
      'dao_actions'      : [
         { 'action'       : 'POST',
            'database'    : typeId,
            'object_name' : 'meta',
            'object_data' : msg.json,
            'rest_uuid'   : typeRestUrl }
      ],
      'mongrel_sink' : terminal_handler,
      'clients'      : [
         {'uuid' : msg.uuid, 'connId' : msg.connId }
      ]
   });
}


var genGetMessage = function(msg, senderToDao, senderToClient, terminal_handler){

   var query = querystring.parse(msg.headers.QUERY);

   if ( msg.path === '/api/v1/types' ){

      var viewName  = 'types_list';

      if ('true' === query.id_only){
         viewName  = 'types_id_list';
      }

      senderToDao.send({
         'dao_actions'      : [
            {
               'action'        : 'VIEW',
               'design_doc'   : 'type_views',
               'view_name'    : viewName,
               'count'        : Number(query.limit),
               'skip'         : Number(query.skip),
               'filter_show'  : query['only_show_properties'],
               'content-type' : query['content-type'],
               'resp_type'    : 'type'
            }
         ],
         'mongrel_sink' : terminal_handler,
         'clients'      : [
            {'uuid' : msg.uuid, 'connId' : msg.connId }
         ]
      })
   }
   else if ( msg.path === '/api/v1/types/stats' ){

      senderToDao.send({
         'dao_actions'      : [
            {
               'action'       : 'VIEW',
               'design_doc'   : 'type_views',
               'view_name'    : 'types_usage',
               'group'        : true,
               'resp_type'    : 'type_stats'
            }
         ],
         'mongrel_sink' : terminal_handler,
         'clients'      : [
            {'uuid' : msg.uuid, 'connId' : msg.connId }
         ]
      })
   }
   else{
      var type =  getType(msg.path).replace('/api/v1/types/','')

      var typeRestUrl = "http://" + msg.headers.host + "/api/v1/types/" + type;

      senderToDao.send({
         'dao_actions'      : [
            { 'action' : 'GET', 'database': type, 'object_name'  : {}, 'rest_uuid'   : typeRestUrl, 'content-type' : query['content-type'] }
         ],
         'mongrel_sink' : terminal_handler,
         'clients'      : [
            {'uuid' : msg.uuid, 'connId' : msg.connId }
         ]
      });
   }
}


var genPatchMessage = function(msg, senderToDao, senderToClient, terminal_handler){

   var actions = []

   for ( var i =0; i < msg.json.types.length; i++){
      var entry       = msg.json.types[i]
      var typeId      = 't_' + openiUtils.hash(entry)
      var typeRestUrl = "http://" + msg.headers.host + "/api/v1/types/" + typeId;

      if (!validateType(entry)){

         var resp = zmq.Response(zmq.status.BAD_REQUEST_400, zmq.header_json, {'error' : 'Type object isn\'t properly structured' })

         senderToClient.send(msg.uuid, msg.connId, resp);

         return;
      }

      actions.push({ 'action' : 'POST',
         'database'    : typeId,
         'object_name' : 'meta',
         'object_data' : entry,
         'rest_uuid'   : typeRestUrl });
   }

   senderToDao.send({
      'dao_actions'  : actions,
      'mongrel_sink' : terminal_handler,
      'clients'      : [
         {'uuid' : msg.uuid, 'connId' : msg.connId }
      ]
   });
}


var processMongrel2Message = function (msg, senderToDao, senderToClient, terminal_handler) {

   this.logger.logMongrel2Message(msg)

   switch(msg.headers['METHOD']){
   case 'POST':
      genPostMessage(msg, senderToDao, senderToClient, terminal_handler)
      break;
   case 'GET':
      genGetMessage(msg, senderToDao, senderToClient, terminal_handler)
      break;
   case 'PATCH':
      genPatchMessage(msg, senderToDao, senderToClient, terminal_handler)
      break;
   default:
      break;
   }

}


module.exports.init                   = init
module.exports.getObject              = getType
module.exports.processMongrel2Message = processMongrel2Message
