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
 *  Copyright (c) 2011,2012 Christian Hitz, Switzerland
 *  Author: Christian Hitz <christian@klarinett.li>
 */

var LOGFILE_NAME = "single-user.log";
var LOG = new Logger(LOGFILE_NAME);

function validScene(s) {
    if (s <= 4 || s >= 10 && s <= 16 || s >= 40) {
        return false;
    }
    return true;
}

function startup() {
    // Prepare app
    Property.load();
    LOG.logln("single-user running");

    if (Property.getProperty('version') === null) {
	convert_000_060();
    }
    if (Property.getProperty('version') === '0.6.0') {
        convert_060_070();
    }
    if (Property.getProperty('version') === '0.7.0') {
        convert_070_080();
    }

    Property.setProperty('lastZones', JSON.stringify([]));
}

function convert_000_060() {
    LOG.logln("convert property tree from 0.0.0 to 0.6.0");
    //set version number
    Property.setProperty('version', '0.6.0');
    Property.setFlag('version', 'ARCHIVE', true);
    
    var enabled = Property.getProperty('enabled');
    if (enabled === null) {
        Property.setProperty('enabled', false);
        Property.setFlag('enabled', 'ARCHIVE', true);
    }
}

function convert_060_070() {
    LOG.logln("convert property tree from 0.6.0 to 0.7.0");

    Property.setProperty('ignoreLocalPrio', false);
    Property.setFlag('version', 'ARCHIVE', true);

    Property.setProperty('version', '0.7.0');
}

function convert_070_080() {
    LOG.logln("convert property tree from 0.7.0 to 0.8.0");

    Property.setProperty('zoneSettings', JSON.stringify({}));
    Property.setFlag('zoneSettings', 'ARCHIVE', true);

    Property.setProperty('version', '0.8.0');
}

function modelReady() {
    var activeZones = [];
    var zones = getZones();
    for (var z = 0; z < zones.length; z++) {
        if (!zones[z].present) {
            continue;
        }
        var groupNode = Property.getNode('/apartment/zones/zone' +
                                         zones[z].id + '/groups');
        if (groupNode == undefined) {
            continue;
        }
        var groups = groupNode.getChildren();

        for (var i = 0; i < groups.length; i++) {
            var g = groups[i];
            var gindex = g.getChild('group').getValue();
            if (gindex <= 0 || gindex >= 16) {
                continue;
            }
            var sceneId = g.getChild('lastCalledScene').getValue();
            if (validScene(sceneId)) {
                activeZones[activeZones.length] = zones[z].id;
            }
        }
    }
    LOG.logln('Active zones: ' + JSON.stringify(activeZones));
    Property.setProperty('lastZones', JSON.stringify(activeZones));
}

var IGNORE = 0;
var OFF = 1;
var AUTO_OFF = 2;

function sceneCalled() {
    // these need to be parsed as they are strings!
    var sceneId = parseInt(raisedEvent.parameter.sceneID, 10);
    var zoneId = parseInt(raisedEvent.source.zoneID, 10);
    var groupId = parseInt(raisedEvent.source.groupID, 10);

//    LOG.logln('Debug: scene '+ sceneId + ' called from zone: ' + zoneId
//                + (groupId ? (', group: ' + groupId) : ''));

    if (Property.getProperty('enabled') == false) {
        return;
    }

    var lastZones = JSON.parse(Property.getProperty('lastZones'));
    var zoneSettings = JSON.parse(Property.getProperty('zoneSettings'));

    if ((zoneId == 0) && (groupId == 0) && (sceneId == 0 || sceneId == 68 || sceneId == 72)) {
        // all off
        Property.setProperty('lastZones', JSON.stringify([]));
        return;
    } else if ((groupId != 1) || (zoneId == 0)) {
        return;
    } else if ((sceneId == 0) || (sceneId == 40)) {
        var zoneIndex = lastZones.indexOf(zoneId);
        if (zoneIndex >= 0) {
            // zone was on, now off --> remove from active list
            lastZones.splice(zoneIndex, 1);
        }
        Property.setProperty('lastZones', JSON.stringify(lastZones));
        return;
    } else if (!validScene(sceneId)) {
        return;
    }

    var zoneIndex = lastZones.indexOf(zoneId);
    if (zoneIndex >= 0) {
        // zone is already on: turn-off all others
        lastZones.splice(zoneIndex, 1);
    }

    // ignore actions from zones with IGNORE
    var zoneSetting = zoneSettings[zoneId];
    if (zoneSetting === IGNORE) {
	LOG.logln('ignoring scene call in zone: ' + zoneId);
	return;
    }

    if (lastZones.length > 0) {
        delayedSceneCall(lastZones, 500);
    }

    Property.setProperty('lastZones', JSON.stringify([zoneId]));
}

function delayedSceneCall(lastZones, delay) {
    var zone = lastZones.shift();
    var zoneSettings = JSON.parse(Property.getProperty('zoneSettings'));
    var zoneSetting = zoneSettings[zone];
    if (zoneSetting === IGNORE) {
	LOG.logln('not changing zone: ' + zone);
	if (lastZones.length > 0) {
	    delayedSceneCall(lastZones, delay);
	}
	return;
    } else if ((zoneSetting === undefined) || (zoneSetting === OFF)) {
	LOG.logln('turn off light in zone: ' + zone);
	getZoneByID(zone).callScene(1, 0, Property.getProperty('ignoreLocalPrio'));
    } else if (zoneSetting === AUTO_OFF) {
	LOG.logln('slowly turn off light in zone: ' + zone);
	getZoneByID(zone).callScene(1, 40, Property.getProperty('ignoreLocalPrio'));
    }

    if (lastZones.length > 0) {
        var fn = function() { delayedSceneCall(lastZones, delay); };
        setTimeout(fn, delay);
    }
}

function main() {
    if (raisedEvent.name == 'model_ready') {
        startup();
        modelReady();
        return;

    } else if (raisedEvent.name == 'callScene') {
        sceneCalled();
        return;
    } else if (raisedEvent.name == 'single-user-enable') {
        var enable = raisedEvent.parameter.enable === 'true';

        if (enable) {
            modelReady();
        }
        Property.setProperty('enabled', enable);
        Property.store();
    } else if (raisedEvent.name == 'single-user-set-local-prio') {
        var enable = raisedEvent.parameter.enable === 'true';
        Property.setProperty('ignoreLocalPrio', enable);
        Property.store();
    } else if (raisedEvent.name == 'single-user-zone-config') {
        var zoneId = parseInt(raisedEvent.parameter.zone, 10);
	var setting = parseInt(raisedEvent.parameter.setting, 10);
	var zoneSettings = JSON.parse(Property.getProperty('zoneSettings'));
	zoneSettings[zoneId] = setting;
        Property.setProperty('zoneSettings', JSON.stringify(zoneSettings));
        Property.store();
    }
} // main

main();
