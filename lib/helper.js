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

   if ( !('@reference' in  type) || '' === type['@reference']){
      return {valid:false, message:'There is no _reference property'};
   }
   if ( !('@context' in  type) || !Array.isArray(type['@context']) || 0 === type['@context'].length ){
      return {valid:false, message:'There is no _context property'};
   }

   for ( var i in type['@context']){

      var entry = type['@context'][i];

      if ( !('@property_name' in  entry) || '' === entry['@property_name']){
         return {valid:false, message:'There is no _property_name parameter in entry ' + i};
      }
      if ( !('@property_context' in  entry) ){
         return {valid:false, message:'There is no _property_context parameter in entry ' + i};

      }

      if ( !( '@id' in entry['@property_context']) || '' === entry['@property_context']['@id']){
         return {valid:false, message:'There is no _id parameter in context of the entry ' + i};
      }

      if ( !( '@openi_type' in entry['@property_context']) ){
         return {valid:false, message:'There is no _openi_type parameter in context of the entry ' + i};
      }

      if (-1 === allowedTypes.indexOf(entry['@property_context']['@openi_type'])){
         return {valid:false, message: entry['@property_context']['@openi_type'] + ' is not a valid type.'};
      }

   }

   return {valid:true};
}


var genPostMessage = function(msg, senderToDao, senderToClient, terminal_handler){

   var typeId = 't_' + openiUtils.hash(msg.json)

   var typeRestUrl = "http://" + msg.headers.host + "/api/v1/types/" + typeId;

   msg.json['@id']            = typeId;
   msg.json['@location']      = typeRestUrl;
   msg.json['_date_created '] = new Date().toJSON();

   var validCheck = validateType(msg.json);

   if (!validCheck.valid){

      var resp = zmq.Response(zmq.status.BAD_REQUEST_400, zmq.header_json, {'error' : 'Type object isn\'t properly structured : ' + validCheck.message})

      senderToClient.send(msg.uuid, msg.connId, resp);

      return;
   }

   senderToDao.send({
      'dao_actions'      : [
         {
            'action'       : 'POST',
            'database'    : typeId,
            'object_name' : 'meta',
            'object_data' : msg.json,
            'id'          : typeId
         }
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
               'action'       : 'VIEW',
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
            {
               'action' : 'GET',
               'database': type,
               'id' : type,
               'content-type' : query['content-type'],
               'resp_type'    : 'type'
            }
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

      entry['@id']            = typeId;
      entry['@location']      = typeRestUrl;
      entry['_date_created'] = new Date().toJSON();

      actions.push({ 'action' : 'POST',
         'database'    : typeId,
         'object_name' : 'meta',
         'object_data' : entry,
         'id'          : typeId,
         'resp_type'   : 'type'
      });
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

   this.logger.logMongrel2Message(msg);

   for(var key in msg.json) if(msg.json[key] === null) delete msg.json[key];

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
