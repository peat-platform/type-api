/**
* Created by dconway on 03/09/15.
*/
'use strict';

var typeAPI   = require('../lib/main.js');
var helper   = require('../lib/helper.js');

var assert = require('chai').assert;

var mockSender = function(cd){
   return{"send" : function(){
      //console.log(arguments);
      cd.apply(this,arguments);
   }}
};
var mockClientSender = function(cd){
   return{"send" : function(){
      //console.log(arguments);
      cd.apply(this,arguments);
   }}
};


describe('Test Main',function(){
   var config = {
      dao_sink        : { spec:'tcp://127.0.0.1:49999', bind:false, type:'push', id:'a'},
      mongrel_handler : {
         source : { spec:'tcp://127.0.0.1:49905', bind:false, id:'b', type:'pull', isMongrel2:true },
         sink   : { spec:'tcp://127.0.0.1:49906', bind:false, id:'c', type:'pub', isMongrel2:true}
      },
      logger_params : {
         'name'          : 'type-api',
         'log_level'     : 'info',
         'log_file_name' : './type_api',
         'as_json'       : false
      }
   };
   var invalidConfig = {
      dao_sink        : { spec:'tcp://127.0.0.1:49999', bind:false, type:'left', id:'a'},
      mongrel_handler : {
         source : { spec:'tcp://127.0.0.1:49905', bind:false, id:'b', type:'pull', isMongrel2:true },
         sink   : { spec:'tcp://127.0.0.1:49906', bind:false, id:'c', type:'pub', isMongrel2:true}
      },
      logger_params : {
         'name'          : 'type-api',
         'log_level'     : 'info',
         'log_file_name' : './type_api',
         'as_json'       : false
      }
   };
   it('should pass init with config', function () {
      try{
         typeAPI(config);
      } catch(e){
         assert.isNull(e, "No Error Should be Thrown");
      }
   });
   it('should throe error with bad config', function () {
      try{
         typeAPI(invalidConfig);
      }catch(e){
         assert.isNotNull(e,"Error should be thrown");
      }
   });
});


describe('Test Helper',function(){
   var validType = {
      "@reference": "genericExample",
      "@context": [
         {
            "@property_name": "stringArray",
            "@data_type": "string",
            "@multiple": true,
            "@required": true,
            "@description": "Array of Strings",
            "@allowed_values": ["yes","no"]
         }
      ]
   };
   var blankType = {
      "@reference": "",
      "@context": [
         {
            "@property_name": "",
            "@data_type": "string",
            "@multiple": true,
            "@required": true,
            "@description": "",
            "@allowed_values": ""
         }
      ]
   };
   var invalidType = {
      "@reference": "genericExample",
      "@context": [
         {
         }
      ]
   };
   var invalidType2 = {
      "@context": [
         {
            "@allowed_values": []
         }
      ]
   };
   var invalidType3 = {
      "@reference": "genericExample"
   };

   var blankMsg = { "headers" : {"METHOD" : ""}, "json" : {"nullKey" : null, "testKey":"test"}};
   var PostMsg = { "headers" : {"METHOD" : "POST"},"json":validType};
   var PostMsg_BlankJson = { "headers" : {"METHOD" : "POST"}};
   var PostMsg_NullJson = { "headers" : {"METHOD" : "POST"},"json":null};
   var PostMsg_BlankType = { "headers" : {"METHOD" : "POST"},"json":blankType};
   var PostMsg_BadType = { "headers" : {"METHOD" : "POST"},"json":invalidType};
   var PostMsg_BadType2 = { "headers" : {"METHOD" : "POST"},"json":invalidType2};
   var PostMsg_BadType3 = { "headers" : {"METHOD" : "POST"},"json":invalidType3};

   describe('Mongrel2 Message',function(){
      it('should pass with blank header', function () {
         try {
            helper.processMongrel2Message(blankMsg, null, null, null);
         }catch(e){
            assert.isNull(e,"Should not throw Error");
         }
      });

      it('should return 400 status for Empty body POST', function () {
         var cb = function(uuid,connid,status,headers,data){
            assert(400,status,"Status should be 400");
            assert({'error' : 'Empty body.' },data,"Error should be 'Empty body'")
         };
         try {
            helper.processMongrel2Message(PostMsg_BlankJson, null, mockClientSender(cb), null);
            helper.processMongrel2Message(PostMsg_NullJson, null, mockClientSender(cb), null);
         }catch(e){
            assert.isNull(e,"Should not throw Error");
         }
      });
      it('should return 400 status for invalid Type POST', function () {
         var cb = function(uuid,connid,status,headers,data){
            console.log(JSON.stringify(uuid)+"\t"+JSON.stringify(connid)+"\t"+JSON.stringify(status)+"\t"+JSON.stringify(headers)+"\t"+JSON.stringify(data));
            assert(400,status,"Status should be 400");
            assert(JSON.stringify(data).indexOf('Type object') !== -1,"Error should be 'Empty body'")
         };
         try {
            helper.processMongrel2Message(PostMsg_BadType, null, mockClientSender(cb), null);
            helper.processMongrel2Message(PostMsg_BadType2, null, mockClientSender(cb), null);
            helper.processMongrel2Message(PostMsg_BadType3, null, mockClientSender(cb), null);
         }catch(e){
            assert.isNull(e,"Should not throw Error");
         }
      });
      it('should return 400 status for blank Type POST', function () {
         var cb = function(uuid,connid,status,headers,data){
            assert(400,status,"Status should be 400");
            assert(JSON.stringify(data).indexOf('Type object isn\'t properly structured') !== -1,"Error should be returned")
         };
         try {
            helper.processMongrel2Message(PostMsg_BlankType, null, mockClientSender(cb), null);
         }catch(e){
            assert.isNull(e,"Should not throw Error");
         }
      });
      it('should return OK for POST valid type', function () {
         var cb = function(msg){
            assert.isNotNull(msg.dao_actions,"DAO Actions should not be Null");
         };
         try {
            helper.processMongrel2Message(PostMsg, mockSender(cb), mockClientSender(cb), null);
         }catch(e){
            console.log(e);
            assert.isNull(e,"Should not throw Error");
         }
      });

      it('should return 400 status for Empty GET URL', function () {
         var cb = function(uuid,connid,status,headers,data){
            assert(400,status,"Status should be 400");
            assert('Invalid type id',data.error,"Error should be 'Empty body'")
         };
         try {
            helper.processMongrel2Message({ "headers" : {"METHOD" : "GET"}, "path" : ""}, null, mockClientSender(cb), null);
         }catch(e){
            assert.isNull(e,"Should not throw Error");
         }
      });
      it('should return daoAction array for GET Type URL', function () {
         var cb = function(data){
            assert.isNotNull(data.dao_actions,"Actions Should not be null");
            assert('VIEW',data.dao_actions.action,"Action should be View")
         };
         try {
            helper.processMongrel2Message({ "headers" : {"METHOD" : "GET", "URI" : "/api/v1/types?offset=0&limit=30", "QUERY":"offset=0&limit=30"}, "path" : "/api/v1/types"}, mockSender(cb), mockClientSender(cb), null);
         }catch(e){
            assert.isNull(e,"Should not throw Error");
         }
      });
      it('should return daoAction array for GET TypeStats URL', function () {
         var cb = function(data){
            assert.isNotNull(data.dao_actions,"Actions Should not be null");
            assert('VIEW',data.dao_actions.action,"Action should be View")
         };
         try {
            helper.processMongrel2Message({ "headers" : {"METHOD" : "GET"}, "path" : "/api/v1/types/stats"}, mockSender(cb), mockClientSender(cb), null);
         }catch(e){
            assert.isNull(e,"Should not throw Error");
         }
      });
      it('should return daoAction array for GET Generic Type URL', function () {
         var cb = function(data){
            assert.isNotNull(data.dao_actions,"Actions Should not be null");
            assert('GET',data.dao_actions.action,"Action should be View")
         };
         try {
            helper.processMongrel2Message({ "headers" : {"METHOD" : "GET"}, "path" : "/api/v1/types/t_5d94e8484c8d18aa243fc210a0fc395a-1334"}, mockSender(cb), mockClientSender(cb), null);
         }catch(e){
            assert.isNull(e,"Should not throw Error");
         }
      });

      it('should return 400 status for Empty PATCH URL', function () {
         var cb = function(uuid,connid,status,headers,data){
            assert(400,status,"Status should be 400");
            assert('Feature temporarily disabled',data.error,"Error should be 'Empty body'")
         };
         try {
            helper.processMongrel2Message({ "headers" : {"METHOD" : "PATCH"}, "path" : ""}, null, mockClientSender(cb), null);
         }catch(e){
            assert.isNull(e,"Should not throw Error");
         }
      });

   });
});

