const { Live2DModel } = require("pixi-live2d-display");
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

    connectBtn();
}

async function loadModel(modelPath) {
    let model;
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
    } else {
        model = await loadPixiModel();
    }
    await renderModel(model);
}

async function renderModel(model) {
    await this.app.stage.addChild(model);
    this.model = model;

    // console.log('111111: ' + JSON.stringify(decycle(model)))

    const motionManager = model.internalModel.motionManager;
    // console.log('111111: ' + JSON.stringify(decycle(motionManager)))

    model.position.set(32, 32);

    console.log(this.app, this.app.renderer)
    fit(this.app.renderer.width, this.app.renderer.height, model);

    const motionGroups = []
    const definitions = motionManager.definitions;
    console.log("motion definitions: " + definitions);
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
    addFilePicker('select', async function (path) {
        this.selectedPath = path;
        console.log('selectedPath: ' + this.selectedPath);
        await loadModel(path);
    });
    const btnSave = document.getElementById("btnSave");
    btnSave.addEventListener("click", function (e) {
        pixiViewer.save();
    });
}

pixiViewer.save = async function () {
    const selectedPath = thisRef.selectedPath;
    console.log("1111: " + selectedPath)
    const name = selectedPath.substring(selectedPath.indexOf('/') + 1, selectedPath.lastIndexOf('/'));
    console.log("1111: " + name)
    const output = path.join(outputRoot, name)
    fs.mkdirSync(output, { recursive: true });
    await saveToPng(path.join(output, name + ".png"), 'canvas');
}

pixiViewer.saveAsLayer = function (dir = path.join(outputRoot, "layer")) {

}

function loadPixiModel(paths) {
    let filelist = [];

    walkdir(paths || "dataset", function (filepath) {
        if (filepath.endsWith(".model.json") || filepath.endsWith(".model3.json")) {
            filelist.push(filepath);
        }
    });
    console.log("pixi file path: " + filelist);
    const last = filelist[0];
    console.log(last);
    this.selectedPath = last;
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
    }
}
