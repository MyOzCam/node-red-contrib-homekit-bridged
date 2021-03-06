module.exports = function(node) {
    ("use strict");
    const debug = require("debug")("NRCHKB");
    const HapNodeJS = require("hap-nodejs");
    const Characteristic = HapNodeJS.Characteristic;
    
    const initAllCharacteristics = function (node, service, config) {
        let supported = [];
        let requiredCharacteristics = service.characteristics;
        let optionalCharacteristics = service.optionalCharacteristics;

        let characteristicProperties = {};
        if (config.characteristicProperties && config.characteristicProperties.length > 0){
                characteristicProperties = JSON.parse(config.characteristicProperties);
        };

        
        // For all required characteristics, Add listener, init value and add to support list.
        for (let index in requiredCharacteristics) {
            const displayName = requiredCharacteristics[index].displayName.replace(/ /g, "").replace(/\./g, "_"); 
            let characteristic = service.getCharacteristic(Characteristic[displayName])
            
            // add event listener for all required characterisic
            addListener(node, characteristic);

            // load characteristic property if it is available
            if ( characteristicProperties.hasOwnProperty(displayName) ){
                loadInitCharacteristicProperty(characteristic, characteristicProperties[displayName]);
                delete characteristicProperties[displayName];                                                                         
            }
                        
            // add characteriestic to support list for node.input it has perms of PAIRED_READ and/or "NOTIFY"
            if (characteristic.props.perms.indexOf("pr") > -1 ) {
                supported.push(displayName);
            }
        };

        //For all optionalCharacteristices, if characterisitic properties set, add listener, init value and add to support list
        for (let index in optionalCharacteristics){
            const displayName = optionalCharacteristics[index].displayName.replace(/ /g, "").replace(/\./g, "_"); 
            
            // init an optional characterisitics only if it has been requested by characteristic properties
            if ( characteristicProperties.hasOwnProperty(displayName) ){
                // get to create the characterisic from optional characteristic
                let characteristic = service.getCharacteristic(Characteristic[displayName]);
                
                // init with value and/or props
                loadInitCharacteristicProperty(characteristic, characteristicProperties[displayName]);
                delete characteristicProperties[displayName];   
                
                // add listener only if it has been initialized
                addListener(node, characteristic);
                
                // add supported to support list only if it has been initialized, and has perms of PAIRED_READ and/or "NOTIFY"
                if (characteristic.props.perms.indexOf("pr") > -1 ) {
                    supported.push(displayName);
                }     
            } 
        };
        
        // add characteristics remain
        for (let displayName in characteristicProperties){
            if (Characteristic.hasOwnProperty(displayName)){
                let characteristic = service.addCharacteristic(Characteristic[displayName]);
                loadInitCharacteristicProperty(characteristic,characteristicProperties[displayName]);
                addListener(node, characteristic);
                if (characteristic.props.perms.indexOf("pr") > -1 ) {
                    supported.push(displayName);
                }   
            }   
        };
        return supported
    };

    // load characteristic property
    /*--------- Example: --------------
        {
            "On": 1,                                    // Normal single value (setValue)
            "CurrentTemperature":                       // Custom characteristic will be added if not in service
                {"minValue": 20, "minStep":1},          // Properties should be in JSON form (setProps)
            "Brightness":[                              // use Array to include value and properties
                50,
                {"minValue": 50,"minStep": 20}          
            ],
            "CurrentFanState":[                         
                1,
                {"minValue": 0, "validValues":[0,1,2]}  // Some properties support Array
            ]
        }
    ------------------------------------*/    
    
    function loadInitCharacteristicProperty(characteristic, initValue){
        if (initValue === null) {
            // do nothing for null
        } else if (Array.isArray(initValue)){
            for (i=0; i < initValue.length; i++){    // loop for multiple value property    
                if (initValue[i] === null) {
                    // do nothing for null
                } else if (typeof(initValue[i]) === 'object') {
                    characteristic.setProps(initValue[i]);
                } else {
                    characteristic.setValue(initValue[i]);
                }
            }
        } else if (typeof(initValue) === 'object') {
            characteristic.setProps(initValue);
        } else {
            characteristic.setValue(initValue);      // write value to characteric
        }
    };
    
    
    // add event listener based on the perms of characteristic. 
    function addListener(node, characteristic){
        if (characteristic.props.perms.indexOf("ev") > -1) {
                characteristic.on('change', function(info) {
                    const topic = node.topic ? node.topic : node.topic_in;
                    const msg = {payload:{}, hap: info, name: node.name, topic: topic};
                    msg.payload[this.displayName.replace(/ /g, "").replace(/\./g, "_")] = info.newValue;
                    node.send([msg,null,null]);
                });
        };
        // send message to node output when "get" event and only if characteristic has PAIRED_READ (pr)
        if (characteristic.props.perms.indexOf("pr") > -1) {
            characteristic.on('get', function(callback, context) {
                const topic = node.topic ? node.topic : node.topic_in;
                const msg = {payload:{}, hap: {context: context}, name: node.name, topic: topic};
                msg.payload[this.displayName.replace(/ /g, "").replace(/\./g, "_")] = this.value;
                node.send([null,msg,null]);
                callback(null, this.value);
            });
        };
        // send message to node output when "set" event and only if characteristic has PAIRED_WRITE (pw)
        if (characteristic.props.perms.indexOf("pw") > -1) {
            characteristic.on('set', function(newVal, callback, context) {
                const topic = node.topic ? node.topic : node.topic_in;
                const msg = {payload:{}, hap: {newValue:newVal, context: context}, name: node.name, topic: topic};
                msg.payload[this.displayName.replace(/ /g, "").replace(/\./g, "_")] = newVal;
                node.status({
                    fill: "yellow",
                    shape: "dot",
                    text: this.displayName + ": " + newVal
                });
                // Suppress output if message is initiated from onInput
                if (typeof(context) !== 'undefined'){
                    node.send([null,null,msg]);
                }
                callback(null);
            });
        };
    };
    
    return {
        initAllCharacteristics: initAllCharacteristics
    };
};
