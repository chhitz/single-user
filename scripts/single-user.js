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

    Property.setProperty('lastZone', 0);
}

function modelReady() {
    var enable = raisedEvent.parameter.enable === 'true';

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

    if ((zoneId == 0) && (groupId == 0) && (sceneId == 68 || sceneId == 72)) {
        // all off
        Property.setProperty('lastZone', 0);
        return;
    } else if ((groupId != 1) || (sceneId == 0) || (zoneId == 0)) {
        return;
    }

    var lastZone = Property.getProperty('lastZone');
    if (lastZone == 0) {
        Property.setProperty('lastZone', zoneId);
        return;
    }

    if (lastZone == zoneId) {
        // same zone: do nothing
        return;
    }

    if (validScene(sceneId)) {
        Apartment.getDevices().byZone(lastZone).callScene(0);
    }

    Property.setProperty('lastZone', zoneId);
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
