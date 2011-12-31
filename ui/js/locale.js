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

/** The gettext settings for translation */
var locale_config = {
    /** Switch to disable gettext translation if undesired */
    disableGt: false,

    /** The translation domain (default is dss-addon) */
    gtDomain: 'dss-addon', 

    /** The GT context (automatically set) */
    gt_ctx: null
};

// ========================================
// Usually nothing below here needs changes
// ========================================

// Check if gettext is disabled
if (!locale_config.disableGt) {
    var params = {
        domain: locale_config.gtDomain,
        locale_data: undefined
    };
    if (typeof(locale_data) != 'undefined') {
        Ext.applyIf(locale_data[locale_config.gtDomain], framework_locale_data['dss-addon-framework']);
        params.locale_data = locale_data;
    }

    locale_config.gt_ctx = new Gettext(params);
}

/**
 * Gettext translation method
 * @param {String} msgid The string to translate
 * @param {String} arg1 Typically the plural form
 * @param {int} arg1 Typically the count
 * @return {String} The translated string if available, otherwise return msgid
 */
function _(msgid, arg1, arg2) {
    if (locale_config.gt_ctx) {
        if (arguments.length === 1) {
            return locale_config.gt_ctx.gettext(msgid);
        } else if (arguments.length === 2) {
            return locale_config.gt_ctx.ngettext(msgid, arg1);
        } else if (arguments.length === 3) {
            return locale_config.gt_ctx.ngettext(msgid, arg1, arg2);
        }
    }
    return msgid;
}

