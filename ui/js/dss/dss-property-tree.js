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

Ext.namespace('DSS.property');

/**
 * @class DSS.property.TreeModel
 * @extends Ext.data.Model
 * The property tree model of DSS' property tree
 */
Ext.define('DSS.property.TreeModel', {

    extend: 'Ext.data.Model',

    idProperty: 'path',
    fields: [
        { name: 'path', type: 'string' }, // field that is determined and set on fetch
        'name',
        'type',
        { name: 'text', type: 'string', persist: false }, // default text field
        { name: 'hasValue', type: 'boolean', defaultValue: false, persist: false },
        'value',
        // Ugly but it doesn't work with associations
        { name: 'flags_loaded', type: 'boolean', defaultValue: false, persist: false },
        { name: 'flag_archive', type: 'boolean', defaultValue: false },
        { name: 'flag_readable', type: 'boolean', defaultValue: true },
        { name: 'flag_writable', type: 'boolean', defaultValue: true }
    ],
    loadFlags: function(callback) {
        var property = Ext.create('DSS.json.Property');
        var me = this;
        me.set('loaded', false);
        me.set('loading', true);
        property.getFlags(this.data.path, function(flags) {
            me.data.flag_archive = (flags.ARCHIVE === true);
            me.data.flag_readable = (flags.READABLE === true);
            me.data.flag_writeable = (flags.WRITEABLE === true);
            me.data.flags_loaded = true;
            me.set('loaded', true);
            me.set('loading', false);
            // me.fireEvent('datachanged'); // Flickers too much
            callback.apply(me);
        });
    },
    // hasMany: { name: 'flags', model: 'DSS.property.FlagModel' },
    proxy: {
        type: 'ajax',
        actionMethods: {
            read: 'GET',
            create: 'GET',
            update: 'GET',
            destroy: 'GET'
        },
        url: '/json/property/getChildren', // set by listeners at every op
        reader: {
            type: 'json',
            root: 'result',
            successProperty: 'ok'
        },
        writer: {
            type: 'json',
            root: 'result',
            successProperty: 'ok'
        }
    }
});

/*
// Store associations don't really work out well for now.
// Maybe with a future version of ExtJS
Ext.define('DSS.property.FlagModel', {

    extend: 'Ext.data.Model',

    constructor: function(config) {
        this.data.path = config.path
        this.callParent(arguments);
    },

    idProperty: 'path',
    fields: [
        { name: 'path', type: 'string', persist: false }, // virtual field that is set on fetch
        { name: 'loaded', type: 'boolean', defaultValue: false, persist: false },
        { name: 'archive', type: 'boolean', mapping: 'ARCHIVE', defaultValue: false },
        { name: 'readable', type: 'boolean', mapping: 'READABLE', defaultValue: true },
        { name: 'writable', type: 'boolean', mapping: 'WRITEABLE', defaultValue: true },
    ],
    proxy: {
        type: 'ajax',
        url: '/json/property/getFlags',
        reader: {
            type: 'json',
            root: 'result',
            successProperty: 'ok'
        },
        writer: {
            type: 'json',
            root: 'result',
            nameProperty: 'mapping',
            successProperty: 'ok'
        }
    }
});
*/

/**
 * @class DSS.property.TreeStore
 * @extends Ext.data.TreeStore
 * TreeStore that presents the property tree
 * and hides the json connection to the dSS.
 */
Ext.define('DSS.property.TreeStore', {

    extend: 'Ext.data.TreeStore',

    config: {
        // autoLoad: true,
        // autoSync: true,
        model: 'DSS.property.TreeModel',
        nodeParam: 'path',
        root: {
            expanded: false,
            path: '/',
            name: '/',
            type: 'none'
        }
    },

    listeners: {
        beforeappend: function(node, newnode, options) {
            if (!node) {
                // initial root node
                newnode.data.text = newnode.data.name;
                return true;
            }

            var parentId = node.getId();
            newnode.data.parentId = parentId;
            newnode.data.depth = node.getDepth() + 1;
            if (node.data.type !== 'none') {
                // newnode is a leaf -> make this node a leaf and set value
                node.data.expandable = false;
                node.data.leaf = true;
                node.data.value = newnode.data.value;
                return false;
            } else {
                // newnode is a container
                newnode.data.path = (parentId == '/' ? '' : parentId) + '/' + newnode.data.name;
                newnode.data.text = newnode.data.name;
                if (newnode.data.type !== 'none') {
                    // The value itself will be set be the child
                    newnode.data.hasValue = true;
                    newnode.data.iconCls = 'x-tree-icon-leaf';
                }
            }
            return true;
        },
        append: function(node, newnode, index, options) {
            if (newnode.data.type !== 'none') {
                // load leaf nodes' values
                newnode.expand();
                newnode.loadFlags(function() {
                    if (newnode.data.flag_archive) {
                        if (newnode.data.flag_writeable) {
                            newnode.data.iconCls = 'x-tree-icon-leaf-a';
                        } else {
                            newnode.data.iconCls = 'x-tree-icon-leaf-a-r';
                        }
                    } else if (!newnode.data.flag_writeable) {
                        newnode.data.iconCls = 'x-tree-icon-leaf-r';
                    }
                });
            }
        },
        beforeload: function(store, op, args) {//beforeappend: function(node, options) {
            this.proxy.extraParams = {};
            var type = op.node.get('type');
            if (type == 'none') {
                this.proxy.url = '/json/property/getChildren';
            } else if (type == 'string') {
                this.proxy.url = '/json/property/getString';
            } else if (type == 'integer') {
                this.proxy.url = '/json/property/getInteger';
            } else if (type == 'boolean') {
                this.proxy.url = '/json/property/getBoolean';
            } else {
                // error;
                return false;
            }
            return true;
        },
        beforeremove: function(node, delnode, options) {
            this.proxy.url = '/json/property/remove';
            this.proxy.extraParams = { path: delnode.getId() };
            return true;
        }
    },

    constructor: function(config) {
        this.initConfig(config);
        if (config.root) {
            this.config.root.apply(config.root);
        }
        this.callParent(arguments);
    }

});

