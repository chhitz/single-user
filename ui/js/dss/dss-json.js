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

Ext.namespace('DSS');
Ext.namespace('DSS.json');

/**
 * @class DSS.json.Base
 * @extends Ext.util.Observable
 * Abstract class that manages the json connection to the dSS.
 * TODO: Allow the login token to be set here, to make all descendents
 *       work when used on the trusted port (see DSS.json.Login class)
 *       http://redmine.digitalstrom.org/projects/dss/wiki/Accessing_the_dSS
 */
Ext.define('DSS.json.Base', {
    extend: 'Ext.Base',
    mixins: {
        observable: 'Ext.util.Observable'
    },

    uses: ['Ext.Ajax', 'Ext.JSON'],

    statics: {
        /**
         * Serialize a JSON object dropping valueless fields.
         * The values are separated by semicolons (;)
         * @param obj {Object} Object to serialize
         * @return {String} Serialized object
         */
        serialize: function(obj) {
            // Ext.Object.toQueryString(obj).replace('&', ';');
            // Doesn't work because null's will be kept as foo=&..

            var elems = [];
            var i;
            for (i in obj) {
                if (obj[i].length != 0) {
                    elems.push(i.toString() + '=' + obj[i].toString().replace(';', '\\;'));
                }
            }
            return elems.join(';');
        }
    },

    constructor: function(config) {
        this.addEvents({
            ajaxFailure: true
        });

        // Call the mixin's constructors
        this.mixins.observable.constructor.call(this, config);

        this.callParent(arguments);
    },

    /**
     * Post a request to a server using default parameters
     * @param params {Object} Explicit parameters to use on the request
     */
    request: function(params) {
        Ext.applyIf(params, {
            // default values to be used if not manually specified
            disableCaching: true,
            method: 'GET',
            scope: this,
            timeout: 20000, // 20s timeout
            failure: function(response, options) {
                this.fireEvent('ajaxFailure', response.responseText);
            }
        });
        Ext.Ajax.request(params);
    }
});

/**
 * @class DSS.json.Login
 * @extends Ext.util.Observable
 * Class that manages the json connection to the dSS to login.
 * NOTE: Token based login is only required on the trusted port (8080)
 * In standard applications the authentication is done through HTTPS
 */
Ext.define('DSS.json.Login', {

    extend: 'DSS.json.Base',

    uses: ['Ext.JSON'],

    config: {
        user: 'dssadmin',
        password: 'dssadmin'
    },

    loginUrl: '/json/system/login',
    loggedIn: false,

    constructor: function(config) {
        this.initConfig(config);

        this.addEvents({
            beforelogin: true,
            login: true
        });

        this.on({
            login: function(success, resp) { this.loggedIn = success; }
        });

        this.callParent(arguments);
    },

    /**
     * Login to the dSS via JSON
     * Fires the `login' event with parameter true|false on success
     */
    login: function() {
        this.fireEvent('beforelogin');
        this.request({
            url: this.loginUrl,
            params: {
                user: this.user,
                password: this.password
            },
            success: function(response, options) {
                try {
                    if (response.responseText.length == 0) {
                        this.fireEvent('login', false, _('Empty response'));
                        return;
                    }

                    var jsonData = Ext.JSON.decode(response.responseText);
                    if (jsonData.ok) {
                        this.fireEvent('login', true, jsonData.result);
                    } else {
                        this.fireEvent('login', false, jsonData.message);
                    }
                } catch (err) {
                    this.fireEvent('login', false, err.message);
                }
            },
            failure: function(response, options) {
                this.fireEvent('login', false, response.responseText);
            }
        });
    }
});

/**
 * @class DSS.json.Property
 * @extends DSS.json.Base
 * Class that manages the json connection to manipulate dSS properties.
 * Note that it depends on DSS.json.Login in so far as the dSS requires the
 * connection to be logged in in order to execute queries
 */
Ext.define('DSS.json.Property', {

    extend: 'DSS.json.Base',

    uses: ['Ext.JSON'],

    config: {
        /** Used to prefix relative path queries */
        appId: '/'
        /*
        // Methods that take a path (not query!)
        pathMethods: [  'getBoolean', 'setBoolean',
                        'getInteger', 'setInteger',
                        'getString', 'setString',
                        'getChildren',
                        'getType',
                        'remove',
                        'setFlag'],
        */
    },
    propertyUrl: '/json/property/',
    queryUrl: '/json/property/query',

    constructor: function(config) {
        this.initConfig(config);
        this.addEvents({
            propertyError: true
        });
        this.callParent(arguments);
    },

    ///
    /// Getters
    ///

    /**
     * @private
     * Internal, do not call from outside
     * @param req {Object} Request object
     * @param resultHandlers {Object/Function} Object with
     *      success and/or failure handlers,
     *      or (alternatively) just a success handler
     */
    getValue: function(req, resultHandlers) {
        if (Ext.isFunction(resultHandlers)) {
            resultHandlers = { success: resultHandlers };
        }
        // Make relative paths absolute
        if (req.params) {
            if (req.params.path && req.params.path.indexOf('/') !== 0) {
                req.params.path = '/scripts/' + this.appId + '/' + req.params.path;
            } else if (req.params.query && req.params.query.indexOf('/') !== 0) {
                req.params.query = '/scripts/' + this.appId + '/' + req.params.query;
            }
        }
        if (resultHandlers.success !== undefined) {
            req.success = function(resp) {
                this.defaultGetValueHandler(resultHandlers.success, resp);
            };
        }
        if (resultHandlers.failure !== undefined) {
            req.failure = resultHandlers.failure;
        }
        this.request(req);
    },

    /**
     * Query the dSS property tree
     * @param qry {String} Query in the form:
     *    /apartment/zones/{star}/{star}ZoneID,devices)/
     *    replace {star} with * (nested comments are evil)
     * @param resultHandlers {Object/Function} Object with
     *      success and/or failure handlers,
     *      or (alternatively) just a success handler
     */
    query: function(qry, resultHandlers) {
        var req = {
            url: this.queryUrl,
            params: { query: qry }
        };
        this.getValue(req, resultHandlers);
    },

    /**
     * Get a boolean value from the dSS property tree
     * @param path {String} The path of the property to fetch
     * @param resultHandlers {Object/Function} Object with
     *      success and/or failure handlers,
     *      or (alternatively) just a success handler
     */
    getBoolean: function(path, resultHandlers) {
        var req = {
            url: this.propertyUrl + 'getBoolean',
            params: { path: path }
        };
        this.getValue(req, resultHandlers);
    },

    /**
     * Get an integer value from the dSS property tree
     * @param path {String} The path of the property to fetch
     * @param resultHandlers {Object/Function} Object with
     *      success and/or failure handlers,
     *      or (alternatively) just a success handler
     */
    getInteger: function(path, resultHandlers) {
        var req = {
            url: this.propertyUrl + 'getInteger',
            params: { path: path }
        };
        this.getValue(req, resultHandlers);
    },

    /**
     * Get a string value from the dSS property tree
     * @param path {String} The path of the property to fetch
     * @param resultHandlers {Object/Function} Object with
     *      success and/or failure handlers,
     *      or (alternatively) just a success handler
     */
    getString: function(path, resultHandlers) {
        var req = {
            url: this.propertyUrl + 'getString',
            params: { path: path }
        };
        this.getValue(req, resultHandlers);
    },

    /**
     * Gets the immediate children and their types asynchronously
     * @param path {String} The property path to fetch
     * @param resultHandlers {Object/Function} \
     *      Object with success and failure handlers. \
     *      Or simply the success handler
     */
    getChildren: function(path, resultHandlers) {
        var req = {
            url: this.propertyUrl + 'getChildren',
            params: { path: path }
        };
        this.getValue(req, resultHandlers);
    },

    /**
     * Get the type of a path from the dSS property tree
     * returns `none' if the path is a tree node
     * @param path {String} The path of the property to fetch
     * @param resultHandlers {Object/Function} Object with
     *      success and/or failure handlers,
     *      or (alternatively) just a success handler
     */
    getType: function(path, resultHandlers) {
        var req = {
            url: this.propertyUrl + 'getType',
            params: { path: path }
        };
        this.getValue(req, resultHandlers);
    },

    /**
     * Get the flags of a path from the dSS property tree
     * @param path {String} The path of the property to fetch
     * @param resultHandlers {Object/Function} Object with
     *      success and/or failure handlers,
     *      or (alternatively) just a success handler
     */
    getFlags: function(path, resultHandlers) {
        var req = {
            url: this.propertyUrl + 'getFlags',
            params: { path: path }
        };
        this.getValue(req, resultHandlers);
    },

    ///
    /// Setters
    ///

    /**
     * @private
     * Internal, do not call from outside
     */
    setValue: function(req, callbacks) {
        if (Ext.isFunction(callbacks)) {
            callbacks = { success: callbacks };
        }
        if (req.params && req.params.path && req.params.path.indexOf('/') !== 0) {
            // Make relative paths absolute
            req.params.path = '/scripts/' + this.appId + '/' + req.params.path;
        }
        if (callbacks.success !== undefined) {
            req.success = function(resp) {
                this.defaultSetValueHandler(callbacks.success, resp);
            };
        }
        if (callbacks.failure !== undefined) {
            req.failure = callbacks.failure;
        }
        this.request(req);
    },

    /**
     * Set a boolean value in the dSS property tree
     * @param path {String} The path of the property to set
     * @param value {Boolean} The value to set
     * @param callbacks {Object/Function} Object with
     *      success and/or failure handlers,
     *      or (alternatively) just a success handler
     */
    setBoolean: function(path, value, callbacks) {
        var req = {
            url: this.propertyUrl + 'setBoolean',
            params: { path: path, value: value }
        };
        this.setValue(req, callbacks);
    },

    setInteger: function(path, value, callbacks) {
        var req = {
            url: this.propertyUrl + 'setInteger',
            params: { path: path, value: value }
        };
        this.setValue(req, callbacks);
    },

    setString: function(path, value, callbacks) {
        var req = {
            url: this.propertyUrl + 'setString',
            params: { path: path, value: value }
        };
        this.setValue(req, callbacks);
    },

    setFlag: function(path, flag, callbacks) {
        var req = {
            url: this.propertyUrl + 'setFlag',
            params: { path: path, flag: flag }
        };
        this.setValue(req, callbacks);
    },
    setReadable: function(path, successCallback) {
        this.setFlag(path, 'READABLE', successCallback);
    },
    setWriteable: function(path, successCallback) {
        this.setFlag(path, 'WRITEABLE', successCallback);
    },
    setArchived: function(path, successCallback) {
        this.setFlag(path, 'ARCHIVE', successCallback);
    },

    ///
    /// Helper handlers
    ///

    /**
     * A helper handler that handles set* successes and
     * raises an alert box on error
     * @param callback {Function} The function to call on success
     * @param response {Object} The Xhr response object to check for success
     */
    defaultSetValueHandler: function(callback, response) {
        try {
            var data = Ext.JSON.decode(response.responseText);
            if (data.ok !== true) {
                this.fireEvent('propertyError', data.message);
            }
            callback();
        } catch(syntaxError) {
            this.fireEvent('propertyError', syntaxError.message);
        }
    },

    /**
     * A helper handler that handles simple get* successes
     * (which return a single value) and raises an alert box
     * on error
     * Use like this:
     * success: function(response) { this.defaultGetValueHandler(this.myHandler, response); }
     * this.myHandler will then be called directly with the resulting value
     * @param valueHandler {Function} The handler to pass the parsed value to
     * @param response {Object} The Xhr response object to check for success
     */
    defaultGetValueHandler: function(valueHandler, response) {
        try {
            var data = Ext.JSON.decode(response.responseText);
            if (data.ok === true) {
                if (data.result !== undefined) {
                    if (data.result.value !== undefined) {
                        valueHandler(data.result.value);
                    } else {
                        valueHandler(data.result);
                    }
                } else {
                    valueHandler(data.message);
                }
            } else {
                this.fireEvent('propertyError', data.message);
            }
        } catch(syntaxError) {
            this.fireEvent('propertyError', syntaxError.message);
        }
    }
});

/**
 * @class DSS.json.Event
 * @extends DSS.json.Base
 * Class that manages the json connection to manipulate dSS events.
 */
Ext.define('DSS.json.Event', {

    extend: 'DSS.json.Base',

    uses: ['Ext.JSON'],

    config: {
        /** The event to raise */
        name: '',
        /** Paramaters to always apply on this event instance */
        baseParams: {}
    },
    eventUrl: '/json/event/',

    constructor: function(config) {
        this.initConfig(config);
        this.addEvents({
            eventError: true
        });
        this.callParent(arguments);
    },

    /**
     * Raise an event
     * @param parameter {Object} The parameters to pass
     * @param resultHandlers {Object/Function} An object with success and/or failure handlers
     *      or alternatively just a success handler
     */
    raise: function(parameter, resultHandlers) {
        var params = Ext.apply({}, parameter, this.baseParams);
        var req = {
            url: this.eventUrl + '/raise',
            params: {
                name: this.name,
                parameter: DSS.json.Base.serialize(params)
            }
        };
        if (Ext.isFunction(resultHandlers)) {
            req.success = resultHandlers;
        } else if (resultHandlers !== undefined) {
            if (resultHandlers.success !== undefined) {
                req.success = resultHandlers.success;
            }
            if (resultHandlers.failure !== undefined) {
                req.failure = resultHandlers.failure;
            }
        }
        this.request(req);
    }
});

/**
 * @class DSS.json.EventSubscription
 * @extends DSS.json.Base
 * Class that manages the json connection listening for subscribed dSS events.
 */
Ext.define('DSS.json.EventSubscription', {

    extend: 'DSS.json.Base',

    uses: ['Ext.JSON'],

    config: {
        /**
         * {Number} (optional) An arbitrary subscription id chosen
         * by the subscriber. If it is reused to subscribe to multiple
         * events to, the results will be grouped.
         */
        subscriptionId: null
    },
    eventUrl: '/json/event/',
    /** @private The current subscriptions */
    subscriptions: null,

    /** @private */
    createSubscriptionId: function() {
        this.subscriptionId = Math.floor(Math.random() * 100000000000);
    },

    constructor: function(config) {
        this.initConfig(config);
        if (!this.subscriptionId) {
            this.createSubscriptionId();
        }
        this.subscriptions = {};
        this.callParent(arguments);
    },

    /**
     * Subscribe to a dSS event
     * @param name {String} The event to subscribe
     * @param callback {Function} (optional) Invoked on successful completion
     */
    subscribe: function(name, callback) {
        var me = this,
            req = {
                url: me.eventUrl + '/subscribe',
                params: {
                    name: name,
                    subscriptionID: me.subscriptionId
                },
                success: function() {
                    me.subscriptions[name] = true;
                    if (Ext.isFunction(callback)) {
                        Ext.callback(callback, me);
                    }
                }
            };

        me.request(req);
        me.subscriptions[name] = false;
    },

    /**
     * Unsubscribe from a dSS event
     * @param name {String} The event to unsubscribe
     * @param callback {Function} (optional) Invoked on successful completion
     */
    unsubscribe: function(name, callback) {
        var me = this;
        if (me.subscriptions[name]) {
            var req = {
                url: me.eventUrl + '/unsubscribe',
                params: {
                    name: name,
                    subscriptionID: me.subscriptionId
                },
                success: function() {
                    delete me.subscriptions[name];
                    if (Ext.isFunction(callback)) {
                        Ext.callback(callback, me);
                    }
                }
            };
            me.request(req);
            me.subscriptions[name] = false;
        }
    },

    /**
     * Unsubscribe from all subscribed dSS events in this instance
     * NOTE: There is not guarantee that immediately after the execution
     * all subscriptions have already been released. For this use unsubscribe
     * along with a handler.
     */
    unsubscribeAll: function() {
        var s;
        for (s in this.subscriptions) {
            this.unsubscribe(s);
        }
    },

    /**
     * Get events for the subscribed handlers
     * @param handler {Function} Callback issued on subscribed events.
     *                  The handler must accept one parameter (events)
     *                  of type {Array} of {Object} whereas each element is of the form
     *                      name: {String} The subscribed event name
     *                      properties: {Object} The parameters of the raised event
     * @param timeout {Number} Time (in ms) to listen before aborting
     */
    get: function(handler, timeout) {
        var req = {
            url: this.eventUrl + '/get',
            params: {
                subscriptionID: this.subscriptionId
            },
            success: function(resp) { this.valueHandler(handler, resp); }
        };
        if (timeout) {
            req.params.timeout = timeout;
        }
        this.request(req);
    },

    /** @private Parse the JSON response */
    valueHandler: function(handler, response) {
        try {
            var data = Ext.JSON.decode(response.responseText);
            if (data.ok === true && data.result !== undefined) {
                handler(data.result.events);
            } else {
                this.fireEvent('ajaxError', data.message);
            }
        } catch(syntaxError) {
            this.fireEvent('ajaxError', syntaxError.message);
        }
    }
});

/**
 * @class DSS.ZoneHelper
 * @singleton
 * Helper class for zone related functions
 */
Ext.define('DSS.ZoneHelper', {
    singleton: true,

    /**
     * @private
     * Unlike DSS.json.Base.request, this doesn't fire ajaxError on failure
     */
    request: function(params) {
        Ext.applyIf(params, {
            // default values to be used if not manually specified
            disableCaching: true,
            method: 'GET',
            scope: this,
            timeout: 20000 // 20s timeout
        });
        Ext.Ajax.request(params);
    },

    /**
     * Get the scene IDs that are reachable from a given zone (room) asynchronously
     * Note: The scene with id 5 (dSS scene 1) is not reachable
     * if the zone only contains area buttons
     * @param zoneId {Number} The zone id to query for reachable scenes
     * @param callback {Function} callback of the form
     *      callback({Boolean} success, {Array} reachableScenes);
     */
    getReachableScenes: function(zoneId, callback) {
        this.request({
            url: '/json/zone/getReachableScenes',
            params: { id: zoneId },
            success: function(response, options) {
                var data = Ext.JSON.decode(response.responseText);
                if (data.ok === true) {
                    var rs = data.result.reachableScenes;
                    callback(true, rs);
                    return;
                }
                callback(false);
            },
            failure: function(response, options) {
                callback(false);
            }
        });
    }
});

