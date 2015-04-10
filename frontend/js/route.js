/**
*  # Routing module
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
*  This module contains all MyPads client-side routing using Mithril included
*  router. It initializes all in search mode.
*/

module.exports = (function () {
  // Global dependencies
  var und = require('underscore');
  var Backbone = require('backbone');
  // Local dependencies
  var auth = require('./auth.js');
  var layout = require('./modules/layout.js');

  var route = {};

  /*
  * ## Routes
  *
  * `routes` contains all routes, minus public routes.
  * This will helps to have a clear view on routes, even if we need
  * authentification in most of them.
  */

  route.routes = {
    'admin': 'admin'
  };

  route.init = function (cb) {
    var authRoutes = und.mapObject(route.routes, function (v, k) {
      return auth.isAuthenticated ? v : 'login';
    });
    route.routes = und.extend({
      'login': 'login',
      'logout': 'logout',
      'subscribe': 'subscribe'
    }, authRoutes);

    var Router = Backbone.Router.extend({
      routes: route.routes,
      login: function () {
        var login = require('./modules/login.js');
        layout.view.main.open(login.view());
      },
      logout: function () { console.log('logout'); },
      subscribe: function () {
        layout.view.main.open(new Backbone.View());
      },
      admin: function () {}
    });

    route.router = new Router();
    Backbone.history.start();
    cb();
  };


  return route;
}).call(this);