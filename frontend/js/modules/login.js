/**
*  # Login module
*
*  ## License
*
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
*
*  ## Description
*
*  This module contains the login markup.
*/

module.exports = (function () {
  // Global dependencies
  var m = require('mithril');
  // Local dependencies
  var layout = require('./layout.js');
  var LANG = require('../configuration.js').LANG;
  var LOG = LANG.LOGIN;

  var login = {};

  var views = {};
  views.main = function () {
    return m('section.login-main.block-group', [
      m('h2.block', LOG.FORM),
      m('form.block', [
        m('fieldset.login-main.block-group', [
          m('legend', LOG.MYPADS_ACCOUNT),
          m('label.login-main.block', { for: 'login' }, LOG.USERNAME),
          m('input.login-main.block',
            { type: 'text', name: 'login', placeholder: LOG.LOGIN }),
          m('label.login-main.block', { for: 'password' }, LOG.PASSWORD),
          m('input.login-main.block',
          { type: 'password', name: 'password', placeholder: LOG.UNDEF }),
          m('input.login-main.send.block', { type: 'submit', value: LOG.LOGIN })
        ]),
      ])
    ]);
  };
  views.aside = function () {
    return m('section.login-aside', [
      m('h2.login-aside', LANG.GLOBAL.TITLE),
      m('article.login-aside', m.trust(LANG.GLOBAL.DESCR))
    ]);
  };

  login.view = function () {
    return layout.view(views.main(), views.aside());
  };
  return login;
}).call(this);
