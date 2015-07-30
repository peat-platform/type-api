/**
 * Created by dmccarthy on 14/11/2013.
 */


'use strict';

var typeApi = require('./main.js');

var config = {
   dao_sink        : {
      spec:'tcp://127.0.0.1:49999',
      bind:false,
      type:'push',
      id:'a'
   },
   mongrel_handler : {
      source : {
         spec:'tcp://127.0.0.1:49905',
         bind:false, id:'b',
         type:'pull',
         isMongrel2:true
      },
      sink   : {
         spec:'tcp://127.0.0.1:49906',
         bind:false,
         id:'c',
         type:'pub',
         isMongrel2:true
      }
   },
   logger_params : {
      'path'     : '/opt/peat/cloudlet_platform/logs/type_api',
      'log_level': 'debug',
      'as_json'  : false
   },
   monitoring : { 
      type : { 
         get  : ['id_only'],
         post : [],
         put  : [],
         delete : [] 
      }
   }
};


typeApi(config);