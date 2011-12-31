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
 *  Copyright (c) 2011 Christian Hitz, Switzerland
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

    var version = Property.getNode('version');
    if (version === null) {
        //set version number
        Property.setProperty('version', '0.0.1');
        Property.setFlag('version', 'ARCHIVE', true);
    }

    var enabled = Property.getNode('enabled');
    if (enabled === null) {
        Property.setProperty('enabled', true);
        Property.setFlag('enabled', 'ARCHIVE', true);
    }

    Property.setProperty('lastZones', JSON.stringify([]));
}

function modelReady() {
    var enable = raisedEvent.parameter.enable === 'true';

    if (enable) {
        var zoneNodes = Property.getNode('/apartment/zones');
        var activeZones = [];
        var zones = zoneNodes.getChildren();
        for (i = 0; i < zones.length; i++) {
            var zone = zones[i];
            var zoneId = zone.getChild('ZoneID').getValue();
            var lastSceneNode = zone.getChild('groups/group1/lastCalledScene');
            if (lastSceneNode) {
                var lastScene = lastSceneNode.getValue();
                if (validScene(lastScene)) {
                    activeZones[activeZones.length] = zoneId;
                }
            }
        }
        LOG.logln('Active zones: ' + JSON.stringify(activeZones));
        Property.setProperty('lastZones', JSON.stringify(activeZones));
    }
    Property.setProperty('enabled', enable);
    Property.store();
}

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

    if ((zoneId == 0) && (groupId == 0) && (sceneId == 0 || sceneId == 68 || sceneId == 72)) {
        // all off
        Property.setProperty('lastZones', JSON.stringify([]));
        return;
    } else if ((groupId != 1) || (zoneId == 0)) {
        return;
    } else if (sceneId == 0) {
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

    if (lastZones.length > 0) {
        delayedSceneCall(lastZones, 500);
    }

    Property.setProperty('lastZones', JSON.stringify([zoneId]));
}

function delayedSceneCall(lastZones, delay) {
    var zone = lastZones.shift();
    LOG.logln('zone: ' + zone);
    // TODO: should be forceCallScene
    Apartment.getDevices().byZone(zone).callScene(0);

    if (lastZones.length > 0) {
        var fn = function() { delayedSceneCall(lastZones, delay); };
        setTimeout(fn, delay);
    }
}

function main() {
    if (raisedEvent.name == 'running') {
        startup();
        return;

    } else if (raisedEvent.name == 'callScene') {
        sceneCalled();
        return;
    } else if (raisedEvent.name == 'single-user-enable') {
        modelReady();
    }
} // main

main();
