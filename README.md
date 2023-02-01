# What's this?
> Origin project - https://github.com/jeffshee/live2d This is a tool for rendering Live2d models (only v2 is currently supported). The modified SDK allows you to output the rendered texture to separate PNG images. 

Changed render to pixi-js and https://github.com/guansss/pixi-live2d-display
So this project support live2d v3/v4 models.
Also updated the electron version and fixed the dependencies. 

# Installation
Note: You can skip all the prompts by hitting ENTER
### npm
```
npm init
npm install
```
### yarn
```
yarn install
```

# Usage
Live2d models should be placed in `dataset` directory.
Get the models from here:
https://github.com/Eikanya/Live2d-model

Or simply clone the repository
```
git clone https://github.com/Eikanya/Live2d-model dataset
```

To launch Live2D-tool GUI
```
npm start
```
or
```
yarn start
```
