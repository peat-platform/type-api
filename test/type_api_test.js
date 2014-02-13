'use strict';

var base_path          = require('./basePath.js');
var type_api = require(base_path + '../lib/helper.js');


type_api.init({
   'path'     : 'build/data_api',
   'log_level': 'debug',
   'as_json'  : false
})

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/



exports['testProcessMongrel2'] = {

   'POST Type'   : function(test) {
      // tests here
      var testInput     = {
         uuid    : '123123',
         connId  : '345345345',
         path    : '/api/v1/types/123123123/abc',
         headers : {
            QUERY  : 'a=b&c=d',
            METHOD : 'POST'
         },
         body    : '{ "alias": "dmc", "username": "dm@tssg.org" }',
         json    : {
            "alias": "dmc",
            "username": "dm@tssg.org"
            }
         }


      var actual = type_api.processMongrel2Message(testInput);

      test.equals('POST',        actual.dao_actions[0].action                              )
      test.equals('5248373c62dd03ff72407c602df06536-40', actual.dao_actions[0].object_name )
      test.equals('dmc',         actual.dao_actions[0].object_data.alias                   )
      test.equals('dm@tssg.org', actual.dao_actions[0].object_data.username                )
      test.equals(true,          actual.mongrel_resp.value                                 )
      test.equals('123123',      actual.clients[0].uuid                                    )
      test.equals('345345345',   actual.clients[0].connId                                  )
      test.done();
   },
   'PUT Type'   : function(test) {
      // tests here
      var testInput     = {
         uuid    : '123123',
         connId  : '345345345',
         path    : '/api/v1/types/123123123/abc/ver1233',
         headers : {
            QUERY  : 'a=b&c=d',
            METHOD : 'PUT'
         },
         body    : '{ "alias": "dmccccc", "username": "dm@tssg.org" }',
         json    : {
               "alias": "dmcccccc",
               "username": "dm@tssg.org"
         }
      }

      var actual = type_api.processMongrel2Message(testInput);

      test.equals(null,actual)
      test.done();
   },
   'GET Type'   : function(test) {
      // tests here
      var testInput     = {
         uuid    : '123123',
         connId  : '345345345',
         path    : '/api/v1/types/234234234234',
         headers : {
            QUERY  : 'a=b&c=d',
            METHOD : 'GET'
         },
         body    : {
            "alias": "dmc",
            "username": "dm@tssg.org"
         },
         json    : {
            "alias": "dmc",
            "username": "dm@tssg.org"
         }
      }

      var actual = type_api.processMongrel2Message(testInput);

      test.equals(actual.dao_actions[0].action,      'GET'             )
      test.equals(actual.dao_actions[0].database,    'types'           )
      test.equals(actual.dao_actions[0].object_name, '234234234234'    )
      test.deepEqual(actual.mongrel_resp,            { value: true }   )
      test.equals(actual.clients[0].uuid,            '123123'          )
      test.equals(actual.clients[0].connId,          '345345345'       )
      test.done();
   },
   'PATCH Types'   : function(test) {
   // tests here
   var testInput     = {
      uuid    : '123123',
      connId  : '345345345',
      path    : '/api/v1/types/234234234234',
      headers : {
         QUERY  : 'a=b&c=d',
         METHOD : 'PATCH'
      },
      body    : '[{"type":1},{"type":2},{"type":3}]',
      json    : [{"type":1},{"type":2},{"type":3}]
   }

   var actual = type_api.processMongrel2Message(testInput);

   test.equals(actual.dao_actions[0].action,         'POST'            )
   test.equals(actual.dao_actions[0].database,       'types'           )
   test.equals(actual.dao_actions[0].object_name,    'f94e7d144c9d8e8160a9649ccca925c6-10' )
   test.deepEqual(actual.dao_actions[0].object_data, { type: 1 } )
   test.equals(actual.dao_actions[1].action,         'POST'            )
   test.equals(actual.dao_actions[1].database,       'types'           )
   test.equals(actual.dao_actions[1].object_name,    'a22e91c5c5eaff5c84b5ff3bd9dc4a42-10' )
   test.deepEqual(actual.dao_actions[1].object_data, { type: 2 } )
   test.equals(actual.dao_actions[2].action,         'POST'            )
   test.equals(actual.dao_actions[2].database,       'types'           )
   test.equals(actual.dao_actions[2].object_name,    '69c59b87715efec7a6d16df88ca40aa3-10' )
   test.deepEqual(actual.dao_actions[2].object_data, { type: 3 } )

   test.deepEqual(actual.mongrel_resp,            { value: true }   )
   test.equals(actual.clients[0].uuid,            '123123'          )
   test.equals(actual.clients[0].connId,          '345345345'       )
   test.done();
},
   'Malformed'   : function(test) {
      // tests here
      var testInput     = {
         uuid    : '123123',
         connId  : '345345345',
         path    : '/api/v1/types/234234234234',
         headers : {
            QUERY  : 'a=b&c=d',
            METHOD : 'AAA'
         },
         body    : {
            "alias": "dmc",
            "username": "dm@tssg.org"
         },
         json    : {
            "alias": "dmc",
            "username": "dm@tssg.org"
         }
      }

      var actual = type_api.processMongrel2Message(testInput);

      test.equal(actual, null)

      test.done();
   }
}
