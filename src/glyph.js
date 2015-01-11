// The Glyph object

'use strict';

var check = require('./check');
var draw = require('./draw');
var path = require('./path');

// A Glyph is an individual mark that often corresponds to a character.
// Some glyphs, such as ligatures, are a combination of many characters.
// Glyphs are the basic building blocks of a font.
//
// The `Glyph` class contains utility methods for drawing the path and its points.
function Glyph(options) {
    this.font = options.font || null;
    this.index = options.index || 0;
    this.name = options.name || null;
    this.unicode = options.unicode || undefined;
    this.unicodes = options.unicodes || options.unicode !== undefined ? [options.unicode] : [];
    this.xMin = options.xMin || 0;
    this.yMin = options.yMin || 0;
    this.xMax = options.xMax || 0;
    this.yMax = options.yMax || 0;
    this.advanceWidth = options.advanceWidth || 0;
    this.path = options.path || null;
}

Glyph.prototype.addUnicode = function (unicode) {
    if (this.unicodes.length === 0) {
        this.unicode = unicode;
    }
    this.unicodes.push(unicode);
};

// Convert the glyph to a Path we can draw on a drawing context.
//
// x - Horizontal position of the glyph. (default: 0)
// y - Vertical position of the *baseline* of the glyph. (default: 0)
// fontSize - Font size, in pixels (default: 72).
Glyph.prototype.getPath = function (x, y, fontSize) {
    var scale, p, commands, cmd;
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 72;
    scale = 1 / this.font.unitsPerEm * fontSize;
    p = new path.Path();
    commands = this.path.commands;
    for (var i = 0; i < commands.length; i += 1) {
        cmd = commands[i];
        if (cmd.type === 'M') {
            p.moveTo(x + (cmd.x * scale), y + (-cmd.y * scale));
        } else if (cmd.type === 'L') {
            p.lineTo(x + (cmd.x * scale), y + (-cmd.y * scale));
        } else if (cmd.type === 'Q') {
            p.quadraticCurveTo(x + (cmd.x1 * scale), y + (-cmd.y1 * scale),
                               x + (cmd.x * scale), y + (-cmd.y * scale));
        } else if (cmd.type === 'C') {
            p.curveTo(x + (cmd.x1 * scale), y + (-cmd.y1 * scale),
                      x + (cmd.x2 * scale), y + (-cmd.y2 * scale),
                      x + (cmd.x * scale), y + (-cmd.y * scale));
        } else if (cmd.type === 'Z') {
            p.closePath();
        }
    }
    return p;
};

// Split the glyph into contours.
// This function is here for backwards compatibility, and to
// provide raw access to the TrueType glyph outlines.
Glyph.prototype.getContours = function () {
    var contours, currentContour, i, pt;
    if (this.points === undefined) {
        return [];
    }
    contours = [];
    currentContour = [];
    for (i = 0; i < this.points.length; i += 1) {
        pt = this.points[i];
        currentContour.push(pt);
        if (pt.lastPointOfContour) {
            contours.push(currentContour);
            currentContour = [];
        }
    }
    check.argument(currentContour.length === 0, 'There are still points left in the current contour.');
    return contours;
};

// Calculate the xMin/yMin/xMax/yMax/lsb/rsb for a Glyph.
Glyph.prototype.getMetrics = function () {
    var commands = this.path.commands;
    var xCoords = [];
    var yCoords = [];
    for (var i = 0; i < commands.length; i += 1) {
        var cmd = commands[i];
        if (cmd.type !== 'Z') {
            xCoords.push(cmd.x);
            yCoords.push(cmd.y);
        }
        if (cmd.type === 'Q' || cmd.type === 'C') {
            xCoords.push(cmd.x1);
            yCoords.push(cmd.y1);
        }
        if (cmd.type === 'C') {
            xCoords.push(cmd.x2);
            yCoords.push(cmd.y2);
        }
    }
    var metrics = {
        xMin: Math.min.apply(null, xCoords),
        yMin: Math.min.apply(null, yCoords),
        xMax: Math.max.apply(null, xCoords),
        yMax: Math.max.apply(null, yCoords),
        leftSideBearing: 0
    };
    metrics.rightSideBearing = this.advanceWidth - metrics.leftSideBearing - (metrics.xMax - metrics.xMin);
    return metrics;
};

// Draw the glyph on the given context.
//
// ctx - The drawing context.
// x - Horizontal position of the glyph. (default: 0)
// y - Vertical position of the *baseline* of the glyph. (default: 0)
// fontSize - Font size, in pixels (default: 72).
Glyph.prototype.draw = function (ctx, x, y, fontSize) {
    this.getPath(x, y, fontSize).draw(ctx);
};

// Draw the points of the glyph.
// On-curve points will be drawn in blue, off-curve points will be drawn in red.
//
// ctx - The drawing context.
// x - Horizontal position of the glyph. (default: 0)
// y - Vertical position of the *baseline* of the glyph. (default: 0)
// fontSize - Font size, in pixels (default: 72).
Glyph.prototype.drawPoints = function (ctx, x, y, fontSize) {

    function drawCircles(l, x, y, scale) {
        var j, PI_SQ = Math.PI * 2;
        ctx.beginPath();
        for (j = 0; j < l.length; j += 1) {
            ctx.moveTo(x + (l[j].x * scale), y + (l[j].y * scale));
            ctx.arc(x + (l[j].x * scale), y + (l[j].y * scale), 2, 0, PI_SQ, false);
        }
        ctx.closePath();
        ctx.fill();
    }

    var scale, i, blueCircles, redCircles, path, cmd;
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 24;
    scale = 1 / this.font.unitsPerEm * fontSize;

    blueCircles = [];
    redCircles = [];
    path = this.path;
    for (i = 0; i < path.commands.length; i += 1) {
        cmd = path.commands[i];
        if (cmd.x !== undefined) {
            blueCircles.push({x: cmd.x, y: -cmd.y});
        }
        if (cmd.x1 !== undefined) {
            redCircles.push({x: cmd.x1, y: -cmd.y1});
        }
        if (cmd.x2 !== undefined) {
            redCircles.push({x: cmd.x2, y: -cmd.y2});
        }
    }

    ctx.fillStyle = 'blue';
    drawCircles(blueCircles, x, y, scale);
    ctx.fillStyle = 'red';
    drawCircles(redCircles, x, y, scale);
};

// Draw lines indicating important font measurements.
// Black lines indicate the origin of the coordinate system (point 0,0).
// Blue lines indicate the glyph bounding box.
// Green line indicates the advance width of the glyph.
//
// ctx - The drawing context.
// x - Horizontal position of the glyph. (default: 0)
// y - Vertical position of the *baseline* of the glyph. (default: 0)
// fontSize - Font size, in pixels (default: 72).
Glyph.prototype.drawMetrics = function (ctx, x, y, fontSize) {
    var scale;
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 24;
    scale = 1 / this.font.unitsPerEm * fontSize;
    ctx.lineWidth = 1;
    // Draw the origin
    ctx.strokeStyle = 'black';
    draw.line(ctx, x, -10000, x, 10000);
    draw.line(ctx, -10000, y, 10000, y);
    // Draw the glyph box
    ctx.strokeStyle = 'blue';
    draw.line(ctx, x + (this.xMin * scale), -10000, x + (this.xMin * scale), 10000);
    draw.line(ctx, x + (this.xMax * scale), -10000, x + (this.xMax * scale), 10000);
    draw.line(ctx, -10000, y + (-this.yMin * scale), 10000, y + (-this.yMin * scale));
    draw.line(ctx, -10000, y + (-this.yMax * scale), 10000, y + (-this.yMax * scale));
    // Draw the advance width
    ctx.strokeStyle = 'green';
    draw.line(ctx, x + (this.advanceWidth * scale), -10000, x + (this.advanceWidth * scale), 10000);
};

// Draw the glyph on the given SVG container element.
//
// parent - SVG container element to add path to
// x - Horizontal position of the glyph. (default: 0)
// y - Vertical position of the *baseline* of the glyph. (default: 0)
// fontSize - Font size, in pixels (default: 72).
Glyph.prototype.drawSVG = function (parent, x, y, fontSize) {
    return this.getPath(x, y, fontSize).drawSVG(parent);
};

// Draw the points of the glyph.
// On-curve points will be drawn in blue, off-curve points will be drawn in red.
//
// parent - SVG container element.
// x - Horizontal position of the glyph. (default: 0)
// y - Vertical position of the *baseline* of the glyph. (default: 0)
// fontSize - Font size, in pixels (default: 72).
Glyph.prototype.drawPointsSVG = function (parent, x, y, fontSize) {

    function drawCircles(l, x, y, scale, fill) {
        var j, PI_SQ = Math.PI * 2;
        for (j = 0; j < l.length; j += 1) {
            var cel = document.createElementNS("http://www.w3.org/2000/svg", "circle")
            var cx = x + (l[j].x * scale);
            var cy = y + (l[j].y * scale);
            cel.setAttribute('cx',cx);
            cel.setAttribute('cy',cy);
            cel.setAttribute('r', 2);
            if(fill) {
                cel.setAttribute('fill',fill);
            }
            //ctx.arc(cx, cy, 2, 0, PI_SQ, false);
            parent.appendChild(cel);
        }
    }

    var scale, i, blueCircles, redCircles, path, cmd;
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 24;
    scale = 1 / this.font.unitsPerEm * fontSize;

    blueCircles = [];
    redCircles = [];
    path = this.path;
    for (i = 0; i < path.commands.length; i += 1) {
        cmd = path.commands[i];
        if (cmd.x !== undefined) {
            blueCircles.push({x: cmd.x, y: -cmd.y});
        }
        if (cmd.x1 !== undefined) {
            redCircles.push({x: cmd.x1, y: -cmd.y1});
        }
        if (cmd.x2 !== undefined) {
            redCircles.push({x: cmd.x2, y: -cmd.y2});
        }
    }

    drawCircles(blueCircles, x, y, scale, 'blue');
    drawCircles(redCircles, x, y, scale, 'red');
};

// Draw lines indicating important font measurements.
// Black lines indicate the origin of the coordinate system (point 0,0).
// Blue lines indicate the glyph bounding box.
// Green line indicates the advance width of the glyph.
//
// parent - SVG container element.
// x - Horizontal position of the glyph. (default: 0)
// y - Vertical position of the *baseline* of the glyph. (default: 0)
// fontSize - Font size, in pixels (default: 72).
Glyph.prototype.drawMetricsSVG = function (parent, x, y, fontSize) {
    function drawline (x1, y1, x2, y2, stroke) {
        var lel = document.createElementNS("http://www.w3.org/2000/svg", 'line');
        lel.setAttribute('x1',x1);
        lel.setAttribute('y1',y1);
        lel.setAttribute('x2',x2);
        lel.setAttribute('y2',y2);
        lel.setAttribute('stroke',stroke)
        parent.appendChild(lel);
    }

    var scale;
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 24;
    scale = 1 / this.font.unitsPerEm * fontSize;

    // Draw the origin
    drawline(x, -10000, x, 10000,'black');
    drawline(-10000, y, 10000, y, 'black');

    // Draw the glyph box
    drawline(x + (this.xMin * scale), -10000, x + (this.xMin * scale), 10000, 'blue');
    drawline(x + (this.xMax * scale), -10000, x + (this.xMax * scale), 10000, 'blue');
    drawline(-10000, y + (-this.yMin * scale), 10000, y + (-this.yMin * scale), 'blue');
    drawline(-10000, y + (-this.yMax * scale), 10000, y + (-this.yMax * scale), 'blue');

    // Draw the advance width
    drawline(x + (this.advanceWidth * scale), -10000, x + (this.advanceWidth * scale), 10000, 'green');
};

exports.Glyph = Glyph;
