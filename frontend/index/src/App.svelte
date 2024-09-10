<script lang="ts">
    import {onMount} from "svelte";
    import ace from 'ace-builds';
    import * as api from "./lib/api";

    // TODO: make it local variable
    let xmlHttp = null;

    function addButton(but, element) {
        var newButton = document.createElement("button");
        newButton.innerHTML = but;
        newButton.classList.add('buttons');
        document.getElementById(element).appendChild(newButton);
        return newButton;
    }

    function createFileUploader(element, tree, editor) {
        var input = document.getElementById("file");
        input.type = "file";
        input.multiple = false;
        input.name = "data";
        var path = document.createElement("input");
        path.id = "upload-path";
        path.type = "text";
        path.name = "path";
        path.defaultValue = "/";
        path.classList.add('input-box');
        document.getElementById(element).appendChild(path);

        var uploadButton = addButton("Upload", element);
        var mkdir = addButton("MkDir", element);
        var mkfile = addButton("MkFile", element);
        var saveFile = addButton("Save", element);
        var restartDev = addButton("Restart", element);
        var restartToWifi = addButton("To Wifi", element);
        var gaugeButton = addButton("Gauge", element);
        var uploadLabel = document.createElement("label");
        uploadLabel.innerHTML = '';
        document.getElementById(element).appendChild(uploadLabel);

        function httpPostProcessRequest() {
            if (xmlHttp.readyState == 4) {
                if (xmlHttp.status != 200) alert("ERROR[" + xmlHttp.status + "]: " + xmlHttp.responseText);
                else {
                    tree.refreshPath(path.value);
                }
            }
        }

        async function createPath(p) {
            await api.createFile(p);
            tree.refreshPath(path.value);
        }

        mkfile.onclick = function (e) {
            if (path.value.indexOf(".") === -1) return;
            createPath(path.value);
            editor.loadUrl(path.value);
        };

        saveFile.onclick = function (e) {
            editor.execCommand("saveCommand");
        };

        restartDev.onclick = async function (e) {
            setTimeout(() => {
                // 4 second delay here before running next line
                console.log("delayed");
                tree.refreshPath(path.value);
            }, 4000);

            await api.get("/restart");
            tree.refreshPath(path.value);
        };

        restartToWifi.onclick = async function (e) {
            setTimeout(() => {
                // 4 second delay here before running next line
                console.log("delayed");
                tree.refreshPath(path.value);
            }, 4000);

            await api.get("/restartToWifi");
            tree.refreshPath(path.value);
        };

        gaugeButton.onclick = function (e) {
            var newUrl = `http://${window.location.hostname}/wifi/gauge.html`;
            window.open(newUrl, '_blank');
        };

        mkdir.onclick = function (e) {
            if (path.value.length < 2) return;
            var dir = path.value
            if (dir.indexOf(".") !== -1) {
                if (dir.lastIndexOf("/") === 0) return;
                dir = dir.substring(0, dir.lastIndexOf("/"));
            }
            createPath(dir);
        };

        uploadButton.onclick = async function (e) {
            if (input.files.length === 0) {
                return;
            }

            await api.upsertFile(path.value, input.files[0]);
            tree.refreshPath(path.value);
        }

        input.onchange = function (e) {
            if (input.files.length === 0) return;
            var filename = input.files[0].name;
            var ext = /(?:\.([^.]+))?$/.exec(filename)[1];
            var name = /(.*)\.[^.]+$/.exec(filename)[1];
            if (typeof name !== undefined) {
                if (filename.length > 18) name = name.substring(0, 18 - ext.length);
                filename = name;
            }
            if (typeof ext !== undefined) {
                if (ext === "html") ext = "htm";
                else if (ext === "jpeg") ext = "jpg";
                else if (ext === "bin") filename = "update";
                filename = filename + "." + ext;
            }
            if (path.value === "/" || path.value.lastIndexOf("/") === 0) {
                path.value = "/" + filename;
            } else {
                path.value = path.value.substring(0, path.value.lastIndexOf("/") + 1) + filename;
            }
        }
    }

    function createTree(element, editor) {
        var preview = document.getElementById("preview");
        var treeRoot = document.createElement("div");
        treeRoot.className = "css-treeview";
        document.getElementById(element).appendChild(treeRoot);

        function loadDownload(path) {
            document.getElementById('download-frame').src = path + "?download=true";
        }

        function loadPreview(path) {
            document.getElementById("editor").style.display = "none";
            preview.style.display = "block";
            preview.innerHTML = '<img src="' + path + '" style="max-width:100%; max-height:100%; margin:auto; display:block;" />';
        }

        function fillFolderMenu(el, path) {
            var list = document.createElement("ul");
            el.appendChild(list);
            var action = document.createElement("li");
            list.appendChild(action);
            var isChecked = document.getElementById(path).checked;
            var expnd = document.createElement("li");
            list.appendChild(expnd);
            if (isChecked) {
                expnd.innerHTML = "<span>Collapse</span>";
                expnd.onclick = function (e) {
                    document.getElementById(path).checked = false;
                    if (document.body.getElementsByClassName('contextMenu').length > 0) document.body.removeChild(el);
                };
                var refrsh = document.createElement("li");
                list.appendChild(refrsh);
                refrsh.innerHTML = "<span>Refresh</span>";
                refrsh.onclick = function (e) {
                    var leaf = document.getElementById(path).parentNode;
                    if (leaf.childNodes.length == 3) leaf.removeChild(leaf.childNodes[2]);
                    httpGet(leaf, path);
                    if (document.body.getElementsByClassName('contextMenu').length > 0) document.body.removeChild(el);
                };
            } else {
                expnd.innerHTML = "<span>Expand</span>";
                expnd.onclick = function (e) {
                    document.getElementById(path).checked = true;
                    var leaf = document.getElementById(path).parentNode;
                    if (leaf.childNodes.length == 3) leaf.removeChild(leaf.childNodes[2]);
                    httpGet(leaf, path);
                    if (document.body.getElementsByClassName('contextMenu').length > 0) document.body.removeChild(el);
                };
            }
            var upload = document.createElement("li");
            list.appendChild(upload);
            upload.innerHTML = "<span>Upload</span>";
            upload.onclick = function (e) {
                var pathEl = document.getElementById("upload-path");
                if (pathEl) {
                    var subPath = pathEl.value;
                    if (subPath.lastIndexOf("/") < 1) pathEl.value = path + subPath;
                    else pathEl.value = path.substring(subPath.lastIndexOf("/")) + subPath;
                }
                if (document.body.getElementsByClassName('contextMenu').length > 0) document.body.removeChild(el);
            };
            var delFile = document.createElement("li");
            list.appendChild(delFile);
            delFile.innerHTML = "<span>Delete</span>";
            delFile.onclick = function (e) {
                httpDelete(path);
                if (document.body.getElementsByClassName('contextMenu').length > 0) document.body.removeChild(el);
            };
        }

        function fillFileMenu(el, path) {
            var list = document.createElement("ul");
            el.appendChild(list);
            var action = document.createElement("li");
            list.appendChild(action);
            if (isTextFile(path)) {
                action.innerHTML = "<span>Edit</span>";
                action.onclick = function (e) {
                    editor.loadUrl(path);
                    if (document.body.getElementsByClassName('contextMenu').length > 0) document.body.removeChild(el);
                };
            } else if (isImageFile(path)) {
                action.innerHTML = "<span>Preview</span>";
                action.onclick = function (e) {
                    loadPreview(path);
                    if (document.body.getElementsByClassName('contextMenu').length > 0) document.body.removeChild(el);
                };
            }
            var download = document.createElement("li");
            list.appendChild(download);
            download.innerHTML = "<span>Download</span>";
            download.onclick = function (e) {
                loadDownload(path);
                if (document.body.getElementsByClassName('contextMenu').length > 0) document.body.removeChild(el);
            };
            var delFile = document.createElement("li");
            list.appendChild(delFile);
            delFile.innerHTML = "<span>Delete</span>";
            delFile.onclick = function (e) {
                httpDelete(path);
                if (document.body.getElementsByClassName('contextMenu').length > 0) document.body.removeChild(el);
            };
        }

        function showContextMenu(e, path, isfile) {
            var divContext = document.createElement("div");
            var scrollTop = document.body.scrollTop ? document.body.scrollTop : document.documentElement.scrollTop;
            var scrollLeft = document.body.scrollLeft ? document.body.scrollLeft : document.documentElement.scrollLeft;
            var left = e.clientX + scrollLeft;
            var top = e.clientY + scrollTop;
            divContext.className = 'contextMenu';
            divContext.style.display = 'block';
            divContext.style.left = left + 'px';
            divContext.style.top = top + 'px';
            if (isfile) fillFileMenu(divContext, path);
            else fillFolderMenu(divContext, path);
            document.body.appendChild(divContext);
            var width = divContext.offsetWidth;
            var height = divContext.offsetHeight;
            divContext.onmouseout = function (e) {
                if (e.clientX < left || e.clientX > (left + width) || e.clientY < top || e.clientY > (top + height)) {
                    if (document.body.getElementsByClassName('contextMenu').length > 0) document.body.removeChild(divContext);
                }
            };
        }

        function createTreeLeaf(path, name, size) {
            var leaf = document.createElement("li");
            leaf.id = (((path == "/") ? "" : path) + "/" + name).toLowerCase();
            var label = document.createElement("span");
            label.textContent = name.toLowerCase();
            leaf.appendChild(label);
            leaf.onclick = function (e) {
                if (isTextFile(leaf.id)) {
                    editor.loadUrl(leaf.id);
                } else if (isImageFile(leaf.id)) {
                    loadPreview(leaf.id);
                }
            };
            leaf.oncontextmenu = function (e) {
                e.preventDefault();
                e.stopPropagation();
                showContextMenu(e, leaf.id, true);
            };
            return leaf;
        }

        function createTreeBranch(path, name, disabled) {
            var leaf = document.createElement("li");
            var check = document.createElement("input");
            check.type = "checkbox";
            check.id = (((path == "/") ? "" : path) + "/" + name).toLowerCase();
            if (typeof disabled !== "undefined" && disabled) check.disabled = "disabled";
            leaf.appendChild(check);
            var label = document.createElement("label");
            label.for = check.id;
            label.textContent = name.toLowerCase();
            leaf.appendChild(label);
            check.onchange = function (e) {
                if (check.checked) {
                    if (leaf.childNodes.length == 3) leaf.removeChild(leaf.childNodes[2]);
                    httpGet(leaf, check.id);
                }
            };
            label.onclick = function (e) {
                if (!check.checked) {
                    check.checked = true;
                    if (leaf.childNodes.length == 3) leaf.removeChild(leaf.childNodes[2]);
                    httpGet(leaf, check.id);
                } else {
                    check.checked = false;
                }
            };
            leaf.oncontextmenu = function (e) {
                e.preventDefault();
                e.stopPropagation();
                showContextMenu(e, check.id, false);
            }
            return leaf;
        }

        function addList(parent, path, items) {
            var list = document.createElement("ul");
            parent.appendChild(list);
            var ll = items.length;
            for (var i = 0; i < ll; i++) {
                var item = items[i];
                var itemEl;
                if (item.type === "file") {
                    itemEl = createTreeLeaf(path, item.name, item.size);
                } else {
                    itemEl = createTreeBranch(path, item.name);
                }
                list.appendChild(itemEl);
            }

        }

        function isTextFile(path) {
            var ext = /(?:\.([^.]+))?$/.exec(path)[1];
            if (typeof ext !== undefined) {
                switch (ext) {
                    default:
                        return true;
                }
            }
            return false;
        }

        function isImageFile(path) {
            var ext = /(?:\.([^.]+))?$/.exec(path)[1];
            if (typeof ext !== undefined) {
                switch (ext) {
                    case "png":
                    case "jpg":
                    case "gif":
                    case "ico":
                        return true;
                }
            }
            return false;
        }

        async function httpDelete(filePath: string) {
            await api.deleteFile(filePath);

            if (filePath.lastIndexOf('/') < 1) {
                filePath = '/';
                treeRoot.removeChild(treeRoot.childNodes[0]);
                await httpGet(treeRoot, "/");
            } else {
                filePath = filePath.substring(0, filePath.lastIndexOf('/'));
                const leaf = document.getElementById(filePath).parentNode;
                if (leaf.childNodes.length == 3) leaf.removeChild(leaf.childNodes[2]);
                await httpGet(leaf, filePath);
            }
        }

        async function httpGet(parent, path) {
            addList(parent, path, await api.listDir(path));
        }

        httpGet(treeRoot, "/");

        const returnObj = {};

        returnObj.refreshPath = function (path) {
            if (path.lastIndexOf('/') < 1) {
                path = '/';
                if (treeRoot.childNodes[0]) {
                    treeRoot.removeChild(treeRoot.childNodes[0]);
                    httpGet(treeRoot, "/");
                } else createTree("tree", editor);
            } else {
                path = path.substring(0, path.lastIndexOf('/'));
                var leaf = document.getElementById(path).parentNode;
                if (leaf.childNodes.length == 3) leaf.removeChild(leaf.childNodes[2]);
                httpGet(leaf, path);
            }
        };

        return returnObj;
    }

    function createEditor(element, file, lang, theme, type) {
        function getLangFromFilename(filename) {
            var lang = "plain";
            var ext = /(?:\.([^.]+))?$/.exec(filename)[1];
            if (typeof ext !== undefined) {
                switch (ext) {
                    case "txt":
                        lang = "plain";
                        break;
                    case "htm":
                        lang = "html";
                        break;
                    case "js":
                        lang = "javascript";
                        break;
                    case "c":
                        lang = "c_cpp";
                        break;
                    case "cpp":
                        lang = "c_cpp";
                        break;
                    default:
                    case "css":
                    case "scss":
                    case "php":
                    case "html":
                    case "json":
                    case "xml":
                        lang = ext;
                }
            }
            return lang;
        }

        // TODO: its temporary solution
        if (typeof file === "undefined") file = api.API_URL + "/index.htm";

        if (typeof lang === "undefined") {
            lang = getLangFromFilename(file);
        }

        if (typeof theme === "undefined") theme = "dracula";

        if (typeof type === "undefined") {
            type = "text/" + lang;
            if (lang === "c_cpp") type = "text/plain";
        }

        var editor = ace.edit(element);

        async function httpGet(theUrl: string) {
            // TODO: its temporary solution
            theUrl = theUrl.replaceAll(api.API_URL, "");

            try {
                const res = await api.get(theUrl);

                document.getElementById("preview").style.display = "none";
                document.getElementById("editor").style.display = "block";

                editor.setValue(res);
            } catch (e) {
                editor.setValue("");
            } finally {
                editor.clearSelection();
            }
        }

        if (lang !== "plain") editor.getSession().setMode("ace/mode/" + lang);
        editor.setTheme("ace/theme/" + theme);
        editor.$blockScrolling = Infinity;
        editor.getSession().setUseSoftTabs(true);
        editor.getSession().setTabSize(2);
        editor.setHighlightActiveLine(true);
        editor.setShowPrintMargin(false);
        editor.commands.addCommand({
            name: 'saveCommand',
            bindKey: {win: 'Ctrl-S', mac: 'Command-S'},
            exec: function (editor) {
                api.upsertFile(file, editor.getValue() + "", type);
            },
            readOnly: false
        });
        editor.commands.addCommand({
            name: 'undoCommand',
            bindKey: {win: 'Ctrl-Z', mac: 'Command-Z'},
            exec: function (editor) {
                editor.getSession().getUndoManager().undo(false);
            },
            readOnly: false
        });
        editor.commands.addCommand({
            name: 'redoCommand',
            bindKey: {win: 'Ctrl-Shift-Z', mac: 'Command-Shift-Z'},
            exec: function (editor) {
                editor.getSession().getUndoManager().redo(false);
            },
            readOnly: false
        });
        httpGet(file);
        editor.loadUrl = function (filename) {
            file = filename;
            lang = getLangFromFilename(file);
            type = "text/" + lang;
            if (lang !== "plain") editor.getSession().setMode("ace/mode/" + lang);
            httpGet(file);
        }
        return editor;
    }


    var tree;
    var editor;
    onMount(() => {
        var vars: any = {};
        var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
            vars[key] = value;
        });
        editor = createEditor("editor", vars.file, vars.lang, vars.theme);
        tree = createTree("tree", editor);
        createFileUploader("uploader", tree, editor);
    });

</script>

<div id="uploader">
    <input type="file" name="file" id="file" class="inputfile"/>
    <label class="flabel" for="file">Load file</label>
</div>
<div id="tree"></div>
<div id="editor"></div>
<div id="preview" style="display:none;"></div>

<iframe title="download" id=download-frame style='display:none;'></iframe>
