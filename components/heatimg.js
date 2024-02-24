var data = []
var options = {
  min: 0,
  max: 100,
  size: 13
}
var isShadow = true
var canvas = document.getElementById('heatmapcanvas')
var canvas2 = document.getElementById('heatmapcanvas2')
canvas.width = 500
canvas.height = 400
canvas2.width = 500
canvas2.height = 400

// min <= x <= max
function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 生成随机数据
function generateData () {
  data = []
  const count = 240
  for (let i = 0; i < count; i++) {
    let obj = {}
    obj.x = getRandomIntInclusive(10, 390)
    obj.y = getRandomIntInclusive(10, 390)
    obj.value = getRandomIntInclusive(0, 100)
    data.push(obj)
  }
}

// 构造一个离屏canvas
function Canvas (width, height) {
  let canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

// 画圆
function createCircle(size) {
  let shadowBlur = size / 2
  let r2 = size + shadowBlur
  let offsetDistance = 10000
  
  let circle = new Canvas(r2 * 2, r2 * 2)
  let context = circle.getContext('2d')
  
  if (isShadow) context.shadowBlur = shadowBlur;
  context.shadowColor = 'black'
  context.shadowOffsetX = context.shadowOffsetY = offsetDistance
  
  context.beginPath()
  context.arc(r2 - offsetDistance, r2 - offsetDistance, size, 0, Math.PI*2, true)
  context.closePath()
  context.fill()
  return circle
}

function draw (context, data) {
  let circle = createCircle(options.size)
  let circleHalfWidth = circle.width / 2
  let circleHalfHeight = circle.height / 2
  
  // 按透明度分类
  let dataOrderByAlpha = {}
  data.forEach((item, index) => {
    let alpha = Math.min(1, item.value/options.max).toFixed(2)
    dataOrderByAlpha[alpha] = dataOrderByAlpha[alpha] || []
    dataOrderByAlpha[alpha].push(item)
   })
  
  // 绘制不同透明度的圆形
  for(let i in dataOrderByAlpha) {
    if (isNaN(i)) continue;
    let _data = dataOrderByAlpha[i]
    context.beginPath()
    context.globalAlpha = i
    _data.forEach(item => {
      context.drawImage(circle, item.x - circleHalfWidth, item.y - circleHalfHeight)
    })
  }
  // 圆形着色
  let intensity = new Intensity()
  let colored = context.getImageData(0, 0, context.canvas.width, context.canvas.height)
  colorize(colored.data, intensity.getImageData())
  
  context.clearRect(0, 0, context.canvas.width, context.canvas.height)
  context.putImageData(colored, 0, 0)
}

function colorize(pixels, gradient) {
    var max = options.max;
    var min = options.min;
    var diff = max - min;
    var range = options.range || null;

    var jMin = 0;
    var jMax = 1024;
    if (range && range.length === 2) {
        jMin = (range[0] - min) / diff * 1024;
    }

    if (range && range.length === 2) {
        jMax = (range[1] - min) / diff * 1024;
    }

    var maxOpacity = options.maxOpacity || 0.8;
    var range = options.range;

    for (var i = 3, len = pixels.length, j; i < len; i += 4) {
        j = pixels[i] * 4; // get gradient color from opacity value

        if (pixels[i] / 256 > maxOpacity) {
            pixels[i] = 256 * maxOpacity;
        }

        if (j && j >= jMin && j <= jMax) {
            pixels[i - 3] = gradient[j];
            pixels[i - 2] = gradient[j + 1];
            pixels[i - 1] = gradient[j + 2];
        } else {
            pixels[i] = 0;
        }
    }
}

function bthClickHandle() {
  generateData()
  let context = canvas.getContext('2d')  
  let context2 = canvas2.getContext('2d')
  context.clearRect(0, 0, canvas.width, canvas.height)  
  context2.clearRect(0, 0, canvas2.width, canvas2.height)
  isShadow = true
  draw(context, data)  
  isShadow = false
  draw(context2, data)
}

window.onload = function () {
  bthClickHandle()
}

function Intensity(options) {

    options = options || {};
    this.gradient = options.gradient || { 
        0.25: "rgba(0, 0, 255, 1)",
        0.55: "rgba(0, 255, 0, 1)",
        0.85: "rgba(255, 255, 0, 1)",
        1.0: "rgba(255, 0, 0, 1)"
    };
    this.maxSize = options.maxSize || 35;
    this.minSize = options.minSize || 0;
    this.max = options.max || 100;
    this.min = options.min || 0;
    this.initPalette();
}

Intensity.prototype.setMax = function (value) {
    this.max = value || 100;
}

Intensity.prototype.setMin = function (value) {
    this.min = value || 0;
}

Intensity.prototype.setMaxSize = function (maxSize) {
    this.maxSize = maxSize || 35;
}

Intensity.prototype.setMinSize = function (minSize) {
    this.minSize = minSize || 0;
}

Intensity.prototype.initPalette = function () {

    var gradient = this.gradient;

    var canvas = new Canvas(256, 1);

    var paletteCtx = this.paletteCtx = canvas.getContext('2d');

    var lineGradient = paletteCtx.createLinearGradient(0, 0, 256, 1);

    for (var key in gradient) {
        lineGradient.addColorStop(parseFloat(key), gradient[key]);
    }

    paletteCtx.fillStyle = lineGradient;
    paletteCtx.fillRect(0, 0, 256, 1);

}

Intensity.prototype.getColor = function (value) {

    var imageData = this.getImageData(value);

    return "rgba(" + imageData[0] + ", " + imageData[1] + ", " + imageData[2] + ", " + imageData[3] / 256 + ")";

}

Intensity.prototype.getImageData = function (value) {

    var imageData = this.paletteCtx.getImageData(0, 0, 256, 1).data;

    if (value === undefined) {
        return imageData;
    }

    var max = this.max;
    var min = this.min;

    if (value > max) {
        value = max;
    }

    if (value < min) {
        value = min;
    }

    var index = Math.floor((value - min) / (max - min) * (256 - 1)) * 4;

    return [imageData[index], imageData[index + 1], imageData[index + 2], imageData[index + 3]];
}

/**
 * @param Number value 
 * @param Number max of value
 * @param Number max of size
 * @param Object other options
 */
Intensity.prototype.getSize = function (value) {

    var size = 0;
    var max = this.max;
    var min = this.min;
    var maxSize = this.maxSize;
    var minSize = this.minSize;

    if (value > max) {
        value = max;
    }

    if (value < min) {
        value = min;
    }

    size = minSize + (value - min) / (max - min) * (maxSize - minSize);

    return size;

}

Intensity.prototype.getLegend = function (options) {
    var gradient = this.gradient;


    var width = options.width || 20;
    var height = options.height || 180;

    var canvas = new Canvas(width, height);

    var paletteCtx = canvas.getContext('2d');

    var lineGradient = paletteCtx.createLinearGradient(0, height, 0, 0);

    for (var key in gradient) {
        lineGradient.addColorStop(parseFloat(key), gradient[key]);
    }

    paletteCtx.fillStyle = lineGradient;
    paletteCtx.fillRect(0, 0, width, height);

    return canvas;
}