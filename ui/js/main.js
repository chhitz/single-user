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

Ext.define('DSS.addon.SingleUser', {

    extend: 'DSS.addon.Framework',

    config: {
        appName: _('Single User'),
        appId: 'single-user',
        appVersion: '0.5.0',
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
        this.panel = Ext.create('Ext.form.Panel', {
            items:[{
                xtype: 'checkboxgroup',
                fieldLabel: _('Single-User Mode'),
                items: [{
                    boxLabel: _('enabled'),
                    id: 'rb',
                    inputValue: '1',
                    checked: true,
                    disabled: true,
                    listeners: {
                        change: function(field, newValue, oldValue, eOpts) {
                            console.log(oldValue + ' --> ' + newValue);
                            // create the 'myapp.testevent' event
                            var evt = Ext.create('DSS.json.Event', { name: 'single-user-enable' });
                            evt.raise({ enable: newValue });
                        }
                    },
                    scope: this
                }]
            }]
        });
        this.dssProperty.getBoolean('enabled', function(value) {
            // a handler that is called asynchronously when reading a value is finished
            Ext.getCmp('rb').setValue(value);
            Ext.getCmp('rb').setDisabled(false);
        });
        return this.panel;
    }
});

Ext.onReady(function() {
    var myapp = Ext.create('DSS.addon.SingleUser');
    myapp.initPage();
});

