module.exports = function(RED) {
    ("use strict");

    const HapNodeJS = require("hap-nodejs");
    const API = require("./lib/api.js")(RED);
    const HAPBridgeNode = require("./lib/HAPBridgeNode.js")(RED);
    const HAPAccessoryNode = require("./lib/HAPAccessoryNode.js")(RED);

    // Initialize our storage system
    if (RED.settings.available()) {
        const userDir = RED.settings.userDir;
        HapNodeJS.init(userDir + "/homekit-persist");
    } else {
        HapNodeJS.init();
    }

    // Initialize API
    API.init();
    RED.nodes.registerType("homekit-bridge", HAPBridgeNode.init);
    RED.nodes.registerType("homekit-accessory", HAPAccessoryNode.init);
};
