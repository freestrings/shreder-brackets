(function () {

    var $childProcess = require('child_process'),
    	$fs = require('fs'),
    	$path = require("path");

    var _resourceDir = $path.join(__dirname, "..", "tools");
    var _isRunning = false;
    var _DomainManager;

    function initialize(DomainManager) {

        _DomainManager = DomainManager;

    	if (!DomainManager.hasDomain("shreder")) {
            DomainManager.registerDomain("shreder", {major: 0, minor: 1});
        }

        DomainManager.registerCommand("shreder", "run", run, false, 
            "Run Shreder", [], 
            [{name: "run",type: "",description: "Run Shreder!"}]
        );

        DomainManager.registerCommand("shreder", "isRunning", isRunning, false, 
            "Check running status", [], 
            [{name: "isRunning", type: "", description: "Check running status"}]
        );

        DomainManager.registerEvent("shreder", "status", [{name: "status", type: "", description: "Trace running"}]);
    }

    function isRunning() {
        return _isRunning;
    }

    function run(param) {
    	process.chdir(_resourceDir);
    	_getLauncher(_run, param);
    }

    function _message(state, msg) {
        _DomainManager.emitEvent("shreder", "status", {"state": state, "message": msg});
    }

    function _getLauncher(func, param) {
    	$fs.readdir(_resourceDir, function(err, _files) {
			var files = _files.filter(function(file) {
				return file.indexOf("dependencies") > -1
			}).sort();
			if(files.length > 0) {
				func(files[files.length - 1], param);
			}
		});
    }

    function _run(jarName, param) {

        if(_isRunning == true) {
            return;
        }

        _message("running", "\n<<SCM URL: " + param.url + ">>\n\n");

        var args = [];

        if(param.url) {
            args.push("-Dshreder.scm=" + param.url);
        }
        if(param.m2Home) {
            args.push("-Dshreder.maven.home=" + param.m2Home);
        }
        if((param.projectRoot || {}).fullPath) {
            args.push("-Dshreder.result2=" + param.projectRoot.fullPath);
        }
        if(param.filename) {
            args.push("-Dshreder.filename=" + param.filename);
        }

    	var _process = $childProcess.spawn("java", args.concat([
        		"-jar",
        		jarName
    		])
        );

    	_process.on("close", function(code, msg) {
	        if(code === 1) {
                _message("error", "\n");
                _message("done", (msg || "") + "\n");
	        } else {
                _message("done", (msg || "") + "\n");
                if(msg !== 'SIGABRT') {
                    _message("result", JSON.stringify(param));
                }
            }
            _isRunning = false;
    	});

    	_process.stderr.on("data", function(err) {
            _message("error", String(err) + "\n");
            _process.kill("SIGABRT");
            _isRunning = false;
        });

        _process.stdout.on("data", function(buf) {
            _isRunning = true;
            _message("running", String(buf));
        });
    }

    exports.init = initialize;

}());
