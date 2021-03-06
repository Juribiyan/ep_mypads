/**
*  # Group form module
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
*  This module is the main one, containing groups and pads.
*/

module.exports = (function () {
  'use strict';
  // Global dependencies
  var m = require('mithril');
  var ld = require('lodash');
  // Local dependencies
  var conf = require('../configuration.js');
  var auth = require('../auth.js');
  var layout = require('./layout.js');
  var form = require('../helpers/form.js');
  var notif = require('../widgets/notification.js');
  var tag = require('../widgets/tag.js');
  var model = require('../model/group.js');

  var gf = {};

  /**
  * ## Controller
  *
  * Used for authentication enforcement, edit or add recognition and state.
  * Stores old private status to add the ability to update a group without
  * retyping the password.
  */

  gf.controller = function () {
    if (!auth.isAuthenticated()) {
      conf.unauthUrl(true);
      return m.route('/login');
    }
    var c = {};
    var init = function () {
      c.addView = m.prop(m.route() === '/mypads/group/add');
      document.title = (c.addView() ? conf.LANG.GROUP.ADD :
        conf.LANG.GROUP.EDIT_GROUP);
      document.title += ' - ' + conf.SERVER.title;
      c.fields = ['name', 'description', 'visibility', 'password', 'readonly'];
      form.initFields(c, c.fields);
      c.data.visibility('restricted');
      var tagsCurrent;
      if (!c.addView()) {
        var key = m.route.param('key');
        c.group = model.groups()[key];
        ld.map(ld.keys(c.group), function (f) {
            c.data[f] = m.prop(c.group[f]);
        });
        c.data.password = m.prop('');
        tagsCurrent = c.group.tags;
      }
      c.tag = new tag.controller({
        current: tagsCurrent || [],
        tags: model.tags()
      });
      c.data.tags = function () { return c.tag.current; };
      c.data.tags.toJSON = function () { return c.tag.current; };
    };
    if (ld.isEmpty(model.groups())) { model.fetch(init); } else { init(); }

    /**
    * `submit` internal calls the public API to add a new group or edit an
    * existing with entered data. It adds necessary fields and displays errors
    * if needed or success.
    */
    c.submit = function (e) {
      e.preventDefault();
      var opts = (function () {
        var _o = { params: {}, extra: {} };
        if (c.addView()) {
          _o.params.method = 'POST';
          _o.params.url = conf.URLS.GROUP;
          _o.extra.msg = conf.LANG.GROUP.INFO.ADD_SUCCESS;
        } else {
          _o.params.method = 'PUT';
          _o.params.url = conf.URLS.GROUP + '/' + c.group._id;
          _o.extra.msg = conf.LANG.GROUP.INFO.EDIT_SUCCESS;
        }
        return _o;
      })();
      opts.params.data = ld.assign(c.data, { admin: auth.userInfo()._id });
      opts.params.data.auth_token = auth.token();
      m.request(opts.params).then(function (resp) {
        var data = model.groups();
        data[resp.key] = resp.value;
        model.groups(data);
        model.tags(ld.union(model.tags(), resp.value.tags));
        notif.success({ body: opts.extra.msg });
        m.route('/mypads/group/' + resp.value._id + '/view');
      }, function (err) {
        notif.error({ body: ld.result(conf.LANG, err.error) });
      });
    };
    return c;
  };

  /**
  * ## Views
  */

  var view = {};
  gf.views = view;

  view.icon = {};

  /**
  * ### icon common
  *
  * `common` returns an icon info vdom with viven `msg` on tooltip.
  */

  view.icon.common = function (msg) {
    return m('i', {
      class: 'mp-tooltip glyphicon glyphicon-info-sign',
      'data-msg': msg
    });
  };

  view.icon.name = function (c) {
    return form.icon(c, 'name', conf.LANG.GROUP.INFO.NAME,
      conf.LANG.GROUP.ERR.NAME);
  };

  view.icon.description = function (c) {
    return form.icon(c, 'description', conf.LANG.GROUP.INFO.DESCRIPTION);
  };

  view.icon.visibility = function () {
    return view.icon.common(conf.LANG.GROUP.INFO.VISIBILITY);
  };
  view.icon.password = function () {
    return view.icon.common(conf.LANG.GROUP.INFO.PASSWORD);
  };
  view.icon.readonly = function () {
    return view.icon.common(conf.LANG.GROUP.INFO.READONLY);
  };

  /**
  * ### Fields
  *
  * Each `field` is a view returning three vdom elements :
  *
  * - a `label`
  * - an `input`
  * - the `icon`
  */

  view.field = {};

  view.field.name = function (c) {
    var f = form.field(c, 'name', conf.LANG.GROUP.INFO.NAME,
      view.icon.name(c));
      ld.assign(f.input.attrs, {
        placeholder: conf.LANG.GROUP.INFO.NAME,
        required: true,
        maxlength: 40,
        config: form.focusOnInit
      });
    return f;
  };

  view.field.description = function (c) {
    var label = m('label.col-sm-4', { for: 'description' },
      conf.LANG.GROUP.FIELD.DESCRIPTION);
    var textarea = m('textarea.form-control', {
      name: 'description',
      value: (c.data.description() || ''),
      onchange: m.withAttr('value', c.data.description)
    }, c.data.description());
    return { label: label, icon: view.icon.description(c), textarea: textarea };
  };

  view.field.visibility = function (c, restricted) {
    restricted = ld.isUndefined(restricted) ? true : restricted;
    var label = m('label.col-sm-4', { for: 'visibility' },
      conf.LANG.GROUP.FIELD.VISIBILITY);
    var select = m('select.form-control', {
      name: 'visibility',
      required: true,
      value: c.data.visibility(),
      onchange: m.withAttr('value', c.data.visibility)
    }, [
      (function () {
        if (restricted) {
          return m('option', { value: 'restricted' },
            conf.LANG.GROUP.FIELD.RESTRICTED);
        } else {
          return m('option', { value: '' }, '');
        }
      })(),
      m('option', { value: 'private' }, conf.LANG.GROUP.FIELD.PRIVATE),
      m('option', { value: 'public' }, conf.LANG.GROUP.FIELD.PUBLIC)
    ]);
    return { label: label, icon: view.icon.visibility(), select: select };
  };

  view.field.password = function (c) {
    var label = m('label.col-sm-4', { for: 'password' },
      conf.LANG.USER.PASSWORD);
    var input = m('input.form-control', {
      name: 'password',
      type: 'password',
      placeholder: conf.LANG.USER.UNDEF,
      value: c.data.password(),
      required: (c.addView() && (c.data.visibility() === 'private')),
      oninput: m.withAttr('value', c.data.password)
    });
    return { label: label, icon: view.icon.password(), input: input };
  };

  view.field.readonly = function (c) {
    var label = m('label', [
        m('input', {
          name: 'readonly',
          type: 'checkbox',
          checked: c.data.readonly(),
          onchange: m.withAttr('checked', c.data.readonly)
        }),
        conf.LANG.GROUP.FIELD.READONLY
      ]);
    return { label: label, icon: view.icon.readonly()};
  };

  view.field.tag = function (c) { return tag.view(c.tag); };

  /**
  * ### form view
  *
  * Classic view with all fields and changes according to the view.
  */

  view.form = function (c) {
    var _f = ld.reduce(c.fields, function (memo, f) {
      memo[f] = view.field[f](c);
      return memo;
    }, {});
    var fields = [
      m('.form-group', [
        _f.name.label, _f.name.icon,
        m('.col-sm-7', _f.name.input)
      ]),
      m('.form-group', [
        _f.description.label, _f.description.icon,
        m('.col-sm-7', _f.description.textarea)
      ]),
      m('.form-group', [
        _f.visibility.label, _f.visibility.icon,
        m('.col-sm-7', _f.visibility.select)
      ]),
    ];
    if (c.data.visibility() === 'private') {
      fields.push(
        m('.form-group', [
          _f.password.label, _f.password.icon,
          m('.col-sm-7', _f.password.input)
        ])
      );
    }
    if (!c.addView()) {
      fields.push(
        m('.form-group',
          m('.col-sm-7 .col-sm-offset-4',
            m('.checkbox', [
              _f.readonly.label, _f.readonly.icon
            ])
          )
        )
      );
    }
    fields.push(view.field.tag(c));
    return m('form.form-horizontal', {
      id: 'group-form',
      onsubmit: c.submit
    }, [
      m('fieldset', [
        m('legend', conf.LANG.GROUP.GROUP),
        m('div', fields)
      ]),
      m('input.btn.btn-success.pull-right', {
        form: 'group-form',
        type: 'submit',
        value: conf.LANG.ACTIONS.SAVE
      })
    ]);
  };

  /**
  * ### main and global view
  *
  * Views with cosmetic and help changes according to the current page.
  */

  view.main = function (c) {
    return m('section', { class: 'user group-form' }, [
      m('h2',
        c.addView() ? conf.LANG.GROUP.ADD : conf.LANG.GROUP.EDIT_GROUP),
      view.form(c)
    ]);
  };

  view.aside = function () {
    return m('section.user-aside', [
      m('h2', conf.LANG.ACTIONS.HELP),
      m('article.well', m.trust(conf.LANG.GROUP.ADD_HELP))
    ]);
  };

  gf.view = function (c) {
    return layout.view(view.main(c), view.aside(c));
  };

  return gf;
}).call(this);
