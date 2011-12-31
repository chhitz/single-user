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

Ext.namespace('DSS.component');

/**
 * Base class for DSS template components
 */
Ext.define('DSS.component.Base', {
    extend: 'Ext.container.Container',
    layout: 'anchor'
});

/** Possible target types */
Ext.define('DSS.component.TargetType', {
    statics: {
        ZONE: 'zone',
        DEVICE: 'dev'
    }
});
/** Possible action types */
Ext.define('DSS.component.ActionType', {
    statics: {
        ACTIVITY: 'activity',
        BLINK: 'blink',
        OUTPUT: 'output'
    }
});

/**
 * A selector that shows every day of the week as button
 */
Ext.define('DSS.component.WeekdaySelection', {
    alias: ['widget.dssWeekdaySelection'],
    extend: 'Ext.container.ButtonGroup',
    constructor: function(config) {
        this.initConfig(config);
        this.callParent(arguments);
    },
    config: {
        allowEmpty: false,
        width: 206
    },
    defaults: {
        enableToggle: true
    },
    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    items: [
        { itemId: 'mon', text: _('MO') },
        { itemId: 'tue', text: _('TU') },
        { itemId: 'wed', text: _('WE') },
        { itemId: 'thu', text: _('TH') },
        { itemId: 'fri', text: _('FR') },
        { itemId: 'sat', text: _('SA') },
        { itemId: 'sun', text: _('SU') }
    ],

    /**
     * Reset all values to default (unset) or specified values
     * Note: this does not trigger the toggle event
     * @param values (optional) values to reset to - default if unset
     */
    resetComponent: function(values) {
        var i;

        this.clearError();

        if (values === undefined) {
            for (i = 0; i < this.days.length; ++i) {
                this.getComponent(this.days[i]).toggle(false, true);
            }
        } else {
            for (i = 0; i < this.days.length; ++i) {
                this.getComponent(this.days[i]).toggle(
                    Ext.Array.contains(values, i),
                    true
                );
            }
        }
    },

    /**
     * Returns whether this form's values are in a valid state
     * @return {Boolean} True if valid, false otherwise
     */
    isValid: function() {
        return this.allowEmpty || this.getValues().length > 0;
    },

    clearError: function() {
        this.getEl().setStyle({borderColor:undefined});
    },

    validate: function() {
        if (this.isValid()) {
            this.getEl().setStyle({borderColor:undefined});
            return true;
        }
        this.getEl().setStyle({borderColor:'red'});
    },

    /**
     * Returns the currently pressed days
     * @return {[int]} Array of integers: 0=monday, ..., 6=sunday
     */
    getValues: function() {
        var pressed = [],
            i;
        for (i = 0; i < this.days.length; ++i) {
            if (this.getComponent(this.days[i]).pressed) {
                pressed.push(i);
            }
        }
        return pressed;
    }
});

/**
 * Recurrence Selection Panel
 */
Ext.define('DSS.component.RecurrenceSelection', {
    alias: ['widget.dssRecurrenceSelection'],
    extend: 'DSS.component.Base',
    uses: ['DSS.component.WeekdaySelection'],

    config: {
        /**
         * {Boolean} Display daytime selections, allowing the selection of daytime based
         * events like sunrise and sunset +/- a delay.
         */
        enableDaytime: true
    },

    constructor: function(config) {
        this.initConfig(config);
        this.callParent(arguments);
    },

    /** @private */
    recurring: true,
    /** @private */
    weekdaySelection: null,
    /** @private */
    dateField: null,
    /** @private */
    isAbsolute: true,
    /** @private */
    timeField: null,
    /** @private */
    prepostField: null,

    initComponent: function() {
        var me = this,
            timeContainerItems;

        me.weekdaySelection = Ext.create('DSS.component.WeekdaySelection');
        me.dateField = Ext.create('Ext.form.field.Date', {
            allowBlank: false,
            hidden: true,
            name: 'onetimeDate',
            format: 'd.m.Y',
            value: new Date()
        });

        me.prepostField = Ext.create('Ext.button.Cycle', {
            margin: '0 0 0 20',
            hidden: true,
            itemId: 'cyc-prepost',
            menu: {
                items: [{
                    checked: true,
                    itemId: 'chk-pre',
                    text: _('before')
                }, {
                    itemId: 'chk-post',
                    text: _('after')
                }]
            },
            showText: true,
            width: 120
        });

        me.timeField = Ext.create('Ext.container.Container', {
            defaultType: 'numberfield',
            defaults: {
                allowBlank: false,
                allowDecimals: false,
                width: 50
            },
            items: [{
                itemId: 'hours',
                value: 12,
                minValue: 0,
                maxValue: 23
            }, {
                itemId: 'minutes',
                value: 0,
                minValue: 0,
                maxValue: 59
            }, {
                itemId: 'seconds',
                value: 0,
                minValue: 0,
                maxValue: 59
            }, {
                xtype: 'label',
                itemId: 'lblHMS',
                text: '(' + _('hh:mm:ss') + ')',
                align: 'middle',
                margin: '5 0 0 10'
            },
            me.prepostField
            ],
            layout: 'column',
            width: 350
        });

        if (this.enableDaytime) {
            timeContainerItems = [
                {
                    xtype: 'cycle',
                    itemId: 'cyc-daytime',
                    listeners: {
                        change: function(cycle, item, options) {
                             me.setAbsoluteTime(item.itemId == 'chk-time');
                        }
                    },
                    menu: {
                        items: [{
                            checked: true,
                            itemId: 'chk-time',
                            text: _('Time of day')
                        }, {
                            itemId: 'chk-sunrise',
                            text: _('Sunrise')
                        }, {
                            itemId: 'chk-sunset',
                            text: _('Sunset')
                        }]
                    },
                    margin: '0 20 0 0',
                    showText: true,
                    width: 180
                },
                me.timeField
            ];

        } else {
            // not using daytime
            timeContainerItems = [me.timeField];
        }

        Ext.apply(me, {
            //layout: 'anchor',
            items: [{
                    xtype: 'fieldcontainer',
                    itemId: 'time',
                    fieldLabel: _('Time'),
                    layout: 'column',
                    items: timeContainerItems
                }, {
                    itemId: 'days',
                    xtype: 'fieldcontainer',
                    fieldLabel: _('Recurrence'),
                    layout: 'column',
                    items: [
                        {
                            xtype: 'cycle',
                            itemId: 'cyc-recurrence',
                            listeners: {
                                change: function(cycle, item, options) {
                                     me.setRecurring(item.itemId == 'chk-weekly');
                                }
                            },
                            menu: {
                                items: [{
                                    checked: true,
                                    itemId: 'chk-weekly',
                                    text: _('Weekly event')
                                }, {
                                    text: _('Specific dates')
                                }]
                            },
                            showText: true,
                            width: 180
                        }, {
                            xtype: 'container',
                            columnWidth: 0.5,
                            itemId: 'recurrenceSelection',
                            items: [
                                me.weekdaySelection,
                                me.dateField
                            ],
                            padding: '0 0 0 20'
                        }
                    ]
                }
            ]
        });
        me.callParent(arguments);
    },

    /**
     * Switch to change between displaying of recurring or one time event
     * @param recurring {Boolean} true: set recurring event, false: one time event
     */
    setRecurring: function(recurring) {
        var me = this;
        if (me.recurring == recurring) {
            return;
        }

        if (recurring) {
            me.dateField.hide();
            me.weekdaySelection.show();
        } else {
            me.weekdaySelection.hide();
            me.dateField.show();
        }
        me.recurring = recurring;
    },

    /**
     * Switch to change between displaying of absolute or relatively timed event
     * @param isAbsolute {Boolean} true: set absolute time, false: one time event
     */
    setAbsoluteTime: function(isAbsolute) {
        var me = this,
            sec;
        if (me.isAbsolute == isAbsolute)  {
            return;
        }
        sec = me.timeField.getComponent('seconds');
        if (isAbsolute) {
            me.prepostField.hide();
            me.timeField.getComponent('hours').setValue(12);
            me.timeField.getComponent('minutes').setValue(0);
            me.timeField.getComponent('lblHMS').setText('(' + _('hh:mm:ss') + ')');
            sec.setValue(0);
            sec.show();
        } else {
            me.prepostField.show();
            me.timeField.getComponent('hours').setValue(0);
            me.timeField.getComponent('minutes').setValue(0);
            me.timeField.getComponent('lblHMS').setText('(' + _('hh:mm') + ')');
            // hide seconds field on delay
            sec.hide();
        }
        me.isAbsolute = isAbsolute;
    },

    /**
     * Reset all values to default (unset) or specified values
     * @param values {Object} (optional) values to reset to - default if unset
     */
    resetComponent: function(values) {
        var me = this,
            timebox = me.timeField,
            cycRec = me.getComponent('days').getComponent('cyc-recurrence'),
            cycDay = me.getComponent('time').getComponent('cyc-daytime');

        if (values === undefined) {
            me.setRecurring(true);
            timebox.getComponent('hours').setValue(12);
            timebox.getComponent('minutes').setValue(0);
            timebox.getComponent('seconds').setValue(0);
            cycRec.setActiveItem(cycRec.menu.items.first());
            me.weekdaySelection.resetComponent();
            me.dateField.setValue(new Date());
            if (this.enableDaytime) {
                cycDay.setActiveItem(cycDay.menu.items.first());
                me.setAbsoluteTime(true);
            }
        } else {
            me.setRecurring(!!values.recurring);
            cycRec.setActiveItem(!!values.recurring ? cycRec.menu.items.first() : cycRec.menu.items.last());
            if (this.enableDaytime) {
                if (values.daytime === null) {
                    cycDay.setActiveItem('chk-time');
                } else {
                    if (values.daytime == 'sunrise+') {
                        cycDay.setActiveItem('chk-sunrise');
                        me.prepostField.setActiveItem('chk-post');
                    } else if (values.daytime == 'sunrise-') {
                        cycDay.setActiveItem('chk-sunrise');
                        me.prepostField.setActiveItem('chk-pre');
                    } else if (values.daytime == 'sunset+') {
                        cycDay.setActiveItem('chk-sunset');
                        me.prepostField.setActiveItem('chk-post');
                    } else if (values.daytime == 'sunset-') {
                        cycDay.setActiveItem('chk-sunset');
                        me.prepostField.setActiveItem('chk-pre');
                    }
                }
            }
            timebox.getComponent('hours').setValue(values.hours);
            timebox.getComponent('minutes').setValue(values.minutes);
            timebox.getComponent('seconds').setValue(values.seconds);
            if (values.recurring) {
                me.weekdaySelection.resetComponent(values.recurrence);
                me.dateField.setValue(new Date());
            } else {
                me.weekdaySelection.resetComponent();
                // TODO: add support for multiple dates
                me.dateField.setValue(values.recurrence[0]);
            }
        }
    },

    /**
     * Returns whether this form's values are in a valid state
     * @return {Boolean} True if valid, false otherwise
     */
    isValid: function() {
        var timebox = this.timeField;
        if (this.recurring) {
            this.weekdaySelection.validate();
        }
        return (
            (
                (this.recurring && this.weekdaySelection.isValid())
                || (!this.recurring && this.dateField.isValid())
            )
            && timebox.getComponent('hours').isValid()
            && timebox.getComponent('minutes').isValid()
            && timebox.getComponent('seconds').isValid()
        );
    },

    /**
     * Gets the string of the currently selected daytime
     * @return {String} A string matching (sunrise|sunset)[+-] or null if absolute time is used
     */
    getDayTime: function() {
        var id = this.getComponent('time').getComponent('cyc-daytime').getActiveItem().itemId,
            prepost,
            ret;
        if (id === 'chk-time') {
            return null;
        } else {
            if (id === 'chk-sunrise') {
                ret = 'sunrise';
            } else if (id === 'chk-sunset') {
                ret = 'sunset';
            }

            prepost = this.prepostField.getActiveItem().itemId;
            if (prepost === 'chk-post') {
                ret += '+';
            } else if (prepost === 'chk-pre') {
                ret += '-';
            }
            return ret;
        }
    },

    /**
     * Returns the currently set form values
     * Use isValid() to determine if current values are valid
     * @return {Object} Object of form:
     *      oneTimeEvent: {Boolean} Whether the date or days field is relevant. date on true,
     *      date: {Object} Ext.Date object
     *      days: {Array} Array of int, selected day index (mon=0..sun=6)
     *      hour: {Number} Hour component of time
     *      minute: {Number} Minute component of time
     */
    getValues: function() {
        var timebox = this.timeField;
        var ret = {
            recurring: this.recurring,
            recurrence: this.recurring
                        ? this.weekdaySelection.getValues()
                        : [this.dateField.getValue()], // TODO: support multiple dates
            daytime: this.getDayTime(),
            hours: timebox.getComponent('hours').getValue(),
            minutes: timebox.getComponent('minutes').getValue(),
            seconds: timebox.getComponent('seconds').getValue()
        };
        return ret;
    }
});

/** @private */
Ext.define('TargetTypeModel', {
    extend: 'Ext.data.Model',
    idProperty: 'target',
    fields: ['target', 'icon', 'text']
});

/** @private */
Ext.define('ActionTypeModel', {
    extend: 'Ext.data.Model',
    idProperty: 'action',
    fields: ['action', 'icon', 'text']
});

/**
 * DSS Activity Selection Panel
 */
Ext.define('DSS.component.ActionSelector', {
    alias: ['widget.dssActionSelector'],
    extend: 'DSS.component.Base',
    mixins: {
        observable: 'Ext.util.Observable'
    },
    uses: [
        'DSS.apartment.ApartmentStore',
        'DSS.component.ActionModel',
        'DSS.component.ActionType',
        'DSS.component.TargeType',
        'Ext.data.Store',
        'Ext.form.FieldContainer',
        'Ext.form.field.Checkbox',
        'Ext.form.field.ComboBox',
        'Ext.layout.container.Anchor',
        'Ext.layout.container.Column',
        'Ext.slider.Single',
        'Ext.Template'
    ],
    statics: {
        instances: 0
    },
    config: {
        bindTargetType: null,
        bindActionType: null
    },
    /** The target box containing the choice of the target type and subsequent choices */
    targetBox: [],
    /** The action box containing the choice of the action type and subsequent choices */
    actionBox: [],

    /** The store holding the choice of possible target types */
    targetTypeStore: null,
    /** The store holding the choice of possible action types */
    actionTypeStore: null,
    /** @private */
    apartmentStore: null,
    /** @private The internal state of the selector */
    values: null,

    constructor: function(config) {
        DSS.component.ActionSelector.instances += 1;
        this.initConfig(config);
        this.callParent(arguments);
        this.values = {
            valid: false
        };
        if (this.bindTargetType) {
            this.values.targetType = this.bindTargetType;
        }
        if (this.bindActionType) {
            this.values.actionType = this.bindActionType;
        }
    },
    /**
     * Gets the apartment store
     * Be careful about what you do with it (esp. filtering)
     * @return {Object} The apartment store or null if uninitialized
     */
    getApartmentStore: function() {
        return this.apartmentStore;
    },
    /** @private */
    setValid: function(valid) {
        this.values.valid = valid;
        this.fireEvent('valuechanged', valid, this.values);
    },

    /**
     * Reset all values to default (unset) or specified values
     * @param values {Object} (optional) values to reset to in the form of an ActionModel object - default if unset
     */
    resetComponent: function(values) {
        var me = this,
            actionBox,
            targetBox,
            i,
            sel,
            store;

        me.values = {
            targetType: this.bindTargetType || undefined,
            actionType: this.bindActionType || undefined,
            valid: false
        };

        // Reset to unset values
        // reset target box
        me.targetBox[0].setValue(undefined);
        targetBox = me.targetBox[0].up();
        i = targetBox.items.length;
        while(--i > 0) {
            targetBox.remove(targetBox.items.getAt(i));
            me.targetBox[i] = null;
        }
        // reset action box
        me.actionBox[0].setValue(undefined);
        me.actionBox[0].setDisabled(values === undefined);
        actionBox = me.actionBox[0].up();
        i = actionBox.items.length;
        while(--i > 0) {
            actionBox.remove(actionBox.items.getAt(i));
            me.actionBox[i] = null;
        }

        if (values !== undefined) {
            // Reset to specific values

            if (me.bindTargetType) {
                values.set('targetType', me.bindTargetType);
            }
            if (me.bindActionType) {
                values.set('actionType', me.bindActionType);
            }
            // set target type
            sel = me.targetBox[0].store.getById(values.get('targetType'));
            // assume that no filtering is performed on the target types
            me.targetBox[0].select(sel);
            // doesn't really modify the selection but rather creates
            // the picker and the selection model if they didn't exist
            sel = me.targetBox[0].getPicker().getSelectionModel().getSelection();
            if (sel.length === 0) {
                // return if selection is not available
                return;
            }
            me.targetBox[0].fireEvent('select', me.targetBox[0], sel);

            // set zone selection
            store = me.targetBox[1].store;
            sel = values.zone().first() && store.getById(values.zone().first().getId());
            if (sel && store.indexOf(sel) === -1) {
                store.clearFilter(true);
                store.filterBy(function(item) {
                    return (item.get('isPresent') || item === sel);
                });
            }
            me.targetBox[1].select(sel);
            sel = me.targetBox[1].getPicker().getSelectionModel().getSelection();
            if (sel.length === 0) {
                return;
            }
            me.targetBox[1].fireEvent('select', me.targetBox[1], sel);

            // set group or device selection
            store = me.targetBox[2].store;
            if (me.values.targetType === DSS.component.TargetType.ZONE) {
                sel = values.group().first() && store.getById(values.group().first().getId());
                if (sel && store.indexOf(sel) === -1) {
                    store.clearFilter(true);
                    store.filterBy(function(item) {
                        return (
                            item.getId() === 0
                            || item === sel
                            || (item.get('isPresent')
                                && item.devices().getCount() > 0)
                        );
                    });
                }
            } else if (me.values.targetType === DSS.component.TargetType.DEVICE) {
                sel = values.device().first() && store.getById(values.device().first().getId());
            }
            me.targetBox[2].select(sel);
            sel = me.targetBox[2].getPicker().getSelectionModel().getSelection();
            if (sel.length === 0) {
                return;
            }
            me.targetBox[2].fireEvent('select', me.targetBox[2], sel, true);

            // set action type
            sel = me.actionBox[0].store.getById(values.get('actionType'));
            // assume that no filtering is performed on the action types
            me.actionBox[0].select(sel);
            sel = me.actionBox[0].getPicker().getSelectionModel().getSelection();
            if (sel.length === 0) {
                return;
            }

            // set action selection (output value or blink or activity selection
            if (values.get('actionType') === DSS.component.ActionType.ACTIVITY) {
                me.actionBox[0].fireEvent('select', me.actionBox[0], sel, function() {
                    var sceneStore = me.actionBox[1].store; // WTF: getStore() doesn't work :/
                    var scene = values.scene().first() && sceneStore.getById(values.scene().first().getId());
                    if (scene) {
                        if (sceneStore.indexOf(scene) === -1) {
                            me.actionBox[2].setValue(true); // enable "More activities"
                        }
                        me.actionBox[1].select(scene);
                        me.actionBox[1].fireEvent('select', me.actionBox[1], [scene]);
                    }
                });
            } else {
                me.actionBox[0].fireEvent('select', me.actionBox[0], sel);
                if (me.values.actionType === DSS.component.ActionType.OUTPUT) {
                    var box = me.actionBox[1].getComponent('output');
                    box.setValue(values.get('outputValue'));
                    box.fireEvent('changecomplete', box, values.outputValue, box.thumbs[0]);

                // } else if (values.actionType === DSS.component.ActionType.BLINK) {
                }
            }

        } else {
            // reset to default values
            if (me.bindTargetType) {
                me.targetBox[0].select(me.bindTargetType);
                sel = me.targetBox[0].getPicker().getSelectionModel().getSelection();
                me.targetBox[0].fireEvent('select', me.targetBox[0], sel);
            }
            if (me.bindActionType) {
                me.actionBox[0].select(me.bindActionType);
                //sel = me.actionBox[0].getPicker().getSelectionModel().getSelection();
                //me.actionBox[0].fireEvent('select', me.actionBox[0], sel);
            }
        }
    }, // resetComponent

    initComponent: function() {
        var me = this;

        me.targetTypeStore = Ext.create('Ext.data.Store', {
            model: 'TargetTypeModel',
            data: [
                { target: DSS.component.TargetType.ZONE, icon: null, text: _('Room') },
                { target: DSS.component.TargetType.DEVICE, icon: null, text: _('Device') }
            ]
        });

        me.actionTypeStore = Ext.create('Ext.data.Store', {
            model: 'ActionTypeModel',
            data: [
                { action: DSS.component.ActionType.ACTIVITY, icon: null, text: _('Call activity') },
                { action: DSS.component.ActionType.OUTPUT, icon: null, text: _('Set output') },
                { action: DSS.component.ActionType.BLINK, icon: null, text: _('Blink') }
            ]
        });

        me.addEvents({
            /**
             * @event valuechanged
             * @param valid {Boolean} True when the current values are valid
             * @param values {Object} Object containing the current values
             */
            valuechanged: true
        });

        /** The target box containing the choice of the target type and subsequent choices */
        me.targetBox = [null, null, null];
        /** The action box containing the choice of the action type and subsequent choices */
        me.actionBox = [null, null];

        var targetBoxOpts = {
            fieldLabel: _('Target'),
            valueField: 'target'
        };
        if (me.bindTargetType) {
            targetBoxOpts.hidden = true;
        }
        me.targetBox[0] = me.createComboBox(me.targetTypeStore, me.onTargetChanged, targetBoxOpts);

        var actionBoxOpts = {
            fieldLabel: _('Action'),
            disabled: true,
            valueField: 'action'
        };
        if (me.bindActionType) {
            actionBoxOpts.hidden = true;
        }
        me.actionBox[0] = me.createComboBox(me.actionTypeStore, me.onActionChanged, actionBoxOpts);
        Ext.apply(me, {
            layout: {
                type: 'column',
                width: 500
            },
            bodyPadding: '5',
            defaults: {
                xtype: 'container',
                columnWidth: 0.5,
                layout: {
                    type: 'anchor',
                    align: 'stretch',
                    anchor: '100%'
                }
            },
            items: [
                { items: [me.targetBox[0]] },
                { items: [me.actionBox[0]] }
            ]
        });

        me.callParent(arguments);
        me.apartmentStore = Ext.create('DSS.apartment.ApartmentStore');
        me.apartmentStore.load();
        if (me.bindTargetType) {
            me.targetBox[0].select(me.bindTargetType);
            me.createZoneBox(me.targetBox[0].up(), me.bindTargetType);
        }
        if (me.bindActionType) {
            me.actionBox[0].select(me.bindActionType);
        }
    },

    /**
     * Enables or disables the actionBox.
     * Clears associated values and related boxes when disabling
     * @param disabled {Boolean} True to disable, false to enable
     */
    disableActionBox: function(disabled) {
        var me = this;
        me.actionBox[0].setDisabled(disabled);
        var box = me.actionBox[0].up();
        var i = 1;
        while(box.items.length > 1) {
            box.remove(box.items.getAt(1));
            me.actionBox[i++] = null;
        }
        me.actionBox[0].setValue(undefined);

        // reset
        if (!me.bindActionType) {
            me.values.actionType = null;
        }
        me.values.outputValue = null;
        me.values.scene = null;
        me.setValid(false);
    },

    /**
     * @private
     * Creates an Ext.form.Fieldcontainer containing an output selector
     * @param output {Number} Percentage to set on the output slider (Optional)
     * @return {Object} An Ext.form.Fieldcontainer
     */
    createSliderBox: function(output) {
        var out = output || 0;
        return Ext.create('Ext.form.FieldContainer', {
            fieldLabel: _('Output'),
            labelWidth: 60,
            items: [{
                xtype: 'slider',
                itemId: 'output',
                name: 'output',
                minValue: 0,
                maxValue: 100,
                value: out,
                width: 100
            }]
        });
    },

    /**
     * @private
     * Replace a box's trailing components while leaving the first few children
     * @param box {Object} The box to modify
     * @param skip {Number} The number of items to leave at the beginning of the box
     * @param content {Object} The new content
     */
    setBox: function(box, skip, content) {
        while(skip < box.items.length) {
            box.remove(box.items.getAt(skip));
        }
        if (content) {
            box.add(content);
        }
    },

    /**
     * @private
     * Creates a new combobox with a few default settings
     * @param store {Object} The store to use
     * @param selectHandler {Function} The handler to bind to the select listener
     * @param config {Object} The config to apply to change defaults (Optional)
     * @return {Object} The created combobox
     */
    createComboBox: function(store, selectHandler, customConfig) {
        var me = this;
        var iconTpl = Ext.create('Ext.Template', [
                // The pics are 16x16, +5 padding = 21
                '<div style="',
                    '<tpl if="icon">',
                        'background:left center no-repeat url(\'images/dss/{icon}\');',
                    '</tpl>',
                    'min-height:16;',
                    'padding-left:21px;',
                    '<tpl if="isPresent===false">color:gray;</tpl>',
                '">{',
                (customConfig ? customConfig.displayField || 'text' : 'text'),
                '}</div>'
            ]
        );
        var config = {
            editable: false,
            forceSelection: true,
            fieldLabel: _('Room'),
            labelWidth: 60,
            listConfig: { itemTpl: iconTpl },
            store: store,
            // without lastQuery, the combobox applies its own filter on the
            // store, discarding existing filters.
            lastQuery: '',
            queryMode: 'local',
            valueField: 'id',
            listeners: {
                select: Ext.bind(selectHandler, me)
            },
            width: 225
        };
        if (customConfig) {
            Ext.apply(config, customConfig);
        }
        var box = Ext.create('Ext.form.field.ComboBox', config);

        box.on('render', function(thisBox) {
            // also create and render the picker on box rendering
            // otherwise render-time selection is not available
            var picker = thisBox.getPicker();
            picker.doAutoRender();
        });

        box.on('select', function(field, value, options) {
            var bg = 'background:none;';
            var icon = (value.length > 0 ? value[0].get('icon') : null);
            if (icon) {
                var url = 'images/dss/' + icon;
                bg = "background:left center no-repeat url('"+ url +"');";
            }
            field.setFieldStyle(bg + 'padding-left:21px;');
        });
        return box;
    },

    /** @private Called when the event's target is changed */
    onTargetChanged: function(field, value, options) {
        var me = this;
        var target = field.getValue(); // one of DSS.component.TargetType
        me.values.targetType = target;
        me.values.zone = null;
        me.values.group = null;
        me.values.device = null;

        me.createZoneBox(field.up(), target);

        // reset
        me.disableActionBox(true);
        me.targetBox[2] = null;
    },

    /** @private */
    createZoneBox: function(targetBox, targetType, callback) {
        var me = this;
        var createBox = function(targetBox, targetType, callback) {
            // can't create before the store is loaded
            // or .first() returns undefined
            var zoneStore = me.apartmentStore.first().zones();
            // Only display present rooms (i.e. rooms with devices)
            zoneStore.clearFilter(true);
            zoneStore.filter({ property: 'isPresent', value: true });
            var handler;
            if (targetType == DSS.component.TargetType.ZONE) {
                handler = me.onTargetZoneChanged;
            } else if (targetType == DSS.component.TargetType.DEVICE) {
                handler = me.onDeviceZoneChanged;
            } else {
                handler = Ext.emptyFn;
            }
            var zonebox = me.createComboBox(zoneStore, handler);
            me.setBox(targetBox, 1, zonebox);
            me.targetBox[1] = zonebox;
            if (callback && Ext.isFunction(callback)) {
                callback();
            }
        };

        if (me.apartmentStore.isLoading()) {
            me.apartmentStore.on('load', function(store, records, success) {
                createBox(targetBox, targetType, callback);
            }, me);
        } else {
            createBox(targetBox, targetType, callback);
        }
    },

    /** @private Called when the event's zone (room) on a `zone' target is changed */
    onTargetZoneChanged: function(field, value, options) {
        var me = this;
        me.createGroupBox(field.up(), value[0].groups());
        me.values.zone = value[0];

        // reset
        me.disableActionBox(true);
        me.values.group = null;
    },

    createGroupBox: function(targetBox, groupStore) {
        var me = this;
        groupStore.each(function(grp) {
            if (grp.getId() === 0) {
                // enable the generic group
                grp.set('isPresent', true);
            }
            if (grp.devices().getCount() === 0) {
                // Disable groups without present devices (not done by dSS)
                grp.set('isPresent', false);
            }
        });
        // Display only groups with present devices:
        groupStore.clearFilter(true);
        groupStore.filterBy(function(item) {
            return (
                item.get('id') === 0
                || (item.get('isPresent')
                    && item.devices().getCount() > 0)
            );
        });
        var groupbox = me.createComboBox(groupStore, me.onTargetGroupChanged, {
            fieldLabel: _('Group')
        });
        me.setBox(targetBox, 2, groupbox);
        me.targetBox[2] = groupbox;
    },

    /** @private Called when the event's group (color) on a `zone' target is changed */
    onTargetGroupChanged: function(field, value, options) {
        var me = this;
        me.disableActionBox(false);
        if (me.bindActionType && options !== true) {
            me.actionBox[0].select(me.bindActionType);
            me.onActionChanged(me.actionBox[0], me.bindActionType);
        }
        me.values.group = value[0];
    },

    /** @private Called when the event's zone (room) on a `device' target is changed */
    onDeviceZoneChanged: function(field, value, options) {
        var me = this;
        var deviceStore = value[0].devices();
        me.createDeviceBox(field.up(), deviceStore);
        me.values.zone = value[0];

        // reset
        me.values.device = null;
        me.disableActionBox(true);
    },

    /** @private */
    createDeviceBox: function(targetBox, deviceStore) {
        var me = this;
        var box = me.createComboBox(deviceStore, me.onDeviceChanged, {
            fieldLabel: _('Device')
        });
        me.setBox(targetBox, 2, box);
        me.targetBox[2] = box;
    },

    /** @private Callend when a device is chosen in a given zone (room) */
    onDeviceChanged: function(field, value, options) {
        var me = this;
        me.disableActionBox(false);

        // options is true if called from resetComponent, which means that
        // the caller will take care of setting me.actionBox[0] correctly
        if (me.bindActionType && options !== true) {
            me.actionBox[0].select(me.bindActionType);
            me.onActionChanged(me.actionBox[0], me.bindActionType);
        }

        // reset
        me.values.device = value[0];
    },

    /** @private Callend when the action type is changed */
    onActionChanged: function(field, value, optsCallback) {
        var me = this;
        var action = field.getValue();
        me.values.actionType = action;

        if (action == DSS.component.ActionType.ACTIVITY) {
            // The action is to call an activity
            me.setValid(false);
            me.createSceneBox(field.up(), me.values.zone, me.values.group, optsCallback);

        } else if (action == DSS.component.ActionType.OUTPUT) {
            // The action is 'setOutput'
            me.setValid(false);
            me.createSetOutputBox(field.up(), true);

        } else if (action == DSS.component.ActionType.BLINK) {
            // The action is to blink
            me.values.outputValue = null;
            me.values.scene = null;
            me.setBox(field.up(), 1, null);
            me.setValid(true);

        } else {
            // shouldn't happen
            Ext.Msg.alert(_('Error'), _('Unknown action type') + '`' + action + '\'');
        }
    },

    /** @private */
    createSetOutputBox: function(targetBox, fireChange, value) {
        var me = this;
        var box = me.createSliderBox(value);
        var outputbox = box.getComponent('output');
        outputbox.on('changecomplete', function(slider, val, thumb, obj) {
            me.values.outputValue = val;
            me.setValid(true);
        });
        if (fireChange) {
            outputbox.fireEvent('changecomplete', outputbox, 0, outputbox.thumbs[0], null);
        }
        me.actionBox[1] = box;
        me.setBox(targetBox, 1, box);
    },

    /**
     * @private
     * @param targetBox {Object} Box to append the component to
     * @param zone {Object} A DSS.apartment.ZoneModel to fetch reachable scenes for
     * @param group {Object} A DSS.apartment.GroupModel to fetch reachable scenes for
     * @param callback {Function} Callback when scenes are fetched.
     *      The sigle argument passed is success {Boolean} which indicates
     *      whether the store was fetched successfully.
     */
    createSceneBox: function(targetBox, zone, group, callback) {
        var me = this;
        DSS.apartment.Helper.createReachableSceneStore(
            zone.getId(),
            function(success, reachableSceneStore, filterFn) {
                var onLoaded;

                if (success) {
                    onLoaded = function() {
                        var scenebox,
                            advbox;

                        scenebox = me.createComboBox(
                            reachableSceneStore,
                            me.onSceneChanged,
                            { fieldLabel: _('Activity') }
                        );
                        advbox = Ext.create('Ext.form.field.Checkbox', {
                            boxLabel: _('More activities'),
                            padding: '0 0 0 65', // 55px label width + 5px border
                            handler: function(field, checked) {
                                if (checked) {
                                    reachableSceneStore.clearFilter(false);
                                    // Hack to make the picker scrollable..
                                    // Somehow it doesn't respect maxHeight
                                    var picker = me.actionBox[1].getPicker();
                                    picker.setHeight(picker.maxHeight);
                                } else {
                                    reachableSceneStore.filterBy(filterFn);
                                }
                            }
                        });
                        me.setBox(targetBox, 1, scenebox);
                        me.actionBox[1] = scenebox;
                        me.setBox(targetBox, 2, advbox);
                        me.actionBox[2] = advbox;
                        if (callback && Ext.isFunction(callback)) {
                            Ext.callback(callback, me, [success]);
                        }
                    };
                    if (zone && group) {
                        // only load custom scene names when a room target is selected
                        // as the device target doesn't have a group set
                        reachableSceneStore.loadCustomNames(zone, group, onLoaded);
                    } else {
                        onLoaded();
                    }

                } else {
                    var scenebox = me.createComboBox(undefined, Ext.emptyFn, {
                        activeError: _("Couldn't get reachable scenes"),
                        disabled: true,
                        fieldLabel: _('Activity')
                    });
                    me.setBox(targetBox, 1, scenebox);
                    me.actionBox[1] = scenebox;
                    if (callback && Ext.isFunction(callback)) {
                        Ext.callback(callback, me, [success]);
                    }
                }
            },
            true
        );
    },

    /** @private Called when the scene is chosen for an action */
    onSceneChanged: function(field, value, options) {
        var me = this;
        me.values.scene = value[0];
        me.setValid(true);
    },

    /**
     * Returns the currently set form values in a new ActionModel
     * @return {Object} DSS.component.ActionModel object of the currently set values
     */
    getValues: function() {
        this.values.incomplete = !this.values.valid;
        var ret = Ext.create('DSS.component.ActionModel', this.values);
        delete ret.data.valid;
        return ret;
    },

    /**
     * Returns the validation state of the currently chosen values
     * @return {Boolean} True if the current value selection is complete
     */
    isValid: function() {
        return this.values.valid;
    }
});

Ext.define('DSS.component.ActionModel', {
    extend: 'Ext.data.Model',
    //requires: ['Ext.data.SequentialIdGenerator'],
    //idgen: 'sequential',
    fields: [
        { name: 'id', type: 'integer', persist: false },
        'text',
        'icon',
        'targetType',
        'actionType',
        { name: 'outputValue', type: 'integer' },
        { name: 'incomplete', type: 'boolean', defaultValue: true }
    ],
    hasMany: [ // hasOne doesn't exists but the singular name gives a hint.
        { name: 'device', model: 'DSS.apartment.DeviceModel' },
        { name: 'group', model: 'DSS.apartment.GroupModel' },
        { name: 'zone', model: 'DSS.apartment.ZoneModel' },
        { name: 'scene', model: 'DSS.apartment.SceneModel' }
    ],
    statics: {
        _id: 1,
        genId: function() {
            return ++DSS.component.ActionModel._id;
        },
        /** @private */
        apartmentStore: null,
        /**
         * Gets the apartmentStore. DO NOT MODIFY THIS STORE.
         * Note that it might not (yet) be done loading.
         * To remedy this, it is suggested to call this getter on page load
         * and wait until the load event is fired
         * @return {Object} The apartment store.
         */
        getApartmentStore: function() {
            if (!DSS.component.ActionModel.apartmentStore) {
                DSS.component.ActionModel.apartmentStore = Ext.create('DSS.apartment.ApartmentStore');
                DSS.component.ActionModel.apartmentStore.load();
            }
            return DSS.component.ActionModel.apartmentStore;
        },
        /**
         * Create an ActionModel instance from "raw" id values
         * (creating and setting zone, group, device and scene from id
         * as well as setting the corresponding text and icon)
         * Note: Make sure to preload the custom scene names with
         * DSS.apartment.SceneStore.preloadCustomNameCache() if you would like
         * to have these appear instaed of the default scene names
         * @param values {Object} The values to use for reconstruction
         * @return {Object} An ActionModel
         *      (with the incomplete flag set if it can't be reconstructed)
         */
        reconstructFromIds: function(values) {
            data = DSS.component.ActionModel.reconstructValues(values);
            if (data.valid) {
                return new DSS.component.ActionModel(data);
            }
            return new DSS.component.ActionModel();
        },
        /**
         * @private
         * Recreate missing fields like targetType and actionType from set values
         * and set the zone, group and/or scene to a correct
         * ZoneModel/GroupModel/SceneModel from only it's id.
         */
        reconstructValues: function(raw) {
            var values = Ext.apply({}, raw),
                valid = true,
                zoneStore = DSS.component.ActionModel.getApartmentStore().first().zones(),
                sceneStore,
                zone = null,
                device = null,
                i = 0;

            // targetType
            if (values.device !== undefined && values.device.length !== 0) {
                values.targetType = DSS.component.TargetType.DEVICE;
                for (i = 0; i < zoneStore.getCount(); ++i) {
                    zone = zoneStore.getAt(i);
                    device = zone.devices().getById(values.device);
                    // assume i=0 implies 'all zones'
                    if (device && i !== 0) {
                        // only abort search if the device is not in the 'all zones'
                        // zone, otherwise keep looking
                        break;
                    }
                }
                if (device !== null) {
                    values.device = device;
                    // if wanted, we could choose the zone this device is in
                    // instead of using the "all rooms" zone 0
                    values.zone = zone;
                } else {
                    values.zone = zoneStore.first();
                }
                valid = (!!values.device);

            } else if (values.zone >= 0) {
                values.targetType = DSS.component.TargetType.ZONE;
                values.zone = zoneStore.getById(values.zone);
                valid = (!!values.zone);
            }
            if (values.group >= 0) {
                if (!!values.zone) {
                    values.group = values.zone.groups().getById(values.group);
                    if (!values.group) {
                        valid = false;
                    }
                }
            }

            // actionType
            if (values.blink) {
                values.actionType = DSS.component.ActionType.BLINK;
            } else if (values.outputValue >= 0) {
                values.actionType = DSS.component.ActionType.OUTPUT;
                values.outputValue = Math.round(values.outputValue / 2.55);
            } else if (values.scene >= 0) {
                values.actionType = DSS.component.ActionType.ACTIVITY;
                sceneStore = DSS.apartment.Helper.getDefaultSceneStore();

                if (values.zone && values.group) {
                    // create a copy of the store, load the custom scene names
                    sceneStore = sceneStore.clone();
                    // make sure DSS.apartment.SceneStore.preloadCustomNameCache()
                    // has been called and has returned, as this is otherwise asynchronous
                    sceneStore.loadCustomNames(values.zone, values.group);
                }
                values.scene = sceneStore.getById(values.scene);
                if (!values.scene) {
                    valid = false;
                }
            } else {
                valid = false;
            }
            values.valid = valid;
            return values;
        }

    },
    /**
     * Creates a new ActionModel from valid data
     * @param data {Object} Initialization data
     * @param id {Number} (Optional) This model's id
     */
    constructor: function(data, id) {
        if (!id) {
            id = DSS.component.ActionModel.genId();
        }
        this.callParent(arguments);
        if (data) {
            // All these stores seem to be preloaded with a filter
            this.zone().clearFilter();
            this.group().clearFilter();
            this.device().clearFilter();
            this.scene().clearFilter();

            if (data.zone) {
                // delete to avoid confusion, as it will never be updated later on
                delete this.data.zone;
                this.zone().loadData([data.zone.data]);
            }
            if (data.group) {
                delete this.data.group;
                this.group().loadData([data.group.data]);
            }
            if (data.device) {
                delete this.data.device;
                this.device().loadData([data.device.data]);
            }
            if (data.scene) {
                delete this.data.scene;
                this.scene().loadData([data.scene.data]);
            }
            this.set('incomplete', false);
        }
        this.setIcon();
        this.setShortDesc();
        this.commit();
    },
    /**
     * @override
     * Create a deep clone of this ActionModel
     * @return {Object} A new ActionModel instance bearing the same but
     *      deep-cloned data as this instance
     */
    copy: function() {
        var data = Ext.clone(this.data);
        if (this.zone().getCount() > 0) {
            data.zone = this.zone().first().copy();
        }
        if (this.group().getCount() > 0) {
            data.group = this.group().first().copy();
        }
        if (this.device().getCount() > 0) {
            data.device = this.device().first().copy();
        }
        if (this.scene().getCount() > 0) {
            data.scene = this.scene().first().copy();
        }
        return new DSS.component.ActionModel(data);
    },
    /**
     * Reset this model to its default, unset values
     */
    reset: function() {
        // All these stores seem to be preloaded with a filter
        this.zone().clearFilter();
        this.group().clearFilter();
        this.device().clearFilter();
        this.scene().clearFilter();

        // reset everything expect the id
        this.zone().removeAll();
        this.group().removeAll();
        this.device().removeAll();
        this.scene().removeAll();
        this.set('targetType', undefined);
        this.set('actionType', undefined);
        this.set('outputValue', undefined);
        this.set('icon', undefined);
        this.set('text', undefined);
        this.set('incomplete', true);
        this.commit();
    },

    /**
     * @private
     * Sets the icon field from the model's values
     */
    setIcon: function() {
        if (this.data.incomplete) {
            this.set('icon', 'missing.png');
            return;
        }

        var icon;
        var st;
        if (this.data.actionType === DSS.component.ActionType.ACTIVITY) {
            st = this.scene();
            if (st.getCount() > 0) {
                icon = st.first().get('icon');
                if (icon && icon.length > 0) {
                    this.set('icon', icon);
                    return;
                }
            }
        }
        st = this.group().getCount() > 0 ? this.group() : this.device();
        var val = st.first();
        if (val) {
            icon = val.get('icon');
            if (icon && icon.length > 0) {
                this.set('icon', icon);
                return;
            }
        }
        this.set('icon', null);
        return;
    },
    /**
     * @private
     * Sets the text field from the model's values
     */
    setShortDesc: function() {
        if (this.data.incomplete) {
            this.set('text', _('Incomplete action...'));
            return;
        }

        var dev = this.device().first(),
            zon = this.zone().first(),
            grp = this.group().first(),
            scn = this.scene().first();

        if (this.data.actionType === DSS.component.ActionType.OUTPUT) {
            if (dev) {
                if (zon.get('id') === 0) {
                    // Don't display 'set Dev X in All rooms to N%'
                    this.set('text', Ext.String.format(
                        '{0}: {1}%',
                        dev.get('text'),
                        this.data.outputValue
                    ));
                    return;
                }
                this.set('text', Ext.String.format(
                    '{0} in {1}: {2}%',
                    dev.get('text'),
                    zon.get('text'),
                    this.data.outputValue
                ));
                return;
            }
            if (grp) {
                this.set('text', Ext.String.format(
                    '{0} in {1}: {2}%',
                    grp.get('text'),
                    zon.get('text'),
                    this.data.outputValue
                ));
                return;
            }
        }
        if (this.data.actionType === DSS.component.ActionType.ACTIVITY) {
            if (dev) {
                if (zon.get('id') === 0) {
                    // Don't display 'D in All rooms on N%'
                    this.set('text', Ext.String.format(
                        _('{0} for {1}'),
                        scn.get('text'),
                        dev.get('text')
                    ));
                    return;
                }
                this.set('text', Ext.String.format(
                    _('{0} for {1} in {2}'),
                    scn.get('text'),
                    dev.get('text'),
                    zon.get('text')
                ));
                return;
            }
            if (grp) {
                this.set('text', Ext.String.format(
                    _('{0} for {1} in {2}'),
                    scn.get('text'),
                    grp.get('text'),
                    zon.get('text')
                ));
                return;
            }
        }
        if (this.data.actionType === DSS.component.ActionType.BLINK) {
            if (dev) {
                if (zon.get('id') === 0) {
                    // Don't display 'D in All rooms on N%'
                    this.set('text', Ext.String.format(
                        _('Blink {0}'),
                        dev.get('text')
                    ));
                    return;
                }
                this.set('text', Ext.String.format(
                    _('Blink {0} in {1}'),
                    dev.get('text'),
                    zon.get('text')
                ));
                return;
            }
            if (grp) {
                this.set('text', Ext.String.format(
                    _('Blink {0} in {1}'),
                    grp.get('text'),
                    zon.get('text')
                ));
                return;
            }
        }

        this.set('text', 'error');
    }
});

Ext.define('DSS.component.ActionStore', {
    extend: 'Ext.data.Store',
    model: 'DSS.component.ActionModel',
    /**
     * Loads one incomplete entry into the store
     * @param append {Boolean} (optional) append to store instead of clearing it
     */
    preloadInvalid: function(append) {
        this.loadData(
            [Ext.create('DSS.component.ActionModel')],
            (append === true)
        );
    },
    /**
     * Gets the actions stored in this store
     * @return {Array} An array of DSS.component.ActionModel objects
     */
    getValues: function() {
        var actions = [];
        var i, n = this.getCount();
        for (i=0; i<n; ++i) {
            // TODO: check if that needs to be cloned
            // because they might be lost when the store is cleared
            actions.push(this.getAt(i));
        }
        return actions;
    }
});

Ext.define('DSS.component.ActionStorePanel', {
    extend: 'Ext.grid.Panel',

    config: {
        itemId: 'actionPanel',
        /**
         * Decides whether to initialize the action store empty,
         * or to preload it with one incomplete action
         */
        initEmpty: false,
        title: _('Actions')
    },
    constructor: function(config) {
        this.callParent(arguments);
        this.initConfig(config);
    },
    /** @private */
    resetting: false,
    initComponent: function() {
        var me = this;
        if (!me.store) {
            // create a store, if none has been passed as config option
            // the store is pre-filled with one incomplete action
            me.store = Ext.create('DSS.component.ActionStore');
            if (!me.initEmpty) {
                me.store.preloadInvalid();
            }
        }
        Ext.apply(me, {
            tbar: {
                items: [
                    {
                        id: 'btn-add-action',
                        text: _('New action'),
                        iconCls: 'icon-add-action',
                        disabled: true,
                        handler: function() {
                            me.store.preloadInvalid(true);
                            me.getSelectionModel().select(
                                me.store.getCount() -1
                            );
                            Ext.getCmp('btn-remove-action').setDisabled(false);
                        }
                    }, '->', {
                        id: 'btn-remove-action',
                        text: _('Remove'),
                        iconCls: 'icon-delete-action',
                        disabled: true,
                        handler: function() {
                            if (me.store.getCount() > 1) {
                                me.store.remove(me.curActionStoreRecord);
                                me.curActionStoreRecord = null;
                                me.getSelectionModel().select(0);
                            }
                            if (me.store.getCount() === 1) {
                                this.setDisabled(true);
                            }
                        }
                    }
                ]
            }
        });
        me.callParent(arguments);
    }, // initComponent
    /**
     * Reset the component using given values (reset to defaults if none)
     * @param values {Array} Array of ActionModel
     */
    resetComponent: function(values) {
        var me = this,
            disabled = false,
            actions = [],
            selModel;

        if (!values) {
            if (me.initEmpty) {
                me.store.removeAll();
            } else {
                me.store.preloadInvalid();
            }
        } else {
            // Clone the models
            Ext.each(values, function(a) {
                actions.push(a.copy());
            });
            me.store.loadData(actions);
            Ext.getCmp('btn-add-action').setDisabled(false);
        }

        if (me.store.getCount() > 0) {
            selModel = me.getSelectionModel();
            selModel.select(0);
            // select(0) doesn't seem to do much, so double up with that:
            me.fireEvent('selectionchange', selModel, [me.store.first()]);
        }

        disabled = !values || me.store.getCount() < 2;
        Ext.getCmp('btn-remove-action').setDisabled(disabled);
    },
    /**
     * Validate the component and check if input values are valid
     * @return {Boolean} True if the fields are valid, false otherwise
     */
    isValid: function() {
        return (this.store.getCount() > 1
                // There can be at most one invalid entry
                || (this.store.getCount() == 1
                    && this.store.first().get('incomplete') === false));
    },
    /**
     * Returns the actions held by this ActionStorePanel
     * @return {Object} An array of DSS.component.ActionModel
     */
    getValues: function() {
        return this.store.data.items;
    },

    /** @private The currently selected record */
    curActionStoreRecord: null,
    minWidth: 200,
    flex: 1,
    hideHeaders: true,
    collapsible: true,
    preventHeader: true,
    split: true, // resizable
    viewConfig: {
        deferInitialRefresh: false // otherwise selection is not available at creation time
    },
    listeners: {
        beforeselect: function(view, node, sel, options) {
            if (this.curActionStoreRecord
                && this.curActionStoreRecord.get('incomplete')
                && node != this.curActionStoreRecord) {

                // Doesn't display correctly with a window on top:
                // Ext.Msg.alert(_('Missing data'),
                //      _('Please complete the current action first')
                // );
                // TODO: ask to discard data
                return false;
            }
            return true;
        },
        selectionchange: function(selModel, records) {
            if (records.length == 0 // happens on abort (deselect)
                || this.curActionStoreRecord === records[0]) {
                return;
            }
            this.curActionStoreRecord = records[0];
        }
    },
    columns: [
        {
            dataIndex: 'icon',
            hideable: false,
            renderer: function(val, meta) {
                if (val && val.length > 0) {
                    meta.style = 'padding: 0;height: 16px;'+
                    'background: no-repeat url(\'images/dss/'+ val +'\')';
                }
                return '&nbsp;';
            },
            padding: 0,
            resizable: false,
            width: 16
        }, {
            header: _('Activity'),
            dataIndex: 'text',
            hideable: false,
            resizable: false,
            flex: 1
        }
    ]
});

Ext.define('DSS.component.ActionConfigurator', {
    extend: 'DSS.component.Base',
    alias: ['widget.dssActionConfigurator'],
    uses: [
        'DSS.component.ActionSelector',
        'DSS.component.ActionStorePanel',
        'Ext.form.field.Checkbox',
        'Ext.form.field.ComboBox',
        'Ext.layout.container.Border'
    ],
    mixins: {
        observable: 'Ext.util.Observable'
    },
    config: {
        itemId: 'actionConfigurator',
        initEmpty: false,
        title: _('Actions'),
        actionSelector: null,
        actionStorePanel: null,
        actionStore: null // set automatically from actionStorePanel
    },
    height: '100%',
    layout: 'border',
    curActionStoreRecord: null,
    constructor: function(config) {
        this.initConfig(config);
        this.callParent(arguments);
    },
    initComponent: function() {
        var me = this;
        if (!me.actionSelector) {
            me.actionSelector = Ext.create('DSS.component.ActionSelector');
        }
        if (!me.actionStorePanel) {
            me.actionStorePanel = Ext.create('DSS.component.ActionStorePanel', {
                initEmpty: me.initEmpty,
                region: 'west'
            });
        }
        me.actionStore = me.actionStorePanel.store;

        if (!me.items) {
            me.items = [
                me.actionStorePanel,
                {
                    xtype: 'form',
                    region: 'center',
                    layout: 'fit',
                    flex: 3,
                    bodyPadding: 5,
                    items: {
                        xtype: 'fieldset',
                        title: _('Action Configuration'),
                        items: [me.actionSelector]
                    }
                }
            ];

            me.curActionStoreRecord = me.actionStore.first();
            me.actionSelector.on('valuechanged', function(valid, values) {
                if (me.actionStorePanel.resetting) {
                    return;
                }
                // update selection text (valid/invalid)
                // save valid values in store
                var rec = me.curActionStoreRecord || me.actionStore.first();
                if (!rec) {
                    return; // happens on resetComponent
                }
                if (valid) {
                    rec.reset();
                    rec.set('targetType', values.targetType);
                    rec.zone().loadData([values.zone.data]);
                    if (values.group) {
                        rec.group().loadData([values.group.data]);
                    }
                    if (values.device) {
                        rec.device().loadData([values.device.data]);
                    }
                    rec.set('actionType', values.actionType);
                    if (values.outputValue || values.outputValue === 0) {
                        rec.set('outputValue', values.outputValue);
                    }
                    if (values.scene) {
                        rec.scene().loadData([values.scene.data]);
                    }
                    rec.set('incomplete', false);
                    Ext.getCmp('btn-add-action').setDisabled(false);
                } else {
                    rec.set('incomplete', true);
                    Ext.getCmp('btn-add-action').setDisabled(true);
                }
                rec.setIcon();
                rec.setShortDesc();
                rec.commit();
            });
            me.actionStorePanel.on('selectionchange', function(selModel, records) {
                if (records.length == 0 // happens on abort (deselect)
                    || me.curActionStoreRecord === records[0]) {
                    return;
                }
                me.actionStorePanel.resetting = true;
                me.curActionStoreRecord = records[0];
                if (records[0].get('incomplete')) {
                    me.actionSelector.resetComponent();
                } else {
                    me.actionSelector.resetComponent(records[0]);
                }
                me.actionStorePanel.resetting = false;
            });
        }
        me.callParent(arguments);

    },
    /**
     * Resets the component to given values (default if unset)
     * @param values {Object} The same as passed to DSS.component.ActionStorePanel.resetComponent
     */
    resetComponent: function(values) {
        this.actionStorePanel.resetComponent(values);
        // TODO: make sure that the actionSelector is reset by the storepanel
    },
    /**
     * Returns whether this form's values are in a valid state
     * @return {Boolean} True if valid, false otherwise
     */
    isValid: function() {
        return this.actionStorePanel.isValid();
    },
    /**
     * Returns the actions held by this ActionStorePanel in a new ActionModel
     * @return {Object} An array of DSS.component.ActionModel
     */
     getValues: function() {
        return this.actionStorePanel.getValues();
     }
});
