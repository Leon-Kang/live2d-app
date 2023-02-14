const { Live2DModel, CubismMatrix44 } = require("pixi-live2d-display");
const PIXI = require("pixi.js");

const { Ticker, TickerPlugin } = require("@pixi/ticker")
const { InteractionManager } = require('@pixi/interaction');
const { ShaderSystem, renderer } = require("@pixi/core")

const { install } = require("@pixi/unsafe-eval");
const { decycle, encycle } = require('json-cyclic');

const datasetRoot = "dataset"; // Root of dataset directory
const outputRoot = "output"; // Root of output directory
const baseResolution = 512;

const thisRef = this;

window.PIXI = PIXI;
PIXI.extensions.add(InteractionManager);
PIXI.extensions.add(TickerPlugin);
Live2DModel.registerTicker(Ticker);

install({ ShaderSystem });

async function pixiViewer() {
    this.platform = window.navigator.platform.toLowerCase();

    this.selectedPath = ""
    this.outputPath = ""
    this.modelName = ""

    const canvas = document.getElementById('canvas');
    this.app = new PIXI.Application({
        view: canvas,
        width: 2048,
        height: 2048,
        autoStart: true,
        preserveDrawingBuffer: true,
        clearBeforeRender: true,
        backgroundColor: 0xFFFFF,
        resizeTo: window,
        antialias: true,
        backgroundAlpha: 0.75,
    });

    await loadModel();

    this.projMatrix = null;

    connectBtn();
}

async function loadModel(modelPath) {
    let model;
    this.selectedPath = modelPath;
    // clean stage
    const index = this.app.stage.children.indexOf(this.model);
    if (index >= 0) {
        await this.app.stage.removeChildAt(index);
    }
    if (modelPath) {
        modelPath = 'file://' + modelPath;
        console.log("path: " + modelPath)
        model = await Live2DModel.from(modelPath, {
            autoInteract: true,
        });
        this.selectedPath = modelPath;
    } else {
        model = await loadPixiModel();
    }
    await renderModel(model);
}

async function renderModel(model) {
    thisRef.model = model;
    await this.app.stage.addChild(model);

    // console.log('111111: ' + JSON.stringify(decycle(model)))

    const motionManager = model.internalModel.motionManager;
    const settings = motionManager.settings;
    // console.log('111111: ' + JSON.stringify(decycle(motionManager)))

    console.log(this.projMatrix + ' settings: ' + JSON.stringify(decycle(motionManager.settings)))

    this.modelName = settings.name;
    model.position.set(32, 32);

    console.log(this.app, this.app.renderer)
    fit(this.app.renderer.width, this.app.renderer.height, model);

    const motionGroups = []
    const definitions = motionManager.definitions;
    console.log('111111: ' + JSON.stringify(decycle(definitions)))

    for (const [group, motions] of Object.entries(definitions)) {
        motionGroups.push({
            name: group,
            motions: motions?.map((motion, index) => ({
                file: motion.file || motion.File || '',
            })) || [],
        });
    }
    console.log("motion group: " + motionGroups);
}

function connectBtn() {
    addFilePicker('select', function (path) {
        this.selectedPath = path;
        console.log('selectedPath: ' + this.selectedPath);
        loadModel(path);
    });
    const btnSave = document.getElementById("btnSave");
    btnSave.addEventListener("click", function (e) {
        pixiViewer.save();
    });
    const btnSaveLayer = document.getElementById("btnSaveLayer");
    btnSaveLayer.addEventListener("click", function (e) {
        pixiViewer.saveAsLayer();
    });
}

pixiViewer.save = function () {
    getOutputPath();
    fs.mkdirSync(thisRef.outputPath, { recursive: true });
    const path = require("path");
    saveToPng(path.join(thisRef.outputPath, thisRef.modelName + ".png"), 'canvas');
}

pixiViewer.saveAsLayer = function () {
    getOutputPath();
    const path = require("path");
    const layerPath = path.join(thisRef.outputPath, 'layer');
    fs.mkdirSync(layerPath, { recursive: true });
    const model = thisRef.model;

    thisRef.projMatrix = model.coreModel;
    const {parse, stringify, toJSON, fromJSON} = require('flatted');
    const { decycle, encycle } = require('json-cyclic');
    console.log("123123123123:   " +  JSON.stringify(decycle(model)))

    const elementList = this.projMatrix;
    const canvas = document.getElementById('canvas');

    MatrixStack.reset();
    MatrixStack.loadIdentity();
    MatrixStack.multMatrix(thisRef.projMatrix.getArray());
    MatrixStack.multMatrix(thisRef.viewMatrix.getArray());
    MatrixStack.push();

    elementList.forEach((item, index) => {
        if (gl.COLOR_BUFFER_BIT < 128) {
            return;
        }
        let element = item.element;
        let partID = item.partID;
        let order = ("000" + index).slice(-4);
        gl.clear(gl.COLOR_BUFFER_BIT);
        model.drawElement(gl, element);
        // Separate directory for each partID
        if (!fs.existsSync(path.join(dir, partID))) {
            fs.mkdirSync(path.join(dir, partID));
        }

        let img = canvas.toDataURL();
        let data = img.replace(/^data:image\/\w+;base64,/, "");
        let buf = Buffer.from(data, "base64");
        fs.writeFileSync(path.join(layerPath, partID, order + "_" + partID + ".png"), buf);
    });

    MatrixStack.pop();

}

function getOutputPath() {
    thisRef.outputPath = path.join(outputRoot, thisRef.modelName);
}

function loadPixiModel(paths) {
    let filelist = [];

    walkdir(paths || "dataset", function (filepath) {
        if (filepath.endsWith(".model3.json")) {
            filelist.push(filepath);
        }
    });
    console.log("pixi file path: " + filelist);
    const last = filelist[0];
    console.log(last);
    thisRef.selectedPath = last;
    return Live2DModel.from(last);
}

function fit(width, height, model) {
    if (model) {
        let scales = Math.min(width / model.width, height / model.height);

        scales = Math.round(scales * 10) / 10;
        scale(scales, scales, model);
    }
}

function scale(scaleX, scaleY, model) {
    this._scaleX = scaleX ?? this._scaleX;
    this._scaleY = scaleY ?? this._scaleY;

    if (model) {
        model.scale.set(this._scaleX, this._scaleY);
        const canvas = document.getElementById('canvas');
        canvas.height = model.height + 64
        canvas.width = model.width + 64
    }
}
