(function() {
    var nextId = 1;
    var ports = {};
    var _browser = (!!window.chrome && !!chrome.runtime) ? chrome : browser;
    //var extId = "C3B7563B-BF85-45B7-88FC-7CFF1BD3C2DB";
    var extId = _browser.runtime.id;
    var handlers = {};
    var objId = "C3B7563B-BF85-45B7-88FC-7CFF1BD3C2DB"

    window.addEventListener("message", function (event) {
        if (event.source != window || typeof event.data === "undefined") { return; }

        if (typeof event.data.rutoken === "undefined"
            || typeof event.data.rutoken.ext === "undefined" || event.data.rutoken.ext !== extId
            || typeof event.data.rutoken.source === "undefined" || event.data.rutoken.source !== "webpage"
            || typeof event.data.rutoken.action === "undefined") {
            return;
        }

        var handler = handlers[event.data.rutoken.action];
        if (handler) {
            handler(event.data.rutoken);
        } else {
            console.warn("Unknown action: " + event.data.rutoken.action);
        }
    }, false);

    handlers.initialize = function () {
        includeScript("src/webpage.js").then(function (script) {
            injectScript("(function () {\n" +
                "    var extId = '" + extId + "';\n" +
                "    var objId = '" + objId + "';\n" +
                "    var trash = { firebreath: {extid: extId}};\n" +
                "    var extension = window[objId];\n" +
                "    (function () {\n" +
                script +
                "    }).call();\n" +
                "})();");
        }, function () {
            console.warn("Could not initialize Rutoken extension");
        });
    };

    handlers.createWyrmhole = function () {
        var portName = "FireWyrmPort" + (nextId++);
        var port = _browser.runtime.connect(extId, {name: portName});
        ports[portName] = port;

        window.postMessage({ rutoken: {
            ext: extId,
            source: "content",
            event: "created",
            port: portName
        } }, "*");

        port.onMessage.addListener(function (msg) {
            // Message from the background script received, post it to the page
            window.postMessage({ rutoken: {
                ext: extId,
                source: "content",
                event: "message",
                port: portName,
                message: msg
            } }, "*");
        });

        port.onDisconnect.addListener(function () {
            // The host port disconnected; tell the window
            window.postMessage({ rutoken: {
                ext: extId,
                source: "content",
                event: "disconnected",
                port: portName
            } }, "*");
            delete ports[portName];
        });
    };

    handlers.sendToPort = function (data) {
        var port = data.port;
        if (ports[port]) {
            // Message from the page received, post it to the background script
            ports[port].postMessage(data.message);
        } else {
            console.warn("Invalid port: " + port);
        }
    };

    function includeScript (path) {
        return new Promise(function (resolve, reject) {
            var req = new XMLHttpRequest();

            req.onreadystatechange = function () {
                if (req.readyState == 4) {
                    if (req.status >= 200 && req.status < 300) {
                        resolve(req.responseText);
                    } else {
                        reject(req);
                    }
                }
            };

            req.open("GET", _browser.extension.getURL(path));
            req.send();
        });
    }

    function injectScript (text) {
        var s = document.createElement('script');
        s.appendChild(document.createTextNode(text));
        s.onload = function() {
            this.parentNode.removeChild(this);
        };
        (document.head||document.documentElement).appendChild(s);
    }

    (function () {
        var script = document.createElement('script');
        script.textContent = '(' + function(extId, objId) {
            var extension = window[objId] = {};
            var isIE = /*@cc_on!@*/false || !!document.documentMode;
            var isEdge = !isIE && !!window.StyleMedia;
            if (isEdge)
                window["EdgeExtension_CJSCAktiv-Soft.AdapterRutokenPlugin_d5nnqc4r3dr54"] = extension;
            else
                window["ealcmcikjjkdafcbilgflbmecfcandon"] = extension;
                //window["ohedcglhbbfdgaogjhcclacoccbagkjg"] = extension;
            extension.initialize = function () {
                if (extension.initializePromise) {
                    throw "initialise has already been called";
                }

                extension.initializePromise = {};

                return new Promise(function (resolve, reject) {
                    extension.initializePromise.resolve = resolve;
                    extension.initializePromise.reject = reject;

                    window.postMessage({ rutoken: { ext: extId, source: "webpage", action: "initialize" } }, "*");
                });
            };
        } + ')(' + JSON.stringify(extId) + ',' + JSON.stringify(objId) + ')';
        (document.head || document.documentElement).appendChild(script);
        script.parentNode.removeChild(script);
    }());
})();