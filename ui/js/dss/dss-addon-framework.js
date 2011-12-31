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

Ext.Loader.setConfig({ enabled: true });
Ext.namespace('DSS.addon');

/**
 * @class DSS.addon.Framework
 * @extends Ext.container.Viewport
 * Defines an abstract framework for dSS Addons.
 */
Ext.define('DSS.addon.Framework', {

    extend: 'Ext.container.Viewport',

    uses: [
        'Ext.Msg',
        'Ext.layout.container.Border',
        'Ext.layout.container.Fit'
    ],

    config: {
        /**
         * The app name, displayed on top of the window
         * Don't forget to localize it
         */
        appName: '',
        /** The app icon displayed next to the app name */
        appIcon: 'images/dss/default_icon.png',
        /** The app version */
        appVersion: '',
        /**
         * The appId, used for relative property queries just as in the backend
         * Your relative queries will be prefixed with '/scripts/' + appId + '/'
         */
        appId: ''
    },

    dssProperty: 'DSS.json.Property',

    /**
     * Constructor to initialize the class and its dependencies.
     */
    constructor: function(config) {
        var me = this;
        me.initConfig(config);

        // Initialize the dss-property query provider
        me.dssProperty = Ext.create(me.dssProperty, { appId: me.appId });

        me.callParent(arguments);
    },

    ///
    /// Abstract page functions
    ///

    /**
     * Gets the page content
     * @return {Object} Page content as Ext.container.Container object
     */
    getContent: function() { return undefined; },

    /**
     * Gets the page's help content
     * @return {Object} The page's help content as Ext.container.Container object
     */
    getHelp: function() { return undefined; },

    /**
     * Checks that the class has been implemented
     * @return {Array[String]} An array of error messages
     */
    checkImplementation: function() {
        var errors = [];
        if (this.config.appName == '') {
            errors.push(_("App name is not set (field `appName')"));
        }
        if (this.config.appVersion == '') {
            errors.push(_("App version is not set (field `config.appVersion')"));
        }
        if (this.config.appId == 0) {
            errors.push(_("App ID is not set (field `config.appId')"));
        }
        return errors;
    },

    ///
    /// Initialization
    ///

    /**
     * Initialize the general (static) layout of the page
     * before the rendering is done.
     * Use initPage() to kick off the dynamic parts that require json
     */
    initComponent: function() {
        var me = this;
        var errors = me.checkImplementation();
        if (errors.length > 0) {
            Ext.Msg.alert (_('Addon implementation errors'), errors.join('<br>'));
        }

        document.title = me.config.appName;

        // Attach the default error handlers
        me.on({
            ajaxFailure: me.jsonAjaxFailure,
            propertyError: me.dssPropertyError
        });

        Ext.apply(me, {
            id: 'app-viewport',
            layout: {
                type: 'border',
                padding: '0 5 5 5' // pad the layout from the window edges
            },
            style: {
                backgroundColor: 'E9FFEE'
            },
            items: [{
                region: 'center',
                layout: 'border',
                border: false,
                items: [{
                    xtype: 'box',
                    region: 'north',
                    height: 80,
                    style: {
                        backgroundColor: 'E9FFEE',
                        lineHeight: '80px',
                        verticalAlign: 'middle'
                    },
                    html: '<table><tr><td><img id="logo" src="'
                            + me.appIcon
                            + '" alt="app logo" title="' + me.appVersion + '"></td>'
                            + '<td width="100%"><h1>' + me.appName + '</h1></td>'
                            + '<td><a href="http://digitalstrom.org/" alt="'
                            + _("visit digitalSTROM.org")
                            + '" target="_blank"><img id="logo" src="images/dss/ds_logo.png"'
                            + 'alt="dS-Logo"></a></td>'
                            + '</tr></table>'
                }, {
                    id: 'app-content',
                    region: 'center',
                    border: 0,
                    margins: '0 20 0 20',
                    layout: 'fit',
                    items: me.getContent()
                }, {
                    id: 'app-help-content',
                    region: 'south',
                    title: _('Help'),
                    collapsible: true,
                    collapsed: true,
                    split: true, // enable resizing
                    height: '50%',
                    minHeight: 200,
                    margins: '0 20 20 20',
                    padding: '5 5 0 5',
                    closeAction: 'hide',
                    autoScroll: true,
                    layout: 'fit',
                    items: me.getHelp()
                }]
            }]
        });
        me.callParent(arguments);
    },

    /**
     * Initialize the dynamic parts of the page
     * after the initial rendering is done
     */
    initPage: function() {
        // Remove the 'loading ...' message from the html
        var start = Ext.get('start');
        if (start) {
            start.remove();
        }
    },

    ///
    /// DSS helper functions
    ///

    dssPropertyError: function(err) {
        Ext.Msg.alert(_('Error while fetching property'), err);
    },

    jsonAjaxFailure: function (err) {
        Ext.Msg.alert(_('Error'), _('Could not send command:') + '\n' + err);
    }
});

