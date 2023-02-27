const crypto = require("crypto");
const nativeTheme = require("electron");
const { timeStamp, time } = require("console");
const {Live2DModel} = require("pixi-live2d-display");
const constants = require("constants");
const os = require('os');

nativeTheme.themeSource = "dark";

// Parameters
const datasetRoot = "dataset"; // Root of dataset directory
const outputRoot = "output"; // Root of output directory
const blacklistPath = require("path").join(outputRoot, "blacklist.txt"); // Blacklist path
const baseResolution = 1024;
const ignoreGeneratedJson = true; // Ignore the generated JSON file
const ignoreOriginalJson = true; // Ignore the original JSON file
const batchOperationMinDelay = 1000;
const batchOperationDelayRange = 1000;

const isMac = os.platform() === "darwin";
const isWindows = os.platform() === "win32";
const isLinux = os.platform() === "linux";

const separateChar = isWindows ? '\\' : '/';

let thisRef = this;
let modelJsonIds = {};

let getPartIDs = function (modelImpl) {
    let partIDs = [];
    const partsDataList = modelImpl._$Xr();
    partsDataList.forEach((element) => {
        partIDs.push(element._$NL.id);
    });
    return partIDs;
};

const getParamIDs = function (modelImpl) {
    let paramIDs = [];
    const paramDefSet = modelImpl._$E2()._$4S;
    paramDefSet.forEach((element) => {
        paramIDs.push(element._$wL.id);
    });
    return paramIDs;
};

// JavaScriptで発生したエラーを取得
window.onerror = function (msg, url, line, col, error) {
    const err = "file:" + url + "<br>line:" + line + " " + msg;
    l2dError(err);
};

function viewer() {
    this.platform = window.navigator.platform.toLowerCase();

    this.live2DMgr = new LAppLive2DManager();

    this.isDrawStart = false;

    this.gl = null;
    this.canvas = document.getElementById('glcanvas');

    this.dragMgr = null; /*new L2DTargetPoint();*/ // ドラッグによるアニメーションの管理
    this.viewMatrix = null; /*new L2DViewMatrix();*/
    this.projMatrix = null; /*new L2DMatrix44()*/
    this.deviceToScreen = null; /*new L2DMatrix44();*/

    this.drag = false; // ドラッグ中かどうか
    this.oldLen = 0; // 二本指タップした時の二点間の距離

    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.isModelShown = false;

    this.isPlay = true;
    this.isLookRandom = false;
    this.frameCount = 0;

    this.selectedPath = datasetRoot;
    this.outputPath = outputRoot;
    this.modelName = "";
    this.ignoredPart = [];
    this.partsBtn = [];

    // Shortcut keys
    document.addEventListener("keydown", function (e) {
        let keyCode = e.keyCode;
        if (keyCode === 90) {
            // z key
            viewer.changeModel(-1);
        } else if (keyCode === 88) {
            // x key
            viewer.changeModel(1);
        } else if (keyCode === 32) {
            // space key
            viewer.flagBlacklist();
        }
    });

    this.blacklist = [];
    if (fs.existsSync(blacklistPath)) {
        this.blacklist = fs.readFileSync(blacklistPath).toString().split("\n");
        // Append datasetRoot to the paths
        this.blacklist.forEach((item, index) => {
            this.blacklist[index] = path.join(datasetRoot, item);
        });
    }

    // モデル描画用canvasの初期化
    viewer.initL2dCanvas("glcanvas");

    // モデル用マトリクスの初期化と描画の開始
    viewer.init();
}

viewer.goto = function () {
    live2DMgr.count = parseInt(document.getElementById("editGoto").value) - 1;
    viewer.changeModel(0);
};

viewer.save = function (filepath) {
    // Save canvas to png file
    const paths = path.dirname(this.selectedPath);
    thisRef.modelName = paths.substring(paths.lastIndexOf(separateChar) + 1);
    const dir = filepath || path.join(thisRef.outputPath, `${thisRef.modelName}.png`);

    const canvas = this.canvas;
    let img = canvas.toDataURL();
    let data = img.replace(/^data:image\/\w+;base64,/, "");
    let buf = Buffer.from(data, "base64");
    fs.mkdirSync(thisRef.outputPath, { recursive: true });
    fs.writeFileSync(dir, buf);
    console.log('save image success: path - ' + dir);
}

viewer.saveLayer = function(dirpath) {
    // Create dir
    const paths = path.dirname(this.selectedPath);
    thisRef.modelName = paths.substring(paths.lastIndexOf(separateChar) + 1);
    const dir = dirpath || path.join(thisRef.outputPath, thisRef.modelName, 'layer');
    fs.mkdirSync(dir, { recursive: true });

    // Keep previous playing state, and set to pause to stop calling draw()
    let prevIsPlay = isPlay;
    isPlay = false;

    // Remember to update the model before calling getElementList()
    let model = live2DMgr.getModel(0);
    model.update(frameCount);
    let elementList = model.live2DModel.getElementList();

    // Save images for each element
    MatrixStack.reset();
    MatrixStack.loadIdentity();
    MatrixStack.multMatrix(projMatrix.getArray());
    MatrixStack.multMatrix(viewMatrix.getArray());
    MatrixStack.push();

    // Draw an image with all elements
    viewer.save(path.join(dir, "all.png"));

    elementList.forEach((item, index) => {
        let element = item.element;
        let partID = item.partID;
        let order = ("000" + index).slice(-4);
        if (element.length === 0) {
            return;
        }
        if (thisRef.ignoredPart.length > 0 && thisRef.ignoredPart.includes(partID)) {
            return;
        }
        gl.clear(gl.COLOR_BUFFER_BIT);
        model.drawElement(gl, element);
        const subDir = partID;
        // Separate directory for each partID
        if (!fs.existsSync(path.join(dir, subDir))) {
            fs.mkdirSync(path.join(dir, subDir));
        }
        viewer.save(path.join(dir, subDir, index.toString() + '-' + order + ".png"));
    });

    MatrixStack.pop();

    isPlay = prevIsPlay;
    console.log('save layers success: path - ' + thisRef.outputPath);
};

viewer.togglePlayPause = function() {
    isPlay = !isPlay;
    btnPlayPause.textContent = isPlay ? "Pause" : "Play";
};

viewer.savePart = function () {
    // Print model stat
    let live2DModel = live2DMgr.getModel(0).live2DModel;
    let modelImpl = live2DModel.getModelImpl();

    console.log("[getPartIDs]", getPartIDs(modelImpl));
    console.log("[getParamIDs]", getParamIDs(modelImpl));

    const parts = modelImpl._$F2;
    parts.forEach((element) => {
        console.log(element.getDrawData());
    });

    const paths = path.dirname(this.selectedPath);
    thisRef.modelName = paths.substring(paths.lastIndexOf(separateChar) + 1);
    const dir = path.join(thisRef.outputPath, thisRef.modelName, 'parts');
    // Create dir
    fs.mkdirSync(dir, { recursive: true });

    // Keep previous playing state, and set to pause to stop calling draw()
    const prevIsPlay = isPlay;
    isPlay = false;

    const model = live2DMgr.getModel(0);
    model.update(frameCount);
    let elementList = model.live2DModel.getElementList();

    // Save images for each element
    MatrixStack.reset();
    MatrixStack.loadIdentity();
    MatrixStack.multMatrix(projMatrix.getArray());
    MatrixStack.multMatrix(viewMatrix.getArray());
    MatrixStack.push();

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    model.draw();
    viewer.save(path.join(dir, "all_part.png"));

    let tempId = "";
    let tempOrder = 0;
    gl.clear(gl.COLOR_BUFFER_BIT);
    elementList.forEach((item, index) => {
        const element = item.element;
        if (element.length === 0) {
            return;
        }
        const partID = item.partID;
        if (thisRef.ignoredPart.length > 0 && thisRef.ignoredPart.includes(partID)) {
            return;
        }
        if (tempId.length === 0) {
            tempId = partID;
        }
        tempOrder += 1;
        if (tempId !== partID) {
            // const path = require("path");
            const fileName = `${index.toString()}-${tempId}-sub${tempOrder.toString()}.png`;
            viewer.save(path.join(dir, fileName));
            tempId = partID;
            tempOrder = 0;
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        model.drawElement(gl, element);

        // Separate directory for each partID

    });

    MatrixStack.pop();

    isPlay = prevIsPlay;
    console.log('save parts success: path - ' + thisRef.outputPath);
}

viewer.secret = function() {
    // Print model stat
    let live2DModel = live2DMgr.getModel(0).live2DModel;
    let modelImpl = live2DModel.getModelImpl();
    const div = document.getElementById('partid');

    // const partId = getPartIDs(modelImpl);
    const partId = [];
    let elementList = live2DModel.getElementList();
    elementList.forEach((element) => {
        const partID = element.partID;
        !partId.includes(partID) && partId.push(element.partID);
    })
    console.log("[getPartIDs]", partId);
    console.log("[getParamIDs]", getParamIDs(modelImpl));
    if (thisRef.partsBtn.length) {
        while (div.lastElementChild) {
            div.removeChild(div.lastElementChild);
        }
    }

    partId.forEach((id, index) => {
        const idElement = document.createElement('button');
        idElement.textContent = id;
        div.appendChild(idElement);
        idElement.style.margin = '8px';
        idElement.addEventListener('click', async function () {
            console.log('id: ' + id);
            await viewer.drawExceptPart(id);
        })
        thisRef.partsBtn.push(idElement);
    })

};

viewer.drawExceptPart = async function (id) {
    let live2DModel = live2DMgr.getModel(0).live2DModel;
    let modelImpl = live2DModel.getModelImpl();
    if (thisRef.ignoredPart.includes(id)) {
        const index = thisRef.ignoredPart.indexOf(id);
        thisRef.ignoredPart.splice(index, 1);
    } else {
        thisRef.ignoredPart.push(id);
    }

    const parts = modelImpl._$F2;
    const partsCount = parts.length;
    let elementCount = 0;
    parts.forEach((element) => {
        console.log(element.getDrawData());
        elementCount += element.getDrawData().length;
    });
    console.log("[partCount]", partsCount);
    console.log("[elementCount]", elementCount);

    console.log('hide parts success: part - ' + thisRef.ignoredPart);
}

// TODO
viewer.batch = function() {
    let count = live2DMgr.getCount();
    op = function () {
        if (count < live2DMgr.modelJsonList.length) {
            let curModelPath = live2DMgr.modelJsonList[count];
            let id = modelJsonIds[curModelPath];
            let curMotion = live2DMgr.currentIdleMotion();
            let progress =
                "[" +
                (count + 1) +
                "/" +
                live2DMgr.modelJsonList.length +
                "] " +
                "[" +
                (curMotion + 1) +
                "/" +
                live2DMgr.idleMotionNum() +
                "] " +
                curModelPath;
            console.log("[batch]", progress);
            var tag =
                ("000" + (id + 1)).slice(-4) +
                "_mtn" +
                ("0" + (curMotion + 1)).slice(-2);
            var dir = path.join(outputRoot, tag);
            console.log("[batch] output to", dir);
            fs.mkdirSync(dir, { recursive: true });
            viewer.saveLayer(dir);
            if (!live2DMgr.nextIdleMotion()) {
                viewer.changeModel(1);
                count++;
            }
            // Make a delay here
            var delay =
                batchOperationMinDelay +
                Math.floor(Math.random() * batchOperationDelayRange);
            console.log(
                "[batch] next operation will be started after",
                delay,
                "ms"
            );
            setTimeout(op, delay);
        }
    };
    // Start op
    op();
};

viewer.resize = function() {
    const canvas = this.canvas;

    live2DModel = live2DMgr.getModel(0).live2DModel;
    if (live2DModel == null) return;

    const modelWidth = live2DModel.getCanvasWidth();
    const modelHeight = live2DModel.getCanvasHeight();
    if (modelHeight > modelWidth) {
        // Portrait
        canvas.width = baseResolution;
        canvas.height = (modelHeight / modelWidth) * baseResolution;
    } else {
        canvas.width = (modelWidth / modelHeight) * baseResolution;
        canvas.height = baseResolution;
    }

    // ビュー行列
    const ratio = canvas.height / canvas.width;
    const left = LAppDefine.VIEW_LOGICAL_LEFT;
    const right = LAppDefine.VIEW_LOGICAL_RIGHT;
    const bottom = -ratio;
    const top = ratio;

    viewMatrix = new L2DViewMatrix();

    // デバイスに対応する画面の範囲。 Xの左端, Xの右端, Yの下端, Yの上端
    viewMatrix.setScreenRect(left, right, bottom, top);

    // デバイスに対応する画面の範囲。 Xの左端, Xの右端, Yの下端, Yの上端
    viewMatrix.setMaxScreenRect(
        LAppDefine.VIEW_LOGICAL_MAX_LEFT,
        LAppDefine.VIEW_LOGICAL_MAX_RIGHT,
        LAppDefine.VIEW_LOGICAL_MAX_BOTTOM,
        LAppDefine.VIEW_LOGICAL_MAX_TOP
    );

    viewMatrix.setMaxScale(LAppDefine.VIEW_MAX_SCALE);
    viewMatrix.setMinScale(LAppDefine.VIEW_MIN_SCALE);

    projMatrix = new L2DMatrix44();
    projMatrix.multScale(1, canvas.width / canvas.height);

    // マウス用スクリーン変換行列
    let deviceToScreen = new L2DMatrix44();
    deviceToScreen.multTranslate(-canvas.width / 2.0, -canvas.height / 2.0);
    deviceToScreen.multScale(2 / canvas.width, -2 / canvas.width);

    gl.viewport(0, 0, canvas.width, canvas.height);
};

viewer.initL2dCanvas = function(canvasId) {
    // canvasオブジェクトを取得
    this.canvas = document.getElementById(canvasId);
    const canvas = this.canvas;

    // イベントの登録
    if (canvas.addEventListener) {
        canvas.addEventListener("mousewheel", mouseEvent, false);
        canvas.addEventListener("click", mouseEvent, false);

        canvas.addEventListener("mousedown", mouseEvent, false);
        canvas.addEventListener("mousemove", mouseEvent, false);

        canvas.addEventListener("mouseup", mouseEvent, false);
        canvas.addEventListener("mouseout", mouseEvent, false);
        canvas.addEventListener("contextmenu", mouseEvent, false);

        // タッチイベントに対応
        canvas.addEventListener("touchstart", touchEvent, false);
        canvas.addEventListener("touchend", touchEvent, false);
        canvas.addEventListener("touchmove", touchEvent, false);
    }
};

function connectBtn() {
    // Initialize UI components
    addFilePicker('select', function (paths) {
        thisRef.selectedPath = paths.toString();
        thisRef.modelName = path.dirname(thisRef.selectedPath);
        console.log('selectedPath: ' + thisRef.selectedPath);
        const root = getModelPath(paths);
        thisRef.ignoredPart = [];
        if (thisRef.partsBtn.length) {
            const div = document.getElementById('partid');
            while (div.lastElementChild) {
                div.removeChild(div.lastElementChild);
            }
        }
        loadModels(root);
        startDraw();
    });
    addFilePicker('selectOut', function (paths) {
        this.outputPath = paths.toString();
        console.log('output Path: ' + this.outputPath);
    });
    let btnPrev = document.getElementById("btnPrev");
    let btnNext = document.getElementById("btnNext");
    btnPrev.addEventListener("click", function (e) {
        viewer.changeModel(-1);
    });
    btnNext.addEventListener("click", function (e) {
        viewer.changeModel(1);
    });

    let btnGoto = document.getElementById("btnGoto");
    btnGoto.addEventListener("click", function (e) {
        viewer.goto();
    });

    let btnPlayPause = document.getElementById("btnPlayPause");
    btnPlayPause.addEventListener("click", function (e) {
        viewer.togglePlayPause();
    });
    btnPlayPause.textContent = isPlay ? "Pause" : "Play";

    let btnSave = document.getElementById("btnSave");
    btnSave.addEventListener("click", function (e) {
        viewer.save();
    });

    let btnSaveLayer = document.getElementById("btnSaveLayer");
    btnSaveLayer.addEventListener("click", function (e) {
        viewer.saveLayer();
    });

    let btnSavePart = document.getElementById("btnSavePart");
    btnSavePart.addEventListener("click", function (e) {
        viewer.savePart();
    });

    let btnSecret = document.getElementById("btnSecret");
    btnSecret.addEventListener("click", function (e) {
        viewer.secret();
    });

    let btnBatch = document.getElementById("btnBatch");
    btnBatch.addEventListener("click", function (e) {
        viewer.batch();
    });

    let btnResize = document.getElementById("btnResize");
    btnResize.addEventListener("click", function (e) {
        viewer.resize();
    });

    let btnLookRandom = document.getElementById("btnLookRandom");
    btnLookRandom.addEventListener("click", function (e) {
        this.isLookRandom = !this.isLookRandom;
    });

    let btnPrevMotion = document.getElementById("btnPrevMotion");
    btnPrevMotion.addEventListener("click", function (e) {
        live2DMgr.prevIdleMotion();
    });
    let btnNextMotion = document.getElementById("btnNextMotion");
    btnNextMotion.addEventListener("click", function (e) {
        live2DMgr.nextIdleMotion();
    });
    let allBtn = document.getElementById("outputAll");
    allBtn.addEventListener("click", function (e) {
        viewer.saveAll();
    });
}

viewer.saveAll = async function () {
    let txtInfo = document.getElementById("txtInfo");

    let count = live2DMgr.getCount();
    let allModels = live2DMgr.modelJsonList;
    if (allModels.length < 1) {
        return;
    }

    let curIndex = allModels.indexOf(this.selectedPath);
    console.log('all models list: ' + allModels);

    for (let i = 1; i < allModels.length + 1; i++) {
        await viewer.save()
        await viewer.saveLayer();
        await viewer.savePart();
        await viewer.changeModel();
        await sleep(count * 2 + 150);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getModelPath(modelPath) {
    let paths = modelPath;

    if (paths) {
        // paths = 'file://' + paths;
        console.log("path: " + paths)
        thisRef.selectedPath = paths;
    }

    return paths.toString();
}

async function loadModels(paths) {
    // Load all models
    let files = [];
    let dir = paths ? paths : datasetRoot;
    console.log(dir);
    walkdir(dir, function (filepath) {
        if (filepath.endsWith(".moc")) {
            files.push(filepath);
        }
    });

    console.log("file list: " + files);
    live2DMgr.setModelJsonList(loadModel(files));
}

viewer.init = function() {
    connectBtn();
    loadModels();
    startDraw();
};

function startDraw() {

    const canvas = this.canvas;
    // 3Dバッファの初期化
    const width = canvas.width;
    const height = canvas.height;

    dragMgr = new L2DTargetPoint();

    // ビュー行列
    const ratio = height / width;
    const left = LAppDefine.VIEW_LOGICAL_LEFT;
    const right = LAppDefine.VIEW_LOGICAL_RIGHT;
    const bottom = -ratio;
    const top = ratio;

    viewMatrix = new L2DViewMatrix();

    // デバイスに対応する画面の範囲。 Xの左端, Xの右端, Yの下端, Yの上端
    viewMatrix.setScreenRect(left, right, bottom, top);

    // デバイスに対応する画面の範囲。 Xの左端, Xの右端, Yの下端, Yの上端
    viewMatrix.setMaxScreenRect(
        LAppDefine.VIEW_LOGICAL_MAX_LEFT,
        LAppDefine.VIEW_LOGICAL_MAX_RIGHT,
        LAppDefine.VIEW_LOGICAL_MAX_BOTTOM,
        LAppDefine.VIEW_LOGICAL_MAX_TOP
    );

    viewMatrix.setMaxScale(LAppDefine.VIEW_MAX_SCALE);
    viewMatrix.setMinScale(LAppDefine.VIEW_MIN_SCALE);

    projMatrix = new L2DMatrix44();
    projMatrix.multScale(1, width / height);

    // マウス用スクリーン変換行列
    deviceToScreen = new L2DMatrix44();
    deviceToScreen.multTranslate(-width / 2.0, -height / 2.0);
    deviceToScreen.multScale(2 / width, -2 / width);

    // WebGLのコンテキストを取得する
    gl = getWebGLContext();
    if (!gl) {
        l2dError("Failed to create WebGL context.");
        return;
    }
    // OpenGLのコンテキストをセット
    Live2D.setGL(gl);

    // 描画エリアを白でクリア
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    // Call changeModel once to initialize
    viewer.changeModel(0);

    viewer.startDraw();
};

viewer.startDraw = function() {
    if (!isDrawStart) {
        isDrawStart = true;
        (function tick() {
            if (isPlay) {
                viewer.draw(); // 1回分描画
            }

            const requestAnimationFrame =
                window.requestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.msRequestAnimationFrame;

            // 一定時間後に自身を呼び出す
            requestAnimationFrame(tick, this.canvas);
        })();
    }
};

viewer.draw = function () {
    // l2dLog("--> draw()");
    // viewer.resize();

    MatrixStack.reset();
    MatrixStack.loadIdentity();

    if (frameCount % 30 === 0) {
        lookRandom();
    }

    dragMgr.update(); // ドラッグ用パラメータの更新

    // Note: face direction, top-left (-1,1), top-right (1,1), bottom-left (-1,-1), bottom-right (1,-1)
    // dragMgr.setPoint(1, 1); // その方向を向く

    live2DMgr.setDrag(dragMgr.getX(), dragMgr.getY());

    // Canvasをクリアする
    gl.clear(gl.COLOR_BUFFER_BIT);

    MatrixStack.multMatrix(projMatrix.getArray());
    MatrixStack.multMatrix(viewMatrix.getArray());
    MatrixStack.push();

    for (let i = 0; i < live2DMgr.numModels(); i++) {
        let model = live2DMgr.getModel(i);

        if (model == null) return;

        if (model.initialized && !model.updating) {

            let elementList = model.live2DModel.getElementList();

            elementList && elementList.forEach((item, index) => {
                const element = item.element;
                const partID = item.partID;
                if (!thisRef.ignoredPart.includes(partID)) {
                    model.drawElement(gl, element);
                }
            });


            model.update(frameCount);

            if (!isModelShown && i == live2DMgr.numModels() - 1) {
                isModelShown = !isModelShown;
                let btnPrev = document.getElementById("btnPrev");
                btnPrev.removeAttribute("disabled");
                btnPrev.setAttribute("class", "active");

                var btnNext = document.getElementById("btnNext");
                btnNext.removeAttribute("disabled");
                btnNext.setAttribute("class", "active");
            }
        }
    }

    MatrixStack.pop();

    if (isPlay) {
        frameCount++;
    }
};

viewer.changeModel = function (inc = 1) {
    let btnPrev = document.getElementById("btnPrev");
    btnPrev.setAttribute("disabled", "disabled");
    btnPrev.setAttribute("class", "inactive");

    let btnNext = document.getElementById("btnNext");
    btnNext.setAttribute("disabled", "disabled");
    btnNext.setAttribute("class", "inactive");

    thisRef.ignoredPart = [];
    isModelShown = false;

    live2DMgr.reloadFlg = true;
    live2DMgr.count += inc;

    let txtInfo = document.getElementById("txtInfo");

    let count = live2DMgr.getCount();
    let curModelPath = live2DMgr.modelJsonList[count];
    this.selectedPath = curModelPath;
    this.modelName = path.dirname(this.selectedPath);
    txtInfo.textContent =
        "[" +
        (count + 1) +
        "/" +
        live2DMgr.modelJsonList.length +
        "] " +
        curModelPath;
    console.log("[curModelPath]", curModelPath);
    // console.log("[MD5]", curModelPath);
    live2DMgr.changeModel(gl, viewer.resize);
};

viewer.flagBlacklist = function () {
    let count = live2DMgr.getCount();
    let curModelPath = live2DMgr.modelJsonList[count];
    relativeCurModelPath = curModelPath.slice(datasetRoot.length + 1); // Include the '/'
    fs.appendFileSync(blacklistPath, relativeCurModelPath + "\n");
    console.log("[flagBlacklist]", "Flagged " + relativeCurModelPath);
};

function prettyPrintEveryJson() {
    walkdir(datasetRoot, (file) => {
        if (file.endsWith(".json")) {
            j = fs.readFileSync(file).toString();
            try {
                fs.writeFileSync(file, JSON.stringify(JSON.parse(j), null, 3));
            } catch (error) {
                console.error("JSON Parse Error", file);
            }
        }
    });
}

function md5file(filePath) {
    const target = fs.readFileSync(filePath);
    const md5hash = crypto.createHash("md5");
    md5hash.update(target);
    return md5hash.digest("hex");
}

function loadModel(filelist) {
    let modelJsonList = [];
    console.log(filelist);
    filelist.forEach((filepath) => {
        console.log(" filepath: " + filepath);
        if (filepath.endsWith(".moc")) {
            console.log("It's a v2 moc");
        }
        if (filepath.endsWith(".moc3")) {
            console.log("It's a v3 moc");
        }
        const modelJson = loadModelJson(filepath);
        console.log("model: " + modelJson);
        if (modelJson) {
            modelJsonList.push(...modelJson);
        }
    });
    modelJsonList = [...new Set(modelJsonList)];
    modelJsonList.forEach((value, index) => {
        modelJsonIds[value] = index;
    });
    // Filter out the blacklisted models
    modelJsonList = modelJsonList.filter(function (e) {
        return this.indexOf(e) < 0;
    }, this.blacklist);
    console.log("[loadModel]", modelJsonList.length + " model loaded");
    this.selectedPath = modelJsonList[0];
    console.log('selectedPath: ' + this.selectedPath);
    return modelJsonList;
}

function loadModelJson(mocPath) {
    const pardir = path.dirname(mocPath);
    let textures = []; // *.png
    let physics; // *.physics or physics.json
    let pose; // pose.json
    let expressions = []; // *.exp.json
    let motions = []; // *.mtn
    let modelJson = [];
    walkdir(pardir, function (filepath) {
        if (filepath.endsWith(".png")) {
            textures.push(filepath.replace(pardir + "/", ""));
        }
        if (
            filepath.endsWith(".physics") ||
            filepath.endsWith("physics.json")
        ) {
            physics = filepath.replace(pardir + "/", "");
            // console.log('physics: ' + physics);
        }
        if (filepath.endsWith("pose.json")) {
            pose = filepath.replace(pardir + "/", "");
        }
        if (filepath.endsWith(".mtn")) {
            motions.push(filepath.replace(pardir + "/", ""));
            // console.log('motions: ' + motions);
        }
        if (filepath.endsWith(".exp.json")) {
            expressions.push(filepath.replace(pardir + "/", ""));
            // console.log('expressions: ' + expressions);
        }
        if (filepath.endsWith("generated.model.json")) {
            if (!ignoreGeneratedJson) {
                modelJson.push(filepath);
            }
        } else if (filepath.endsWith("model.json")) {
            if (!ignoreOriginalJson) {
                modelJson.push(filepath);
            }
        }
    });
    // Generate a JSON file based on all the resources we can find
    if (modelJson.length === 0) {
        if (textures.length === 0) {
            console.warn(
                "[loadModelJson]",
                "0 texture found! .moc path: " + mocPath
            );
            // Usually is a corrupted model, ignore
            return;
        }
        textures.sort();
        motions.sort();
        let model = {};
        model["version"] = "AutoGenerated 1.0.0";
        model["model"] = mocPath.replace(pardir + "/", "");
        model["textures"] = textures;
        if (physics) model["physics"] = physics;
        if (pose) model["pose"] = pose;
        if (expressions.length > 0) {
            model["expressions"] = [];
            expressions.forEach((expression) => {
                model["expressions"].push({
                    file: expression,
                    name: path.basename(expression),
                });
            });
        }
        if (motions.length > 0) {
            model["motions"] = { idle: [] };
            motions.forEach((motion) => {
                model["motions"]["idle"].push({ file: motion });
            });
        }
        const json = JSON.stringify(model, null, 3);
        const generatedJsonPath = path.join(pardir, "generated.model.json");
        modelJson.push(generatedJsonPath);
        fs.writeFileSync(generatedJsonPath, json);
    }
    return modelJson;
}

/* ********** マウスイベント ********** */

/*
 * マウスホイールによる拡大縮小
 */
function modelScaling(scale) {
    let isMaxScale = thisRef.viewMatrix.isMaxScale();
    let isMinScale = thisRef.viewMatrix.isMinScale();

    thisRef.viewMatrix.adjustScale(0, 0, scale);

    // 画面が最大になったときのイベント
    if (!isMaxScale) {
        if (thisRef.viewMatrix.isMaxScale()) {
            thisRef.live2DMgr.maxScaleEvent();
        }
    }
    // 画面が最小になったときのイベント
    if (!isMinScale) {
        if (thisRef.viewMatrix.isMinScale()) {
            thisRef.live2DMgr.minScaleEvent();
        }
    }
}

/*
 * クリックされた方向を向く
 * タップされた場所に応じてモーションを再生
 */
function modelTurnHead(event) {
    thisRef.drag = true;

    var rect = event.target.getBoundingClientRect();

    var sx = transformScreenX(event.clientX - rect.left);
    var sy = transformScreenY(event.clientY - rect.top);
    var vx = transformViewX(event.clientX - rect.left);
    var vy = transformViewY(event.clientY - rect.top);

    if (LAppDefine.DEBUG_MOUSE_LOG)
        l2dLog(
            "onMouseDown device( x:" +
                event.clientX +
                " y:" +
                event.clientY +
                " ) view( x:" +
                vx +
                " y:" +
                vy +
                ")"
        );

    thisRef.lastMouseX = sx;
    thisRef.lastMouseY = sy;

    thisRef.dragMgr.setPoint(vx, vy); // その方向を向く

    // タップした場所に応じてモーションを再生
    thisRef.live2DMgr.tapEvent(vx, vy);
}

/*
 * マウスを動かした時のイベント
 */
function followPointer(event) {
    var rect = event.target.getBoundingClientRect();

    var sx = transformScreenX(event.clientX - rect.left);
    var sy = transformScreenY(event.clientY - rect.top);
    var vx = transformViewX(event.clientX - rect.left);
    var vy = transformViewY(event.clientY - rect.top);

    if (LAppDefine.DEBUG_MOUSE_LOG)
        l2dLog(
            "onMouseMove device( x:" +
                event.clientX +
                " y:" +
                event.clientY +
                " ) view( x:" +
                vx +
                " y:" +
                vy +
                ")"
        );

    if (thisRef.drag) {
        thisRef.lastMouseX = sx;
        thisRef.lastMouseY = sy;

        thisRef.dragMgr.setPoint(vx, vy); // その方向を向く
    }
}

/*
 * 正面を向く
 */
function lookFront() {
    if (thisRef.drag) {
        thisRef.drag = false;
    }

    thisRef.dragMgr.setPoint(0, 0);
}

function lookRandom() {
    if (thisRef.isLookRandom) {
        sx = Math.random() * 2.0 - 1.0;
        sy = Math.random() * 2.0 - 1.0;
        thisRef.dragMgr.setPoint(sx, sy);
        console.log("[lookRandom]", sx, sy);
    }
}

function mouseEvent(e) {
    e.preventDefault();

    if (e.type == "mousewheel") {
        if (
            e.clientX < 0 ||
            thisRef.canvas.clientWidth < e.clientX ||
            e.clientY < 0 ||
            thisRef.canvas.clientHeight < e.clientY
        ) {
            return;
        }

        if (e.wheelDelta > 0) modelScaling(1.1);
        // 上方向スクロール 拡大
        else modelScaling(0.9); // 下方向スクロール 縮小
    } else if (e.type == "mousedown") {
        // 右クリック以外なら処理を抜ける
        if ("button" in e && e.button != 0) return;

        modelTurnHead(e);
    } else if (e.type == "mousemove") {
        followPointer(e);
    } else if (e.type == "mouseup") {
        // 右クリック以外なら処理を抜ける
        if ("button" in e && e.button != 0) return;

        lookFront();
    } else if (e.type == "mouseout") {
        lookFront();
    }
}

function touchEvent(e) {
    e.preventDefault();

    var touch = e.touches[0];

    if (e.type == "touchstart") {
        if (e.touches.length == 1) modelTurnHead(touch);
        // onClick(touch);
    } else if (e.type == "touchmove") {
        followPointer(touch);

        if (e.touches.length == 2) {
            var touch1 = e.touches[0];
            var touch2 = e.touches[1];

            var len =
                Math.pow(touch1.pageX - touch2.pageX, 2) +
                Math.pow(touch1.pageY - touch2.pageY, 2);
            if (thisRef.oldLen - len < 0) modelScaling(1.025);
            // 上方向スクロール 拡大
            else modelScaling(0.975); // 下方向スクロール 縮小

            thisRef.oldLen = len;
        }
    } else if (e.type == "touchend") {
        lookFront();
    }
}

/* ********** マトリックス操作 ********** */
function transformViewX(deviceX) {
    var screenX = this.deviceToScreen.transformX(deviceX); // 論理座標変換した座標を取得。
    return viewMatrix.invertTransformX(screenX); // 拡大、縮小、移動後の値。
}

function transformViewY(deviceY) {
    var screenY = this.deviceToScreen.transformY(deviceY); // 論理座標変換した座標を取得。
    return viewMatrix.invertTransformY(screenY); // 拡大、縮小、移動後の値。
}

function transformScreenX(deviceX) {
    return this.deviceToScreen.transformX(deviceX);
}

function transformScreenY(deviceY) {
    return this.deviceToScreen.transformY(deviceY);
}

