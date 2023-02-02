const { Live2DModel } = require("pixi-live2d-display");
const PIXI = require("pixi.js");
const path = require("path");
const fs = require("fs");
const { Ticker } = require("@pixi/ticker")
const { InteractionManager } = require('@pixi/interaction');
const { ShaderSystem } = require("@pixi/core")

const { install } = require("@pixi/unsafe-eval");

const datasetRoot = "dataset"; // Root of dataset directory
const outputRoot = "output"; // Root of output directory
const baseResolution = 1024;

const thisRef = this;

window.PIXI = PIXI;
install({ ShaderSystem });

async function pixiViewer() {
    this.platform = window.navigator.platform.toLowerCase();
    this.app = new PIXI.Application({
        view: document.getElementById('canvas'),
        width: 1024,
        height: 1024,
        autoStart: true,
    });

    PIXI.extensions.add(InteractionManager);
    Live2DModel.registerTicker(Ticker);
    this.app.renderer.backgroundColor = 0xFFFFF

    const model = await loadPixiModel();
    this.model = model;
    this.app.stage.addChild(model);
    console.log(model.motion);

    resizeModel(model);
    this.motions = model.motions;
    console.log(this.groups);

    connectBtn();
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
    const selectBtn = document.getElementById('select');
    selectBtn.addEventListener('click', function () {
        const dialog = require('electron').remote.dialog;
        dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'Images', extensions: ['jpg', 'png', 'gif'] },
                { name: 'Movies', extensions: ['mkv', 'avi', 'mp4'] },
                { name: 'Custom File Type', extensions: ['as'] },
                { name: 'All Files', extensions: ['*'] }
            ]}).then(r => {
            console.log(r);
        })
     })
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

function loadPixiModel() {
    let filelist = [];
    walkdir("dataset", function (filepath) {
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
