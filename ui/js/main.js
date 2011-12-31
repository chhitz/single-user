/*
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 *  Copyright (c) 2011 digitalSTROM.org, Zurich, Switzerland
 *  Author: Andreas Brauchli <andreas.brauchli@aizo.com>
 */

Ext.define('DSS.addon.MyApp', {

    extend: 'DSS.addon.Framework',

    config: {
        appName: _('MyApp'),
        appId: 'my-app',
        appVersion: '0.0.1',
        appIcon: 'images/dss/default_icon.png',
        appLang: 'de_DE'
    },

    getHelp: function() {
        // TODO: return help as Ext object
        return Ext.create('Ext.Component', {
            loader: {
                url: 'locale/' + this.appLang + '/LC_MESSAGES/help.html',
                autoLoad: true,
                disableCaching: false
            }
        });
    },

    getContent: function() {
        // TODO: return content as Ext object
    }
});

Ext.onReady(function() {
    var myapp = Ext.create('DSS.addon.MyApp');
    myapp.initPage();
});

