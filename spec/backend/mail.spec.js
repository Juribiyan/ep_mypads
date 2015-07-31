/**
*  Licensed to the Apache Software Foundation (ASF) under one
*  or more contributor license agreements.  See the NOTICE file
*  distributed with this work for additional information
*  regarding copyright ownership.  The ASF licenses this file
*  to you under the Apache License, Version 2.0 (the
*  "License"); you may not use this file except in compliance
*  with the License.  You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing,
*  software distributed under the License is distributed on an
*  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
*  KIND, either express or implied.  See the License for the
*  specific language governing permissions and limitations
*  under the License.
*/

(function () {
  'use strict';

  var ld = require('lodash');
  require('es6-shim');
  var SMTPServer = require('smtp-server').SMTPServer;
  var specCommon = require('./common.js');
  var mail = require('../../mail.js');
  var conf = require('../../configuration.js');

  describe('mail module', function () {

    beforeAll(specCommon.reInitDatabase);
    afterAll(specCommon.reInitDatabase);

    it('should have no in-memory tokens nor connection by default',
      function () {
        expect(ld.isEmpty(mail.tokens)).toBeTruthy();
        expect(ld.isEmpty(mail.ends)).toBeTruthy();
        expect(mail.connection).toBeUndefined();
      }
    );

    describe('genToken', function () {

      beforeAll(function () { conf.cache.tokenDuration = 1; });

      it('should throw error if value is not given', function () {
        expect(mail.genToken).toThrowError(/PARAMS_REQUIRED/);
      });

      it('should fixes token and end date', function () {
        var token = mail.genToken('a value');
        expect(ld.size(mail.tokens)).toBe(1);
        expect(ld.size(mail.ends)).toBe(1);
        expect(ld.isString(token)).toBeTruthy();
        expect(mail.tokens[token]).toBe('a value');
        var end = mail.ends[token];
        expect(ld.isNumber(end)).toBeTruthy();
        var now = Date.now();
        var nowEnd = conf.get('tokenDuration') * 60 * 1000;
        expect(now <= end).toBeTruthy();
        expect((now + nowEnd) >= end).toBeTruthy();
      });

    });

    describe('isValidToken', function () {

      // 120ms
      beforeAll(function () { conf.cache.tokenDuration = 0.002; });

      it('should return a boolean result according to request',
        function (done) {
          expect(mail.isValidToken('inexistent')).toBeFalsy();
          var token = mail.genToken('forAnnie');
          expect(mail.isValidToken(token)).toBeTruthy();
          setTimeout(function () {
            expect(mail.isValidToken(token)).toBeFalsy();
            done();
          }, 200);
        }
      );

    });

    describe('with SMTP Server tests', function () {
      var server;
      var mailInfo = {};

      beforeAll(function (done) {
        server = new SMTPServer({
          host: 'localhost',
          secure: false,
          logger: false,
          disabledCommands: ['AUTH'],
          onMailFrom: function (address, session, next) {
            mailInfo.address = address;
            mailInfo.session = session;
            mailInfo.stream = '';
            next(new Error('not null to prevend real sending'));
          }
        });
        server.listen(2525, done);
      });

      afterAll(function (done) {
        mail.connection.quit();
        server.close(done);
      });


      describe('connect', function () {
        var clientOpts = {
          SMTPPort: 2525,
          SMTPHost: 'localhost',
          SMTPSecure: false,
          SMTPIgnoreTLS: true
        };

        afterAll(function() {
          conf.cache = ld.clone(conf.DEFAULTS);
        });

        it('should throw an error if no callback is given', function () {
          expect(mail.connect).toThrowError(/CALLBACK_FN/);
        });

        it('should throw an error if no options have been fixed', function () {
          expect(ld.partial(mail.connect, ld.noop))
            .toThrowError(/ERROR.TYPE.SMTP_CONFIG/);
        });

        xit('should return an error if options are incorrect', function () {
          // Bad options crash NodeJS, should be fixed upstream on
          // 'SMTPConnection library.
          conf.cache.SMTPPort = 25;
          conf.cache.SMTPHost = 'localhost';
          conf.cache.SMTPSecure = false;
          conf.cache.SMTPIgnoreTLS = true;
          expect(ld.partial(mail.connect, ld.noop)).toThrowError(/toto/);
        });

        describe('mail.connect real connection', function () {

          it('should not login with invalid credentials', function (done) {
            ld.assign(conf.cache, clientOpts);
            conf.cache.SMTPUser = 'parker';
            conf.cache.SMTPPass = 'lovesKuKu';
            mail.connect(function (err) {
              expect(ld.isError(err)).toBeTruthy();
              expect(err).toMatch('Invalid login');
              done();
            });
          });

          it('should connect to a valid basic SMTP Server otherwise',
            function (done) {
              ld.assign(conf.cache, clientOpts);
              delete conf.cache.SMTPUser;
              delete conf.cache.SMTPPass;
              mail.connect(function (err, success) {
                expect(err).toBeNull();
                expect(success).toBeTruthy();
                done();
              });
            }
          );

        });

      });

      describe('send', function () {

        it('should throw errors if arguments are not as expected', function () {
          expect(mail.send).toThrowError(/ERROR.TYPE.TO_MAIL/);
          expect(ld.partial(mail.send, 12)).toThrowError(/ERROR.TYPE.TO_MAIL/);
          expect(ld.partial(mail.send, 'notAnEmail'))
            .toThrowError(/ERROR.TYPE.TO_MAIL/);
          expect(ld.partial(mail.send, 'parker@lewis.me', false))
            .toThrowError(/ERROR.TYPE.MSG_STR/);
          expect(ld.partial(mail.send, 'parker@lewis.me', 'message', 12))
            .toThrowError(/ERROR.TYPE.CALLBACK_FN/);
        });

        it('should return an email if configuration is not fully done',
          function (done) {
            mail.send('parker@lewis.me', 'message', function (err) {
              expect(err).toMatch('ERROR.CONFIGURATION.MAIL_NOT_CONFIGURED');
              done();
            });
          }
        );

        it('should otherwise send an email', function (done) {
          conf.cache.SMTPEmailFrom = 'lewis@mondovideo.com';
          mail.send('parker@lewis.me', 'message', function () {
            expect(mailInfo.address.address).toBe('lewis@mondovideo.com');
            done();
          });
        });

      });

    });

  });

}).call(this);
