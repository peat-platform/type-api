/*
 * openi_data_api
 * openi-ict.eu
 *
 * Copyright (c) 2013 dmccarthy
 */

'use strict';

var openiLogger  = require('openi-logger');
var openiUtils   = require('openi-cloudlet-utils');
var zmq          = require('m2nodehandler');
var querystring  = require('querystring');
var https        = require('https');


var allowedTypes = ['boolean', 'int', 'float', 'string', 'url', 'attachment', 'date', 'timestamp', 'hexadecimal', 'base64'];

var init = function(logger_params) {
   this.logger = openiLogger(logger_params);
};


var validateType = function(msg, callback) {

   var type     = msg.json
   var subTypes = []
   var errs     = []

   if ( !('@reference' in  type) || '' === type['@reference']) {
      errs.push('Required property @reference is missing.')
   }
   if ( !('@context' in  type) || !Array.isArray(type['@context']) || 0 === type['@context'].length ){
      errs.push('Required property @context is missing.')
   }


   for ( var i in type['@context']) {

      if(type['@context'].hasOwnProperty(i)) {
         var entry = type['@context'][i];
         var name  = entry['@property_name']

         if ( !('@property_name' in  entry) || '' === entry['@property_name']) {
            errs.push('In \'' + name + '\' required parameter @property_name is missing.')
         }

         if ( !('@context_id' in  entry) || '' === entry['@context_id']) {
            errs.push('In \'' + name + '\' required parameter @context_id is missing.')
         }

         if ( !( '@openi_type' in entry) ) {
            errs.push('In \'' + name + '\' required parameter @openi_type is missing.')
         }

         if ( !( '@required' in entry) ) {
            errs.push('In \'' + name + '\' required parameter @required is missing.')
         }

         if ( !( '@multiple' in entry) ) {
            errs.push('In \'' + name + '\' required parameter @multiple is missing.')
         }

         if ( '@allowed_values' in entry ) {
            if ( Object.prototype.toString.call( entry['@allowed_values'] ) !== '[object Array]' || 0 === entry['@allowed_values'].length ){
               errs.push('In \'' + name + '\' @allowed_values array is empty')
            }
            else{
               var type = entry['@openi_type']
               for (var allowed_entry in entry['@allowed_values']){
                  //use validator to check that allowed_entry is of apt type
               }
            }
         }


         if (undefined === entry['@openi_type'] || -1 === allowedTypes.indexOf(entry['@openi_type'].toLowerCase())) {

            var type_val = entry['@openi_type']

            if ( openiUtils.isTypeId(type_val) ){
               subTypes.push(type_val)
            }
            else{
               errs.push(entry['@openi_type'].toLowerCase() + ' is not a valid type.')
            }
         }
      }
   }

   if (errs.length > 0){
      callback( {valid:false, errors:errs})
   }
   else if (0 === subTypes.length){
      callback( {valid:true})
   }
   else{
      var type_val = subTypes.pop()
      validateSubType(msg, type_val, subTypes, callback)
   }
};


var validateSubType = function(msg, type_id, subTypes, callback){

   var type = "https://" + msg.headers.host + "/api/v1/types/" + type_id

   var request = https.get(type, function(res) {

      var typeStr2 = '';

      res.on('data', function (chunk) {
         typeStr2 += chunk;
      });

      res.on('end', function () {

         var type_json = {}

         try{
            type_json = JSON.parse(typeStr2);
         }
         catch(e){
            return callback( {valid:false, error:[ type + ' cannot be found.']});
         }

         if (type_json["@id"] == type_id ){
            if (subTypes.length > 0){
               var new_type = subTypes.pop()
               validateSubType(msg, new_type, subTypes, callback)
            }
            else{
               return callback( {valid:true})
            }
         }
         else{
            return callback( {valid:false, error:[ type + ' is not a valid type.']});
         }
      });

   }).on('error', function(e) {
         return  callback( {valid:false, error:[ type + ' is not a valid type.' ]});
      }).setTimeout( 5000, function( ) {
         return callback( {valid:false, error:[ type + ' could not be found.']});
      });
}


var genPostMessage = function(msg, senderToDao, senderToClient, terminal_handler) {

   if (undefined === msg.json || null === msg.json){

      senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {'error' : 'Empty body.' });

      return;
   }

   var typeId = 't_' + openiUtils.hash(msg.json);

   var typeRestUrl = "https://" + msg.headers.host + "/api/v1/types/" + typeId;

   msg.json['@id']            = typeId;
   msg.json['@location']      = typeRestUrl;
   msg.json['_date_created '] = new Date().toJSON();

   validateType(msg, function(validCheck){

      if (!validCheck.valid) {

         var errorString = (undefined === validCheck.errors)  ? "" : validCheck.errors.join(" ")

         senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {'error' : 'Type object isn\'t properly structured : ' + errorString});

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
            {
               'uuid' : msg.uuid,
               'connId' : msg.connId
            }
         ]
      });
   });


};


var genGetMessage = function(msg, senderToDao, senderToClient, terminal_handler) {

   var query = querystring.parse(msg.headers.QUERY);

   if ( msg.path === '/api/v1/types' ) {

      var limit  = (undefined !== query.limit)  ? Number(query.limit)   : 30
      var offset = (undefined !== query.offset) ? Number(query.offset)  :  0
      var prev   = msg.headers.URI.replace("offset="+offset, "offset="+ (((offset - limit) < 0) ? 0 : (offset - limit)))
      var next   = msg.headers.URI.replace("offset="+offset, "offset="+ (offset + limit))

      var meta = {
         "limit"       : limit,
         "offset"      : offset,
         "total_count" : 0,
         "prev"        : (0 === offset)? null : prev,
         "next"        : next
      }

      senderToDao.send({
         'dao_actions'      : [
            {
               'action'       : 'VIEW',
               'design_doc'   : 'type_views',
               'view_name'    : 'types_list',
               'meta'         : meta,
               'filter_show'  : query['only_show_properties'],
               'content-type' : query['content-type'],
               'resp_type'    : 'type',
               'id_only'      : ('true' === query.id_only)
            }
         ],
         'mongrel_sink' : terminal_handler,
         'clients'      : [
            {
               'uuid' : msg.uuid,
               'connId' : msg.connId
            }
         ]
      });
   } else if ( msg.path === '/api/v1/types/stats' ) {

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
            {
               'uuid' : msg.uuid,
               'connId' : msg.connId
            }
         ]
      });
   } else {

      var type =   openiUtils.extractTypeId(msg.path)

      var typeRestUrl = "https://" + msg.headers.host + "/api/v1/types/" + type;

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
            {
               'uuid' : msg.uuid,
               'connId' : msg.connId
            }
         ]
      });
   }
};


var genPatchMessage = function(msg, senderToDao, senderToClient, terminal_handler) {

   return senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {'error' : 'Feature temporarily disabled' });

   if (undefined === msg.json || null === msg.json) {

      senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {'error' : 'Type array is empty' });

      return;
   }

   var actions = [];

   for ( var i =0; i < msg.json.length; i++) {
      var entry       = msg[i];
      var typeId      = 't_' + openiUtils.hash(entry);
      var typeRestUrl = "https://" + msg.headers.host + "/api/v1/types/" + typeId;

      if (!validateType(entry)) {

         senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {'error' : 'Type object isn\'t properly structured' });

         return;
      }

      entry['@id']            = typeId;
      entry['@location']      = typeRestUrl;
      entry['_date_created'] = new Date().toJSON();

      actions.push({
         'action'      : 'POST',
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
         {
            'uuid' : msg.uuid,
            'connId' : msg.connId
         }
      ]
   });
};


var processMongrel2Message = function (msg, senderToDao, senderToClient, terminal_handler) {

   this.logger.logMongrel2Message(msg);

   for(var key in msg.json) {
      if(msg.json.hasOwnProperty(key)) {
         if(msg.json[key] === null) {
            delete msg.json[key];
         }
      }
   }

   switch(msg.headers['METHOD']) {
      case 'POST':
         genPostMessage(msg, senderToDao, senderToClient, terminal_handler);
         break;
      case 'GET':
         genGetMessage(msg, senderToDao, senderToClient, terminal_handler);
         break;
      case 'PATCH':
         genPatchMessage(msg, senderToDao, senderToClient, terminal_handler);
         break;
      default:
         break;
   }
};


module.exports.init                   = init;
module.exports.processMongrel2Message = processMongrel2Message;