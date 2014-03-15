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
 *  Copyright (c) 2012-2014 Christian Hitz
 *  Author: Christian Hitz <christian@klarinett.li>
 */

function htmlDecode(input){
    var e = document.createElement('div');
    e.innerHTML = input;
    return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
}

var states = Ext.create('Ext.data.Store', {
    fields: ['id', 'name'],
    data : [
        {"id":0, "name":_("Ignore")},
        {"id":1, "name":_("Turn off")},
        {"id":2, "name":_("Turn off slowly")}
    ]
});

zoneComboBoxes = [
    {
        xtype: 'checkboxgroup',
        fieldLabel: _('Single-User Mode'),
        items: [
            {
                boxLabel: _('enabled'),
                id: 'rb',
                inputValue: '1',
                checked: true,
                disabled: true,
                listeners: {
                    change: function(field, newValue, oldValue, eOpts) {
                        // create the 'myapp.testevent' event
                        var evt = Ext.create('DSS.json.Event', { name: 'single-user-enable' });
                        evt.raise({ enable: newValue });
                    }
                },
                scope: this
            }
        ]
    },
    {
        xtype: 'checkboxgroup',
        fieldLabel: _('Ignore Local Priority'),
        items: [
            {
                boxLabel: _('enabled'),
                id: 'ignoreLocalPrio',
                inputValue: '1',
                checked: false,
                disabled: true,
                listeners: {
                    change: function(field, newValue, oldValue, eOpts) {
                        // create the 'myapp.testevent' event
                        var evt = Ext.create('DSS.json.Event', { name: 'single-user-set-local-prio' });
                        evt.raise({ enable: newValue });
                    }
                },
                scope: this
            }
        ]
    }];

var sString = dss.ajaxSyncRequest('/json/property/query', {
    'query' : '/apartment/zones(*)/*(*)'
});
var result = Ext.JSON.decode(sString);
var zoneArray = result.result['zones'][0]['zones'];
for (var i = 0; i < zoneArray.length; i++) {
    var zoneId = zoneArray[i].ZoneID;
    var zoneName = zoneArray[i].name;
    if (zoneId === 0) {
        continue;
    }
    zoneComboBoxes.push({
        xtype: 'combobox',
        id: 'zoneCombo' + zoneId.toString(),
        fieldLabel: _('Behavior for zone %zone').replace('%zone', zoneName),
        disabled: true,
        store: states,
        queryMode: 'local',
        displayField: 'name',
        valueField: 'id',
        emptyText: _('Choose action...'),
        listeners: {
            'select': function(field, selection, eOpts) {
                // create the 'myapp.testevent' event
                var evt = Ext.create('DSS.json.Event', { name: 'single-user-zone-config' });
                evt.raise({ zone: field.zoneId, setting: selection[0].data.id });
            }
        },
        zoneId: zoneId,
        scope: this
    });
};

Ext.define('DSS.addon.SingleUser', {

    extend: 'DSS.addon.Framework',

    config: {
        appName: _('Single User'),
        appId: 'single-user',
        appVersion: '0.8.0',
        appIcon: 'images/dss/default_icon.png',
        appLang: 'de_DE'
    },

    getHelp: function() {
         return Ext.create('Ext.Component', {
             loader: {
                 url: 'locale/' + this.appLang + '/LC_MESSAGES/help.html',
                 autoLoad: true,
                 disableCaching: false
             }
         });
    },

    getContent: function() {
        this.panel = Ext.create('Ext.form.Panel', {
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 220
            },
            items: zoneComboBoxes
        });
        return this.panel;
    },

    initValues: function() {
        var sString = dss.ajaxSyncRequest('/json/property/query', {
            'query' : '/scripts/single-user(*)'
        });
        var result = Ext.JSON.decode(sString);
        Ext.getCmp('rb').setValue(result.result['single-user'][0].enabled);
        Ext.getCmp('rb').setDisabled(false);

        Ext.getCmp('ignoreLocalPrio').setValue(result.result['single-user'][0].ignoreLocalPrio);
        Ext.getCmp('ignoreLocalPrio').setDisabled(false);

        var zoneConf = Ext.JSON.decode(htmlDecode(result.result['single-user'][0].zoneSettings));
        for (var zone in zoneConf) {
            var value = zoneConf[zone];
            Ext.getCmp('zoneCombo' + zone).setValue(value);
            Ext.getCmp('zoneCombo' + zone).setDisabled(false);
        }
    }
});

Ext.onReady(function() {
    var myapp = Ext.create('DSS.addon.SingleUser');
    myapp.initPage();
    myapp.initValues();
});

