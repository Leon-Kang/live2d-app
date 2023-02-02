const { Live2DModel } = require("pixi-live2d-display");
const PIXI = require("pixi.js");
const path = require("path");
const fs = require("fs");
const { Ticker, TickerPlugin } = require("@pixi/ticker")
const { InteractionManager } = require('@pixi/interaction');
const { ShaderSystem } = require("@pixi/core")

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

    await loadModel();

    connectBtn();
}

async function loadModel(modelPath) {
    let model;
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
    const canvas = document.getElementById('canvas');
    this.app = new PIXI.Application({
        view: canvas,
        width: 1024,
        height: 1024,
        autoStart: true,
        clearBeforeRender: true,
        backgroundColor: 0xFFFFF,
    });
    await this.app.stage.addChild(model);
    resizeModel(model);
}

function resizeModel(model) {
    const modelWidth = model.width;
    const modelHeight = model.height;

    if (modelHeight > modelWidth) {
        // Portrait
        model.width = baseResolution;
        model.height = (modelHeight / modelWidth) * baseResolution;
    } else {
        model.width = (modelWidth / modelHeight) * baseResolution;
        model.height = baseResolution;
    }
}

function connectBtn() {
    addFilePicker('select', async function (paths) {
        this.selectedPaths = paths;
        console.log('selectedPath: ' + this.selectedPaths);
        await loadModel(paths);
    });
}

function walkdir(dir, callback) {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        const filepath = path.join(dir, file);
        const stats = fs.statSync(filepath);
        if (stats.isDirectory()) {
            walkdir(filepath, callback);
        } else if (stats.isFile()) {
            callback(filepath);
        }
    });
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

function getWebGLContext() {
    const NAMES = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];

    for (let i = 0; i < NAMES.length; i++) {
        try {
            const ctx = this.canvas.getContext(NAMES[i], {
                premultipliedAlpha: true,
                preserveDrawingBuffer: true,
            });
            if (ctx) return ctx;
        } catch (e) {}
    }
    return null;
}
