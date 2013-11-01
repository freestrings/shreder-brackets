
define(function (require, exports, module) {

    var AppInit = brackets.getModule("utils/AppInit"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        PanelManager = brackets.getModule( "view/PanelManager" ),
        NodeConnection = brackets.getModule("utils/NodeConnection") 
        StatusBar = brackets.getModule("widgets/StatusBar"),
        EditorManager = brackets.getModule("editor/EditorManager"),
        CommandManager = brackets.getModule("command/CommandManager"),
        Commands = brackets.getModule("command/Commands"),
        ProjectManager = brackets.getModule("project/ProjectManager"),
        FileViewController = brackets.getModule("project/FileViewController"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        PreferencesManager  = brackets.getModule( "preferences/PreferencesManager" ),
        FileUtils = brackets.getModule("file/FileUtils"),
        Menus = brackets.getModule("command/Menus");

    var SHREDER_LAUNCH = "shreder.launch";
    var SHREDER_IMPORT = "shreder.import";
    var shrederApiListTemplate = require("text!htmlContent/shreder-api-list.html");
    var shrederPanel = PanelManager.createBottomPanel( "shreder.panel", $(require( "text!htmlContent/api-viewer.html")), 100 );

    var FILE_REG = /\.sd$/;

    var $content, // ".main-view > .content"
        $panel; // #api-viewer

    // manage a multi shreder uis.
    var shrederUIManager = new ShrederUIManager();

    // maven home, ignore rawtype, etc,,,
    var preferences = PreferencesManager.getPreferenceStorage("shreder");

    function initialize() {
        $(EditorManager).on("activeEditorChange", handlePanel);
        // handle rename
        $(DocumentManager).on("fileNameChange", function(e, old, _new) {
            if(!FILE_REG.test(_new) && FILE_REG.test(old)) {
                disablePanel();
            } else {
                enablePanel();
                openResult();
            }
        })
        $(window).on("resize", resizePanel);
        ExtensionUtils.loadStyleSheet( module, "shreder.css" );
        CommandManager.register("Launch Shreder", SHREDER_LAUNCH, launch);
    }
    //callback fn
    function syncSettings() {
        preferences.setValue(this.id, this.value);
        shrederUIManager.refreshCurrent();
    }
    //callback fn
    function filterPattern() {
        shrederUIManager.refreshCurrent(true);
    }
    //callback fn
    function resizePanel() {
        if($panel && $content) {
            $panel.height($content.innerHeight());
            $("#api-viewer-modal-bar").width($panel.width() - 18);
        }
    }

    function enablePanel() {
        $content = $(".main-view > .content");
        $panel = $("#api-viewer");
        $("#editor-holder").height(0);
        shrederPanel.show();
        StatusBar.hide();
        resizePanel();
    }

    function disablePanel() {
        $content = null;
        $panel = null;
        shrederPanel.hide();
    }

    function handlePanel(e, Editor) {
        if(Editor && FILE_REG.test(Editor.document.file.name)) {
            enablePanel();
            openResult();
        } else {
            disablePanel();
        }
    }

    function toggleUI() {
        if(!$("#shreder-main").is(":visible")) {
            CommandManager.get( SHREDER_LAUNCH ).setChecked(true);
            showUI(true);
            if(!$.trim(preferences.getValue("m2-home"))) {
                $("#shreder-settings").show();
            } else {
                $("#shreder-settings").hide();
            }
        } else {
            CommandManager.get( SHREDER_LAUNCH ).setChecked(false);
            showUI(false);
        }
    }

    function showUI(show) {
        show === true ? $("#shreder-main").modal("show") : $("#shreder-main").modal("hide");
    }
    //node callback fn
    function message(msg) {
        var ta = $("#shreder-message")[0];
        ta.value += msg;
        ta.scrollTop = ta.scrollHeight;
    }

    function clearMessage() {
        $("#shreder-message").val("");   
    }

    function showRunning(show) {
        show ? $("#running-status").show() : $("#running-status").hide();
    }

    function launch() {
        toggleUI();
    }

    function doImport() {
        CommandManager.execute(SHREDER_IMPORT, {"url": $("#scm-url").val()});
    }

    function preventImport(prevent) {
        if(prevent) {
            $("#scm-url").attr("disabled", "disabled");
            $("#scm-import").addClass("disabled").attr("disabled", "disabled");
        } else {
            $("#scm-url").removeAttr("disabled");
            $("#scm-import").removeClass("disabled").removeAttr("disabled");
        }
    }

    function isPrevented() {
        return $("#scm-import").hasClass("disabled");
    }

    function showWanning(msg) {
        // TODO 
    }
    
    // function call utility.
    function chain() {
        var functions = Array.prototype.slice.call(arguments, 0);
        if (functions.length > 0) {
            var firstFunction = functions.shift();
            var firstPromise = firstFunction.call();
            firstPromise && firstPromise.done(function () {
                chain.apply(null, functions);
            });
        }
    }

    function openResult() {
        // showWanningoops!
        EditorManager.getCurrentFullEditor()._codeMirror.setOption("readOnly",true);
        
        var doc = DocumentManager.getCurrentDocument();
        FileUtils.readAsText(doc.file).done(function(text, modificationTime) {
            var shrederUI = shrederUIManager.create(doc.file, text);
            shrederUI.render();
        });
    }
    // when import done. 
    function openResultAsDone(param) {

        showUI(false);

        var filePath = param.projectRoot.fullPath.replace(/\/$/, "") + "/" + param.filename + ".sd";
        
        ProjectManager.refreshFileTree();
        $("#project-files-container").on("selectionRedraw", function() {
            $(this).off("selectionRedraw");
            CommandManager.execute(Commands.FILE_ADD_TO_WORKING_SET, { fullPath: filePath });
        });
        
    }

    // FIXME remove 
    //  - The Mustache's rendering result is text.
    function commentFn() {
        var comment = this.comment || "";
        comment = comment.replace(/@/g, "<br>@");
        return function(text) {
            return comment === "" ? "" : "<p class=\"text-info\">" + comment + "</p>" ;
        }
    }

    //TODO restore context
    function ShrederUIManager() {
        this.uis = {};
    }

    ShrederUIManager.prototype.create = function(filePath, text) {
        if(this.uis.hasOwnProperty(filePath)) {
            return this.uis[filePath];
        }
        var ui = new ShrederUI(text);
        this.uis[filePath] = ui;
        ui.render();
        return ui;
    }

    ShrederUIManager.prototype.refresh = function(filePath) {
        this.create(filePath).refresh();
    }

    ShrederUIManager.prototype.refreshCurrent = function(noDelay) {
        var doc = DocumentManager.getCurrentDocument();
        if(doc && this.uis[doc.file]) {
            this.uis[doc.file].refresh(noDelay);
        }
    }

    function ShrederUI(text) {
        this.json = JSON.parse(text);

        // filter a url pattern
        this.json.filterPatternFn = function() {
            
            var context = this;
            context.commentFn = commentFn;

            var val = $.trim($("#shreder-filter-pattern").val());
            var allowed = true;

            if(val) {
                allowed = this.patterns.join(",").toLowerCase().indexOf(val.toLowerCase()) > -1;
            }

            return function(text) {
                return allowed ? Mustache.render(text, context) : "";
            }
        }

        // TODO remove
        for(var i = 0 ; i < this.json.apis.length ; i++) {
            this.json.apis[i]._index = i;
        }
        this.detailTemplate = require("text!htmlContent/shreder-api-detail.html");
        Mustache.compilePartial("object-iterate", require("text!htmlContent/object-iterate.html"))
        this.bindToggleInfo = this.toggleInfo.bind(this);
    }

    ShrederUI.prototype.refresh = function(noDelay) {
        this.render(noDelay);
    } 

    ShrederUI.prototype.render = function(noDelay) {
        this.$root().html("");
        var self = this;
        var func = function() {
            self.$root().html(Mustache.render(require("text!htmlContent/shreder-api-list.html"), self.json));
            self.$root().off("click").on("click", ".media-body .title", self.bindToggleInfo);
        }
        if(noDelay) {
            func();
        } else {
            setTimeout(func, 0);
        }
        
    }

    ShrederUI.prototype.$root = function() {
        return $("#shreder-content");
    }

    ShrederUI.prototype.toggleInfo = function(e) {
        var target = $(e.target);
        var wrap = target.closest("[data-index]");
        var detail = wrap.find("*[data-id='detail']").first();
        if(target.hasClass("open")) {
            target.removeClass("open");
            detail.html("");
        } else {

            target.addClass("open");
            
            var index = wrap.attr("data-index");
            var api = this.json.apis[index];
            var self = this;

            function toString(object) {
                var txt = JSON.stringify(object).replace(/[{}]/g, " ");
                return txt.replace(/,/g, ", ").replace(/:/g, " : ");
            }
 
            function fixVariable(data) {
                if(!data) {
                    return ;
                }
                if(!data._originType) {
                    data._originType = data.type;
                }
                if(data.members) {
                    data.members.forEach(function(v) {
                        //to find ref type
                        v.parent = data;
                        fixVariable(v);
                    });
                } else {
                    // solve circuala problem of mustache.js.
                    data.members = false;
                }
            }

            function isMadatoryFn() {

                var context = this;
                var isMandatory = false;

                if(typeof context.annotations === "object") {

                    var annotations = context.annotations;

                    for(var k in annotations) {
                        if(k === 'RequestParam' && !!annotations[k].required === true) {
                            isMandatory = true;
                            break;
                        } else if(k === 'NotNull') {
                            isMandatory = true;
                            break;
                        }
                    }
                    
                }

                return function(text) {
                    return isMandatory ? Mustache.render(text, context) : "";
                }

            }

            function defaultValueFn() {

                var context = this;
                var defaultValue = ((context.annotations || {}).RequestParam || {}).defaultValue;
                
                return function(text) {
                    return !!defaultValue ? Mustache.render(text, {"defaultValue": defaultValue}) : "";
                }
            }

            function rawTypeHandle(rawtype, text, context) {
                var ret = [];
                ret.push("<style>.");
                ret.push(rawtype);
                ret.push("{ display: inline-block !important;}</style>");
                ret.push(Mustache.render(text, context));
                return ret.join("");
            }

            function rawTypeFn() {
                var context = this;
                var rawType = this.rawType || "";
                var cssName = rawType.replace(/\./g, "-").toLowerCase();
                return function() {
                    return cssName;
                }
            }

            api.filterFn = function() {

                var context = this;

                this.annotationFn = annotationFn;
                this.rawTypeFn = rawTypeFn;
                this.isMadatoryFn = isMadatoryFn;
                this.defaultValueFn = defaultValueFn;
                this.commentFn = commentFn;

                var ignoredSettings = $.trim(preferences.getValue("ignored-classes") || "");
                if(this.rawType && ignoredSettings) {
                    var patterns = this.rawType;
                    var ignored = false;
                    var ignores = ignoredSettings.split(",");
                    for(var i = 0 ; i < ignores.length ; i++) {
                        if(patterns.indexOf(ignores[i]) > -1) {
                            ignored = true;
                            break;
                        }
                    }
                    if(ignored) {
                        context.members = false;
                        var rawtype = rawTypeFn.apply(context)();
                        return function(text) {
                            return rawTypeHandle(rawtype, text, context);
                        }
                    }
                }

                if(typeof (context.annotations || {}).RequestBody === 'object') {
                    return function() {
                        return "- @RequestBody";
                    }
                }

                if(context._originType === 'array' ) {
                    var members = context.members;
                    if($.isArray(members) && members.length > 0) {
                        members[0].name = context.name;
                        members[0].type = "[ ] " + (members[0]._originType || "object");
                        members[0].comment = context.comment;
                    }
                    return function(text) {
                        return "";
                    }
                } else if (context._originType === "enum") { 
                    var ret = [];
                    if(context.members) {
                        context.members.forEach(function(v) {
                            ret.push(v.name);
                        });
                        context.type += " (" + JSON.stringify(ret).replace(/[\[\]"]/g, '') + ")";
                        context.type = context._originType + (" (" + JSON.stringify(ret).replace(/[\[\]"]/g, '') + ")").replace(/,/g, "|");
                        context.members = false;
                    }
                    return function(text) {
                        return Mustache.render(text, context);
                    }
                } else if(context._originType === "ref") {
                    var t = context.parent;
                    var isList = context.parent && context.parent._originType === 'array';
                    while(t && t.rawType !== context.rawType) {
                        t = t.parent;
                    }
                    if(t) {
                        context.type = (isList ? "[ ] " : "")+  "#reference \"" + t.name + "\"";
                    }
                    return function(text) {
                        return Mustache.render(text, context);
                    }    
                } else {
                    return function(text) {
                        return Mustache.render(text, context);
                    }
                }

            }

            function annotationFn() {

                var context = this;
                var ret = [];

                if(typeof context.annotations === "object") {
                    Object.keys(context.annotations).forEach(function(k) {
                        if(k === 'PathVariable' || k === 'RequestBody' || k === 'RequestParam' || k === 'NotNull') {
                            //do nothing
                        } else {
                            var o = Object.create(null);
                            o.name = k;
                            o.value = " " + toString(context.annotations[k]);
                            ret.push(o);
                        }

                    });
                }

                if(typeof context.optionalAnnotations === "object") {
                    Object.keys(context.optionalAnnotations).forEach(function(k) {
                        if(k !== 'Valid') {
                            var o = Object.create(null);
                            o.name = k;
                            o.value = " " + toString(context.optionalAnnotations[k]);
                            ret.push(o);
                        }
                    });
                }

                return function(text) {
                    return Mustache.render(text, ret);
                }
            }

            fixVariable(api.request);
            fixVariable(api.response);

            detail.html(Mustache.render(this.detailTemplate, api));
        }
    }

    AppInit.htmlReady(function() {

        var apiVersion = brackets.metadata.apiVersion;
        var version = apiVersion.split(".");
        version.pop()
        version = "v" + version.join("").replace(/\./g, "");
        $("body").append(Mustache.render(require("text!htmlContent/main.html"), {"version": version}));
        $("#shreder-settings input").on("keyup", syncSettings);
        $("#shreder-settings input").each(function() {
            this.value = preferences.getValue(this.id) || "";
        });
        // attach launch-icon
        $("#main-toolbar > .buttons").append(require("text!htmlContent/launch-icon.html"));
        $("#shreder-filter-pattern").on("keyup", filterPattern);
        $("#shreder-launch").on("click", function() {
            CommandManager.execute(SHREDER_LAUNCH);
        });
        $("#message-clear").on("click", clearMessage);
        $("#shreder-main *[data-toggle='folding']").on("click", function() {
            $($(this).attr("href")).toggle();
        });
        $("#shreder-main form").on("submit", function(e) {
            e.preventDefault();
            if(!isPrevented()) {
                preventImport(true);
                doImport();
            }
        });

        $("#sidebar").on("panelResizeUpdate panelCollapsed panelExpanded", resizePanel);
    });

    AppInit.appReady(function() {

        Menus.getMenu( Menus.AppMenuBar.VIEW_MENU ).addMenuItem(SHREDER_LAUNCH);

        var nodeConnection = new NodeConnection();

        $(nodeConnection).on("shreder.status", function(e, rep) {
            var state = rep.state;
            if(state === 'running') {

            } else if(state === 'done') {
                preventImport(false);
                showRunning(false);
            } else if(state === 'error') {
                showWanning(rep.message);
            } else if(state === 'result') {
                openResultAsDone(JSON.parse(rep.message));
            }
            message(rep.message);
        });

        function runShreder(param) {
            param.projectRoot = ProjectManager.getProjectRoot();
            param.filename = new Date().getTime();
            param.m2Home = preferences.getValue("m2-home");
            nodeConnection.domains.shreder.isRunning()
                .fail(function(err) {
                    console.error("[shreder] Fail: 'isRunning'", err);
                    preventImport(false);
                })
                .done(function(isRunning) {
                    if(!isRunning) {
                        nodeConnection.domains.shreder.run(param)
                            .fail(function (err) {
                                console.error("[shreder] Fail: 'run'", err);
                                nodeConnection.domains.shreder.cleanStatus().always(function() {
                                    preventImport(false);
                                });
                            })
                            .done(function () {
                                console.log("[shreder] called.");
                                showRunning(true);
                            });   
                    } else {
                        console.log("[shreder] Already running.");
                    }
                });
        }

        function connect() {
            var connectionPromise = nodeConnection.connect(true);
            connectionPromise.fail(function () {
                console.error("[shreder] Fail: 'connect'");
            });
            return connectionPromise;
        }

        function loadDomain() {
            var path = ExtensionUtils.getModulePath(module, "node/ShrederLauncher");
            var loadPromise = nodeConnection.loadDomains([path], true);
            loadPromise.fail(function () {
                console.error("[shreder] Fail: 'loadDomain'");
            });
            return loadPromise;
        }

        CommandManager.register("Import Shreder", SHREDER_IMPORT, runShreder);
        chain(connect, loadDomain);
        
    });
    
    initialize();

});