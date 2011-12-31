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

Ext.namespace('DSS.apartment');
//Ext.namespace('DSS.circuit');

/**
 * A Store representing the apartment structure
 * Note that there is always exactly one record with id 0
 * To access the rooms use this.getAt(0).zones()
 */
Ext.define('DSS.apartment.ApartmentModel', {
    extend: 'Ext.data.Model',
    fields: [
        { name: 'id', type: 'integer', persist: false, defaultValue: 0 }
    ],
    hasMany: { name: 'zones', model: 'DSS.apartment.ZoneModel' },
    proxy: {
        type: 'ajax',
        actionMethods: { read: 'GET' },
        url: '/json/apartment/getStructure',
        pageParam: undefined,
        limitParam: undefined,
        startParam: undefined,
        reader: {
            type: 'json',
            root: 'result.apartment',
            successProperty: 'ok'
        }
    }
});

/**
 * A model for zones (rooms) in an apartment
 */
Ext.define('DSS.apartment.ZoneModel', {
    extend: 'Ext.data.Model',
    /**
     * @constructor
     * Creates new GroupModel instance.
     * @param {Object} data An object containing this model's fields, and their associated values
     * @param {Number} id (optional) Unique ID to assign to this model instance
     */
    constructor: function(data, iid) {
        var id = iid || data.id;

        if (id === 0) {
            data.text = _('All rooms');
        } else if (!data.name) {
            data.text = _('Room') + ' #' + id;
        } else {
            data.text = data.name;
        }
        this.callParent(arguments);
    },
    fields: [
        { name: 'id', type: 'integer' },
        'name',
        'text', // virtual
        { name: 'isPresent', type: 'boolean' }
    ],
    hasMany: [
        { name: 'devices', model: 'DSS.apartment.DeviceModel' },
        { name: 'groups', model: 'DSS.apartment.GroupModel' }
    ]
});

/**
 * A model for devices in a group (color) or zone
 */
Ext.define('DSS.apartment.DeviceModel', {
    extend: 'Ext.data.Model',
    /**
     * @constructor
     * Creates new GroupModel instance.
     * @param {Object} data An object containing this model's fields, and their associated values
     * @param {Number} id (optional) Unique ID to assign to this model instance
     */
    constructor: function(data, iid) {
        var me = this,
            id = iid || data.id;

        if (id !== undefined) {
            data.text = data.name || DSS.apartment.DeviceModel.formatId(data.id);
            me.callParent(arguments);
            var dm = DSS.apartment.DeviceModel,
                gm = DSS.apartment.GroupModel,
                grp = dm.getGroup(data.functionID), // Doesn't work for jokers
                prd = dm.getProductType(data.productID),
                i = 0,
                group,
                mdl;

            if (!data.isPresent) {
                me.set('icon', 'coupler/offline.png');
            } else {
                mdl = 'coupler/';
                if (data.groups) {
                    for (i = 0; i < data.groups.length; ++i) {
                        group = parseInt(data.groups[i], 10);
                        if (group === 8) { // Joker is group #8
                            me.set('isJoker', true);
                            if (prd !== 2) { // TODO: remove once we got joker cord icons
                                mdl += 'joker/';
                            }
                        } else {
                            grp = group;
                        }
                    }
                }
                switch(prd) {
                    case 0: mdl += 'coupler_m/'; break;
                    case 1: mdl += 'button_m/'; break;
                    case 2: mdl += 'cord_m/'; break;
                    case 3: mdl += 'coupler_l/'; break;
                    default: mdl += 'coupler_m/';
                }
                me.set('icon', mdl + gm.getColor(grp) + '.png');
                me.commit();
            }
        } else {
            this.callParent(arguments);
        }
    },
    statics: {
        /**
         * Format a dsId to the last two bytes (8chars)
         * @param id {String} The dsId to format
         * @return {String} The formatted dsId
         */
        formatId: function(id) {
            return Ext.util.Format.substr(id, id.length - 8, 8);
        },
        /**
         * Gets the group from a device's function id
         * @param fid {Number} A device's function id
         * @return {Number} The group id the function id belongs to.
         */
        getGroup: function(fid) {
            // http://developer.digitalstrom.org/redmine/projects/dss/wiki/Function_IDs
            return (fid & 0xf000) >> 12; // upper 4 bits
        },
        /**
         * Gets the button type from a device's function id
         * Read the dS wiki for more information:
         * http://developer.digitalstrom.org/redmine/projects/dss/wiki/Function_IDs
         * @param fid {Number} A device's function id
         * @return {Number} 1..5: buttons with diverse n-way configurations, 6: ?, 7: No buttons
         */
        getButtonType: function(fid) {
            return (fid & 0x0003); // lower 2 bits
        },
        /**
         * Gets whether the first button is a local-button
         * @param fid {Number} A device's function id
         * @return {Boolean} Boolean value
         */
        firstButtonIsLocal: function(fid) {
            return ((fid & 0x0004) > 0); // bit 3
        },
        /**
         * Gets the output type from a device's function id
         * @param fid {Number} A device's function id
         * @return {Number} 0: no output, 1: switch, 2: dimmer, 3: undefined
         */
        getOutputType: function(fid) {
            return (fid & 0x0030) >> 4; // bits 4-5
        },
        /**
         * Get the product type by product id
         * @param pid {Number} A device's product id
         * @return {Number} The device type
         *      0: Klemme M (KM), 1: Tasterklemme M (TKM),
         *      2: Schnurdimmer M (SDM), 3: Klemme L (KL),
         */
        getProductType: function(pid) {
            // bits 0-9: device id, bits 10-15: device type
            return (pid & 0xfc00) >> 10; //bits 10-15
        }
    },
    fields: [
        'id',
        'name',
        'text', // virtual
        'icon', // virtual
        { name: 'isJoker', type: 'boolean', defaultValue: false }, // virtual
        { name: 'functionID', type: 'integer' },
        { name: 'productRevision', type: 'integer' },
        { name: 'productID', type: 'integer' },
        'meterDSID',
        { name: 'busID', type: 'integer' },
        { name: 'isPresent', type: 'boolean' },
        { name: 'lastDiscovered', type: 'date', dateFormat: 'Y-m-d H:i:s' },
        { name: 'firstSeen', type: 'date', dateFormat: 'Y-m-d H:i:s' },
        { name: 'on', type: 'boolean' },
        { name: 'locked', type: 'boolean' },
        { name: 'buttonID', type: 'integer' },
        { name: 'outputMode', type: 'integer' },
        { name: 'groups', type: 'auto' } // String[] (actually ints, but need to be parseInt'd)
    ]
});

/**
 * A model for groups (colors) with linked devices in a zone.
 * Use DSS.apartment.SimpleGroupModel for an unlinked model
 */
Ext.define('DSS.apartment.GroupModel', {
    extend: 'Ext.data.Model',
    /**
     * @constructor
     * Creates new GroupModel instance.
     * @param {Object} data An object containing this model's fields, and their associated values
     * @param {Number} id (optional) Unique ID to assign to this model instance
     */
    constructor: function(data, iid) {
        var id = iid || data.id;
        data.icon = DSS.apartment.GroupModel.getIcon(id);
        data.text = DSS.apartment.GroupModel.getText(id);
        this.callParent(arguments);
    },
    statics: {
        /**
         * Gets the coupler icon associated with a group id
         * @param id {Number} The group id (ranging from 0-10)
         * @return {String} The associated icon or null if outside range
         */
        getIcon: function(id) {
            if (id < 0 || id > 10) {
                return null; // invalid
            }
            return 'coupler/colors/'+ DSS.apartment.GroupModel.getColor(id) + '.png';
        },
        /**
         * Gets the readable description of a group id
         * @param idx {Number} The group id (ranging from 0-10)
         * @return {String} The associated description
         */
        getText: function(id) {
            if (isNaN(id)) {
                return _('error');
            }
            switch(id) {
                case 0: return _('All types');
                case 1: return _('Light');
                case 2: return _('Shadow');
                case 3: return _('Climate');
                case 4: return _('Audio');
                case 5: return _('Video');
                case 6: return _('Security');
                case 7: return _('Access');
                case 8: return _('Joker');
                case 9: return _('White');
                case 10: return _('Displays');
            }
        },
        /**
         * Gets the color associated with a group id
         * @param idx {Number} The group id (ranging from 0-10)
         * @return {String} The associated color
         */
        getColor: function(idx) {
            var colors = [
                'rainbow', 'yellow', 'grey', 'blue', 'cyan',
                'magenta', 'red', 'green', 'black', 'white'
            ];
            return colors[idx];
        }
    },
    fields: [
        { name: 'id', type: 'integer' },
        'name', // one of: broadcast, yellow, grey, blue, cyan, magenta,
                //         red, green, black, white, display
        'icon', // virtual
        'text', // virtual
        { name: 'isPresent', type: 'boolean' }
    ],
    hasMany: { name: 'devices', model: 'DSS.apartment.DeviceModel' }
});

/**
 * A store for holding the aparment structure
 */
Ext.define('DSS.apartment.ApartmentStore', {
    extend: 'Ext.data.Store',
    model: 'DSS.apartment.ApartmentModel'
});

/**
 * A model for scenes
 */
Ext.define('DSS.apartment.SceneModel', {
    extend: 'Ext.data.Model',
    fields: [
        { name: 'id', type: 'integer' },
        { name: 'group', type: 'integer', defaultValue: -1 },
        { name: 'pos', type: 'integer', defaultvalue: 65535 },
        'scene',
        'text',
        { name: 'customName', type: 'string', persist: false },
        'icon',
        'tooltip'
    ]
});

/**
 * A store that uses a DSS.apartment.SceneModel
 * it allows to load the custom names of a scene, given
 * the zone and group model
 */
Ext.define('DSS.apartment.SceneStore', {
    extend: 'Ext.data.Store',
    model: 'DSS.apartment.SceneModel',
    statics: {
        /** @private */
        customNameCache: null,

        /**
         * Clears the scene name cache, causing the next loadCustomNames() call
         * to re issue a request to the dSS.
         */
        clearSceneNameCache: function() {
            DSS.apartment.SceneStore.customNameCache = null;
        },

        /**
         * Pre loads the custom name cache resulting in a fully synchronous
         * loadCustomNames until the is cleared
         * @param callback {Function} (optional) Callback when loaded
         */
        preloadCustomNameCache: function(callback) {
            var cache = DSS.apartment.SceneStore.customNameCache,
                prop = null;

            if (cache !== null) {
                if (Ext.isFunction(callback)) {
                    Ext.callback(callback);
                }
                return;
            }
            cache = DSS.apartment.SceneStore.customNameCache = {};
            prop = Ext.create('DSS.json.Property');
            prop.query(
                '/apartment/zones/*(ZoneID,scenes)/groups/*(group)/scenes/*(scene,name)',
                function(response) {
                    if (response && response.zones) {
                        Ext.each(response.zones, function(zone) {
                            var zoneId = zone.ZoneID;
                            Ext.each(zone.groups, function(group) {
                                var groupId = group.group;
                                Ext.each(group.scenes, function(scene) {
                                    var tmp = cache;
                                    if (!tmp[zoneId]) { tmp[zoneId] = {}; }
                                    tmp = tmp[zoneId];
                                    if (!tmp[groupId]) { tmp[groupId] = {}; }
                                    tmp = tmp[groupId];
                                    tmp[scene.scene] = scene.name;
                                });
                            });
                        });
                    }
                    if (Ext.isFunction(callback)) {
                        Ext.callback(callback);
                    }
                }
            );
        }
    },

    /**
     * Load the custom scene names given a zone and group
     * Note that the results of the query will be cached to speed up further calls.
     * @param zone {Object} The zone as DSS.apartment.ZoneModel object
     * @param group {Object} The group as DSS.apartment.GroupModel object
     * @param callback {Function} (optional) Callback executed when the name loading is completed
     */
    loadCustomNames: function(zone, group, callback) {
        var me = this,
            zoneId = zone.getId(),
            groupId = group.getId(),
            cache = DSS.apartment.SceneStore.customNameCache,
            loadFromCache = function() {
                var z = cache[zoneId],
                    g,
                    s, scn;
                if (z && z[groupId]) {
                    g = z[groupId];
                    for (s in g) {
                        scn = me.getById(parseInt(s, 10));
                        if (scn) {
                            scn.set('customName', g[s]);
                            scn.set('text', scn.get('text') + ' - ' + g[s]);
                            scn.commit();
                        }
                    }
                }
                if (Ext.isFunction(callback)) {
                    Ext.callback(callback);
                }
            };

        if (cache === null) {
            DSS.apartment.SceneStore.preloadCustomNameCache(loadFromCache);
        } else {
            loadFromCache();
        }
    },

    /**
     * Create a deep copy of this store
     */
    clone: function() {
        var clone = Ext.create('DSS.apartment.SceneStore'),
            src = (
                // if the whole store if filtered (=snapshot'd)
                this.snapshot !== undefined
                    ? this.snapshot
                    : this
            ),
            data = [];
        Ext.each(src.data.items, function(i) {
            data.push(i.data);
        });
        clone.loadData(data);
        return clone;
    }
});

/**
 * Helper singleton class for apartment related stores
 */
Ext.define('DSS.apartment.Helper', {
    singleton: true,
    uses: [
        'Ext.data.Store',
        'DSS.apartment.SimpleGroupModel',
        'DSS.apartment.SceneModel'
    ],

    /**
     * Gets a store with all groups
     * @return {Object} A store of DSS.apartment.GroupModel type
     */
    getGroupStore: function() {
        return Ext.create('Ext.data.Store', {
            model: 'DSS.apartment.GroupModel',
            data: [
                { id: 0 },
                { id: 1 },
                { id: 2 },
                { id: 3 },
                { id: 4 },
                { id: 5 },
                { id: 6 },
                { id: 7 },
                { id: 8 },
                { id: 9 },
                { id: 10 }
            ]
        });
    },

    defaultSceneStore: null,
    /**
     * Returns the default scene store singleton
     * @return {Object} The unfiltered scene store
     */
    getDefaultSceneStore: function() {
        if (this.defaultSceneStore !== null) {
            this.defaultSceneStore.clearFilter();
            return this.defaultSceneStore;
        }

        var tt0 = _('Off') + ' = ' + _('Activity {0}') + '(' + _('Button activity') + ' {1})';
        var tt1 = _('Room button') + ' ' + _('activity {0}');
        var tt2 = tt1 + ' / ' + _('Device button') + ' and ' + _('area button') + ' ' + _('activity {0}').replace('{0}', '{1}'); // replace hack to have only one translation
        this.defaultSceneStore = Ext.create('DSS.apartment.SceneStore', {
            storeId: 'DSS.apartment.Helper.DefaultSceneStore',
            // model: 'DSS.apartment.SceneModel',
            // Scene IDs from http://developer.digitalstrom.org/redmine/projects/dss/wiki/Scene_table
            // Property.query('/apartment/zones/*(ZoneID,scenes)/groups/*(group)/scenes/*(scene,name)');
            data: [
                { id: 0, group: 0, pos: 0, text: _('Off'), icon: 'lightbulb_off.png', tooltip: Ext.String.format(tt0, '0', '0-4') },
                { id: 5, group: 0, pos: 1, text: Ext.String.format(_('Activity {0}'), '1'), icon: 'lightbulb.png', tooltip: Ext.String.format(tt1, '0-4') },
                { id: 17, group: 0, pos: 2, text: Ext.String.format(_('Activity {0}'), '2'), icon: 'lightbulb.png', tooltip: Ext.String.format(tt2, '0-4', '2-4') },
                { id: 18, group: 0, pos: 3, text: Ext.String.format(_('Activity {0}'), '3'), icon: 'lightbulb.png', tooltip: Ext.String.format(tt2, '0-4', '2-4') },
                { id: 19, group: 0, pos: 4, text: Ext.String.format(_('Activity {0}'), '4'), icon: 'lightbulb.png', tooltip: Ext.String.format(tt2, '0-4', '2-4') },

                { id: 1, group: 1, pos: 0, text: _('Area') + ' 1 ' + _('off'), icon: 'lightbulb_off.png', tooltip: _('Area button') + ' 1' },
                { id: 6, group: 1, pos: 1, text: _('Area') + ' 1 ' + _('on'), icon: 'lightbulb.png', tooltip: _('Area button') + ' 1' },
                { id: 2, group: 1, pos: 2, text: _('Area') + ' 2 ' + _('off'), icon: 'lightbulb_off.png', tooltip: _('Area button') + ' 2'},
                { id: 7, group: 1, pos: 3, text: _('Area') + ' 2 ' + _('on'), icon: 'lightbulb.png', tooltip: _('Area button') + ' 2' },
                { id: 3, group: 1, pos: 4, text: _('Area') + ' 3 ' + _('off'), icon: 'lightbulb_off.png', tooltip: _('Area button') + ' 3' },
                { id: 8, group: 1, pos: 5, text: _('Area') + ' 3 ' + _('on'), icon: 'lightbulb.png', tooltip: _('Area button') + ' 3' },
                { id: 4, group: 1, pos: 6, text: _('Area') + ' 4 ' + _('off'), icon: 'lightbulb_off.png', tooltip: _('Area button') + ' 4' },
                { id: 9, group: 1, pos: 7, text: _('Area') + ' 4 ' + _('on'), icon: 'lightbulb.png', tooltip: _('Area button') + ' 4' },

                { id: 32, group: 2, pos: 2, text: _('Off') + ' (' + Ext.String.format(_('Activity {0}'), '10') + ')', icon: 'lightbulb_off.png', tooltip: Ext.String.format(tt0, '10', '10-14') },
                { id: 33, group: 2, pos: 2, text: Ext.String.format(_('Activity {0}'), '11'), icon: 'lightbulb.png', tooltip: Ext.String.format(tt1, '10-14') },
                { id: 20, group: 2, pos: 2, text: Ext.String.format(_('Activity {0}'), '12'), icon: 'lightbulb.png', tooltip: Ext.String.format(tt2, '10-14', '12-14') },
                { id: 21, group: 2, pos: 3, text: Ext.String.format(_('Activity {0}'), '13'), icon: 'lightbulb.png', tooltip: Ext.String.format(tt2, '10-14', '12-14') },
                { id: 22, group: 2, pos: 4, text: Ext.String.format(_('Activity {0}'), '14'), icon: 'lightbulb.png', tooltip: Ext.String.format(tt2, '10-14', '12-14') },

                { id: 34, group: 3, pos: 2, text: _('Off') + ' (' + Ext.String.format(_('Activity {0}'), '20') + ')', icon: 'lightbulb_off.png', tooltip: Ext.String.format(tt0, '20', '20-24') },
                { id: 35, group: 3, pos: 2, text: Ext.String.format(_('Activity {0}'), '21'), icon: 'lightbulb.png', tooltip: Ext.String.format(tt1, '20-24') },
                { id: 23, group: 3, pos: 2, text: Ext.String.format(_('Activity {0}'), '22'), icon: 'lightbulb.png', tooltip: Ext.String.format(tt2, '20-24', '22-24') },
                { id: 24, group: 3, pos: 3, text: Ext.String.format(_('Activity {0}'), '23'), icon: 'lightbulb.png', tooltip: Ext.String.format(tt2, '20-24', '22-24') },
                { id: 25, group: 3, pos: 4, text: Ext.String.format(_('Activity {0}'), '24'), icon: 'lightbulb.png', tooltip: Ext.String.format(tt2, '20-24', '22-24') },

                { id: 36, group: 4, pos: 2, text: _('Off') + ' (' + Ext.String.format(_('Activity {0}'), '30') + ')', icon: 'lightbulb_off.png', tooltip: Ext.String.format(tt0, '30', '30-34') },
                { id: 37, group: 4, pos: 2, text: Ext.String.format(_('Activity {0}'), '31'), icon: 'lightbulb.png', tooltip: Ext.String.format(tt1, '30-34') },
                { id: 26, group: 4, pos: 2, text: Ext.String.format(_('Activity {0}'), '32'), icon: 'lightbulb.png', tooltip: Ext.String.format(tt2, '30-34', '32-34') },
                { id: 27, group: 4, pos: 3, text: Ext.String.format(_('Activity {0}'), '33'), icon: 'lightbulb.png', tooltip: Ext.String.format(tt2, '30-34', '32-34') },
                { id: 28, group: 4, pos: 4, text: Ext.String.format(_('Activity {0}'), '34'), icon: 'lightbulb.png', tooltip: Ext.String.format(tt2, '30-34', '32-34') },

                { id: 38, group: 5, pos: 2, text: _('Off') + ' (' + Ext.String.format(_('Activity {0}'), '40') + ')', icon: 'lightbulb_off.png', tooltip: Ext.String.format(tt0, '40', '40-44') },
                { id: 39, group: 5, pos: 2, text: Ext.String.format(_('Activity {0}'), '41'), icon: 'lightbulb.png', tooltip: Ext.String.format(tt1, '40-44') },
                { id: 29, group: 5, pos: 2, text: Ext.String.format(_('Activity {0}'), '42'), icon: 'lightbulb.png', tooltip: Ext.String.format(tt2, '40-44', '42-44') },
                { id: 30, group: 5, pos: 3, text: Ext.String.format(_('Activity {0}'), '43'), icon: 'lightbulb.png', tooltip: Ext.String.format(tt2, '40-44', '42-44') },
                { id: 31, group: 5, pos: 4, text: Ext.String.format(_('Activity {0}'), '44'), icon: 'lightbulb.png', tooltip: Ext.String.format(tt2, '40-44', '42-44') },

                { id: 67, group: 6, scene: 'STANDBY', text: _('Standby'), icon: 'pause.png' },
                { id: 64, group: 6, scene: 'AUTO_STANDBY', text: _('Auto Standby'), icon: 'pause.png' },
                { id: 68, group: 6, scene: 'DEEP_OFF', text: _('Deep Off'), icon: 'stop.png' },
                { id: 69, group: 6, scene: 'SLEEPING', text: _('Sleeping'), icon: 'offline.png' },
                { id: 70, group: 6, scene: 'WAKE_UP', text: _('Wake up'), icon: 'clock_red.png' },
                { id: 72, group: 6, scene: 'ABSENT', text: _('Absent'), icon: 'door_out.png' },
                { id: 71, group: 6, scene: 'PRESENT', text: _('Present'), icon: 'door_in.png' },
                { id: 73, group: 6, scene: 'SIG_BELL', text: _('Bell'), icon: 'bell.png' },
                { id: 65, group: 6, scene: 'PANIC', text: _('Panic'), icon: 'lightning.png' }

                /* // Only for internal use
                { id: 11, group: 2, pos: 0, scene: 'DEC', text: _('Dim down') },
                { id: 12, group: 2, pos: 1, scene: 'INC', text: _('Dim up') },
                { id: 13, group: 2, pos: 2, scene: 'MIN', text: _('Off') },
                { id: 14, group: 2, pos: 3, scene: 'MAX', text: _('On') },
                { id: 15, group: 2, pos: 4, scene: 'STOP', text: _('Stop') },
                { id: 74, group: 6, scene: 'SIG_ALARM', text: _('Alarm') },
                */
            ]
        });
        this.defaultSceneStore.group('group');
        return this.defaultSceneStore;
    }, // getDefaultSceneStore

    /**
     * Gets the scenes reachable from a given zone asynchronously.
     * The base store is a cloned DSS.apartment.Helper.defaultSceneStore
     * Filtered by the reachable scenes.
     * Note that group (colors) are currently not supported (release 1.0.4)
     * @param zoneId {Number} The zone-id to query for reachable scenes.
     * @param callback {Function} callback with following arguments:
     *          {Boolean} success: Sucess of getting reachable scenes,
     *          {Object} reachableScenesStore: A filtered scene store (Ext.data.Store),
     *          {Function} filterFn: The applied filter function
     * @param createNewStore {Boolean} True to disable the use of the common store i.e. create a clone
     *     set this if you need several instances that you want to filter independently
     */
    createReachableSceneStore: function(zoneId, callback, createNewStore) {
        var me = DSS.apartment.Helper;

        DSS.ZoneHelper.getReachableScenes(zoneId, function(success, scenes) {
            if (! success) {
                callback(false);
                return;
            }
            var defStore = me.getDefaultSceneStore();
            var store = (createNewStore ? defStore.clone() : defStore);
            var filterFn = function(record, id) {
                return Ext.Array.contains(scenes, record.getId());
            };
            store.filterBy(filterFn);
            callback(true, store, filterFn);
        });
    }
});

