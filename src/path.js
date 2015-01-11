// Geometric objects

'use strict';

// A bézier path containing a set of path commands similar to a SVG path.
// Paths can be drawn on a context using `draw`.
function Path() {
    this.commands = [];
    this.fill = 'black';
    this.stroke = null;
    this.strokeWidth = 1;
}

Path.prototype.moveTo = function (x, y) {
    this.commands.push({
        type: 'M',
        x: x,
        y: y
    });
};

Path.prototype.lineTo = function (x, y) {
    this.commands.push({
        type: 'L',
        x: x,
        y: y
    });
};

Path.prototype.curveTo = Path.prototype.bezierCurveTo = function (x1, y1, x2, y2, x, y) {
    this.commands.push({
        type: 'C',
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        x: x,
        y: y
    });
};

Path.prototype.quadTo = Path.prototype.quadraticCurveTo = function (x1, y1, x, y) {
    this.commands.push({
        type: 'Q',
        x1: x1,
        y1: y1,
        x: x,
        y: y
    });
};

Path.prototype.close = Path.prototype.closePath = function () {
    this.commands.push({
        type: 'Z'
    });
};

// Add the given path or list of commands to the commands of this path.
Path.prototype.extend = function (pathOrCommands) {
    if (pathOrCommands.commands) {
        pathOrCommands = pathOrCommands.commands;
    }
    Array.prototype.push.apply(this.commands, pathOrCommands);
};

// Draw the path to a 2D context.
Path.prototype.draw = function (ctx) {
    var i, cmd;
    ctx.beginPath();
    for (i = 0; i < this.commands.length; i += 1) {
        cmd = this.commands[i];
        if (cmd.type === 'M') {
            ctx.moveTo(cmd.x, cmd.y);
        } else if (cmd.type === 'L') {
            ctx.lineTo(cmd.x, cmd.y);
        } else if (cmd.type === 'C') {
            ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
        } else if (cmd.type === 'Q') {
            ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
        } else if (cmd.type === 'Z') {
            ctx.closePath();
        }
    }
    if (this.fill) {
        ctx.fillStyle = this.fill;
        ctx.fill();
    }
    if (this.stroke) {
        ctx.strokeStyle = this.stroke;
        ctx.lineWidth = this.strokeWidth;
        ctx.stroke();
    }
};

// Convert the Path to a string of path data instructions
// See http://www.w3.org/TR/SVG/paths.html#PathData
// Parameters:
// - decimalPlaces: The amount of decimal places for floating-point values (default: 2)
Path.prototype.toPathData = function (decimalPlaces) {
    decimalPlaces = decimalPlaces !== undefined ? decimalPlaces : 2;

    function floatToString(v) {
        if (Math.round(v) === v) {
            return '' + Math.round(v);
        } else {
            return v.toFixed(decimalPlaces);
        }
    }

    function packValues() {
        var s = '';
        for (var i = 0; i < arguments.length; i += 1) {
            var v = arguments[i];
            if (v >= 0 && i > 0) {
                s += ' ';
            }
            s += floatToString(v);
        }
        return s;
    }

    var d = '';
    for (var i = 0; i < this.commands.length; i += 1) {
        var cmd = this.commands[i];
        if (cmd.type === 'M') {
            d += 'M' + packValues(cmd.x, cmd.y);
        } else if (cmd.type === 'L') {
            d += 'L' + packValues(cmd.x, cmd.y);
        } else if (cmd.type === 'C') {
            d += 'C' + packValues(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
        } else if (cmd.type === 'Q') {
            d += 'Q' + packValues(cmd.x1, cmd.y1, cmd.x, cmd.y);
        } else if (cmd.type === 'Z') {
            d += 'Z';
        }
    }
    return d;
};

// Convert the path to a SVG <path> element, as a string.
// Parameters:
// - decimalPlaces: The amount of decimal places for floating-point values (default: 2)
Path.prototype.toSVG = function (decimalPlaces) {
    var svg = '<path d="';
    svg += this.toPathData(decimalPlaces);
    svg += '"';
    if (this.fill & this.fill !== 'black') {
        if (this.fill === null) {
            svg += ' fill="none"';
        } else {
            svg += ' fill="' + this.fill + '"';
        }
    }
    if (this.stroke) {
        svg += ' stroke="' + this.stroke + '" stroke-width="' + this.strokeWidth + '"';
    }
    svg += '/>';
    return svg;
};

Path.prototype.drawSVG = function drawSVG(parent) {
            function fixd(v) {
                if (Math.round(v) === v) {
                    return Math.round(v);
                } else {
                    return v.toFixed(2);
                }
            }

    var i, cmd;
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    parent.appendChild(path);

    var useSegList =  true; //to debug, set false (will use toPathData to set path d string)
    if (useSegList) {
        var sl = path.pathSegList;
        // sl.clear(); //new path, totally unnecessary!


        for (i = 0; i < this.commands.length; i += 1) {
            cmd = this.commands[i];
            var seg;
            if (cmd.type === 'M') {
                seg = path.createSVGPathSegMovetoAbs(fixd(cmd.x),fixd(cmd.y));
            } else if (cmd.type === 'L') {
                seg = path.createSVGPathSegLinetoAbs(fixd(cmd.x),fixd(cmd.y));
            } else if (cmd.type === 'C') {
                seg = path.createSVGPathSegCurvetoCubicAbs(fixd(cmd.x), fixd(cmd.y), fixd(cmd.x1), fixd(cmd.y1), fixd(cmd.x2), fixd(cmd.y2));
            } else if (cmd.type === 'Q') {
                seg = path.createSVGPathSegCurvetoQuadraticAbs(fixd(cmd.x), fixd(cmd.y), fixd(cmd.x1), fixd(cmd.y1));
            } else if (cmd.type === 'Z') {
                seg = path.createSVGPathSegClosePath();
            }
            if(seg) {
                sl.appendItem(seg);
            }
        }
    }
    else {
        path.setAttribute('d',this.toPathData()); //TODO build out seg list to avoid string proc slowdown
    }

    if (this.fill) {
        path.setAttribute('fill',this.fill);
    }
    if(this.stroke) {
        path.setAttribute('stroke',this.stroke);
        path.setAttribute('strokeWidth',this.strokeWidth);
    }

    return path;
};

exports.Path = Path;

