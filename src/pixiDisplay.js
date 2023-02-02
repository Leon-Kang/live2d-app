const { Live2DModel } = require("pixi-live2d-display");
const PIXI = require("pixi.js");

const { Ticker, TickerPlugin } = require("@pixi/ticker")
const { InteractionManager } = require('@pixi/interaction');
const { ShaderSystem, renderer } = require("@pixi/core")

const { install } = require("@pixi/unsafe-eval");

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

    this.selectedPaths = ""

    const canvas = document.getElementById('canvas');
    this.app = new PIXI.Application({
        view: canvas,
        width: 2048,
        height: 2048,
        autoStart: true,
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

    const motionManager = model.internalModel.motionManager;

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
    addFilePicker('select', async function (paths) {
        this.selectedPaths = paths;
        console.log('selectedPath: ' + this.selectedPaths);
        await loadModel(paths);
    });
    const btnSave = document.getElementById("btnSave");
    btnSave.addEventListener("click", function (e) {
        // saveToPng(path.join(outputRoot, "image.png"), 'canvas');
        pixiViewer.save();
    });
}

pixiViewer.save = function () {
    this.app.pauseAnimations();
    const canvas = document.getElementById('canvas');
    let ctx = canvas.getContext("2d");
    const imageObj = new Image();

    imageObj.onload = function() {
        ctx.drawImage(imageObj, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL("image/png");
        console.log(pngUrl);
        const data = pngUrl.replace(/^data:image\/\w+;base64,/, "");
        console.log("data: 1111111 : " + data);
        const buf = Buffer.from(data, "base64");
        fs.writeFileSync(path.join(outputRoot, "image.png"), buf);
    };
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
