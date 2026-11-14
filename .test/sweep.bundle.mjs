// node_modules/d3-path/dist/d3-path.mjs
var pi = Math.PI;
var tau = 2 * pi;
var epsilon = 1e-6;
var tauEpsilon = tau - epsilon;
function append(strings) {
  this._ += strings[0];
  for (let i = 1, n = strings.length; i < n; ++i) {
    this._ += arguments[i] + strings[i];
  }
}
function appendRound(digits) {
  let d = Math.floor(digits);
  if (!(d >= 0)) throw new Error(`invalid digits: ${digits}`);
  if (d > 15) return append;
  const k2 = 10 ** d;
  return function(strings) {
    this._ += strings[0];
    for (let i = 1, n = strings.length; i < n; ++i) {
      this._ += Math.round(arguments[i] * k2) / k2 + strings[i];
    }
  };
}
function equal(x0, y0, x1, y1) {
  return x0 === x1 && y0 === y1;
}
function equalRound(digits) {
  const d = Math.floor(digits);
  if (!(d <= 15)) return equal;
  const k2 = 10 ** d;
  const r = function(value) {
    return Math.round(value * k2);
  };
  return function(x0, y0, x1, y1) {
    return r(x0) === r(x1) && r(y0) === r(y1);
  };
}
var Path = class {
  constructor(digits) {
    this._x0 = this._y0 = // start of current subpath
    this._x1 = this._y1 = null;
    this._ = "";
    this._append = digits == null ? append : appendRound(digits);
    this._equal = digits == null ? equal : equalRound(digits);
  }
  moveTo(x2, y2) {
    this._append`M${this._x0 = this._x1 = +x2},${this._y0 = this._y1 = +y2}`;
  }
  closePath() {
    if (this._x1 !== null) {
      this._x1 = this._x0, this._y1 = this._y0;
      this._append`Z`;
    }
  }
  lineTo(x2, y2) {
    this._append`L${this._x1 = +x2},${this._y1 = +y2}`;
  }
  quadraticCurveTo(x1, y1, x2, y2) {
    this._append`Q${+x1},${+y1},${this._x1 = +x2},${this._y1 = +y2}`;
  }
  bezierCurveTo(x1, y1, x2, y2, x3, y3) {
    this._append`C${+x1},${+y1},${+x2},${+y2},${this._x1 = +x3},${this._y1 = +y3}`;
  }
  arcTo(x1, y1, x2, y2, r) {
    x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
    if (r < 0) throw new Error(`negative radius: ${r}`);
    let x0 = this._x1, y0 = this._y1, x21 = x2 - x1, y21 = y2 - y1, x01 = x0 - x1, y01 = y0 - y1, l01_2 = x01 * x01 + y01 * y01;
    if (this._x1 === null) {
      this._append`M${this._x1 = x1},${this._y1 = y1}`;
    } else if (!(l01_2 > epsilon)) ;
    else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
      this._append`L${this._x1 = x1},${this._y1 = y1}`;
    } else {
      let x20 = x2 - x0, y20 = y2 - y0, l21_2 = x21 * x21 + y21 * y21, l20_2 = x20 * x20 + y20 * y20, l21 = Math.sqrt(l21_2), l01 = Math.sqrt(l01_2), l = r * Math.tan((pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2), t01 = l / l01, t21 = l / l21;
      if (Math.abs(t01 - 1) > epsilon) {
        this._append`L${x1 + t01 * x01},${y1 + t01 * y01}`;
      }
      this._append`A${r},${r},0,0,${+(y01 * x20 > x01 * y20)},${this._x1 = x1 + t21 * x21},${this._y1 = y1 + t21 * y21}`;
    }
  }
  arc(x2, y2, r, a0, a1, ccw) {
    x2 = +x2, y2 = +y2, r = +r, ccw = !!ccw;
    if (r < 0) throw new Error(`negative radius: ${r}`);
    let dx = r * Math.cos(a0), dy = r * Math.sin(a0), x0 = x2 + dx, y0 = y2 + dy, cw = 1 ^ ccw, da = ccw ? a0 - a1 : a1 - a0;
    if (this._x1 === null) {
      this._append`M${x0},${y0}`;
    } else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
      this._append`L${x0},${y0}`;
    }
    if (!r) return;
    if (da < 0) da = da % tau + tau;
    if (da > tauEpsilon) {
      this._append`A${r},${r},0,1,${cw},${x2 - dx},${y2 - dy}A${r},${r},0,1,${cw},${this._x1 = x0},${this._y1 = y0}`;
    } else if (da > epsilon) {
      const x1 = x2 + r * Math.cos(a1);
      const y1 = y2 + r * Math.sin(a1);
      if (da >= pi && this._equal(x0, y0, x1, y1)) {
        da /= 2;
        let a00 = a0 + da;
        this._append`A${r},${r},0,${+(da >= pi)},${cw},${x2 + r * Math.cos(a00)},${y2 + r * Math.sin(a00)}`;
      }
      this._append`A${r},${r},0,${+(da >= pi)},${cw},${this._x1 = x1},${this._y1 = y1}`;
    }
  }
  rect(x2, y2, w, h) {
    this._append`M${this._x0 = this._x1 = +x2},${this._y0 = this._y1 = +y2}h${w = +w}v${+h}h${-w}Z`;
  }
  toString() {
    return this._;
  }
};
function path() {
  return new Path();
}
path.prototype = Path.prototype;

// node_modules/d3-polygon/dist/d3-polygon.mjs
function area(polygon) {
  var i = -1, n = polygon.length, a2, b = polygon[n - 1], area2 = 0;
  while (++i < n) {
    a2 = b;
    b = polygon[i];
    area2 += a2[1] * b[0] - a2[0] * b[1];
  }
  return area2 / 2;
}

// node_modules/d3-shape/dist/d3-shape.mjs
function constant(x2) {
  return function constant2() {
    return x2;
  };
}
var cos = Math.cos;
var sin = Math.sin;
var sqrt = Math.sqrt;
var epsilon2 = 1e-12;
var pi2 = Math.PI;
var halfPi = pi2 / 2;
var tau2 = 2 * pi2;
function withPath(shape) {
  let digits = 3;
  shape.digits = function(_) {
    if (!arguments.length) return digits;
    if (_ == null) {
      digits = null;
    } else {
      const d = Math.floor(_);
      if (!(d >= 0)) throw new RangeError(`invalid digits: ${_}`);
      digits = d;
    }
    return shape;
  };
  return () => new Path(digits);
}
var slice = Array.prototype.slice;
function array(x2) {
  return typeof x2 === "object" && "length" in x2 ? x2 : Array.from(x2);
}
function Linear(context) {
  this._context = context;
}
Linear.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._point = 0;
  },
  lineEnd: function() {
    if (this._line || this._line !== 0 && this._point === 1) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x2, y2) {
    x2 = +x2, y2 = +y2;
    switch (this._point) {
      case 0:
        this._point = 1;
        this._line ? this._context.lineTo(x2, y2) : this._context.moveTo(x2, y2);
        break;
      case 1:
        this._point = 2;
      // falls through
      default:
        this._context.lineTo(x2, y2);
        break;
    }
  }
};
function curveLinear(context) {
  return new Linear(context);
}
function x(p) {
  return p[0];
}
function y(p) {
  return p[1];
}
function line(x$1, y$1) {
  var defined = constant(true), context = null, curve = curveLinear, output = null, path2 = withPath(line2);
  x$1 = typeof x$1 === "function" ? x$1 : x$1 === void 0 ? x : constant(x$1);
  y$1 = typeof y$1 === "function" ? y$1 : y$1 === void 0 ? y : constant(y$1);
  function line2(data) {
    var i, n = (data = array(data)).length, d, defined0 = false, buffer;
    if (context == null) output = curve(buffer = path2());
    for (i = 0; i <= n; ++i) {
      if (!(i < n && defined(d = data[i], i, data)) === defined0) {
        if (defined0 = !defined0) output.lineStart();
        else output.lineEnd();
      }
      if (defined0) output.point(+x$1(d, i, data), +y$1(d, i, data));
    }
    if (buffer) return output = null, buffer + "" || null;
  }
  line2.x = function(_) {
    return arguments.length ? (x$1 = typeof _ === "function" ? _ : constant(+_), line2) : x$1;
  };
  line2.y = function(_) {
    return arguments.length ? (y$1 = typeof _ === "function" ? _ : constant(+_), line2) : y$1;
  };
  line2.defined = function(_) {
    return arguments.length ? (defined = typeof _ === "function" ? _ : constant(!!_), line2) : defined;
  };
  line2.curve = function(_) {
    return arguments.length ? (curve = _, context != null && (output = curve(context)), line2) : curve;
  };
  line2.context = function(_) {
    return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), line2) : context;
  };
  return line2;
}
var curveRadialLinear = curveRadial(curveLinear);
function Radial(curve) {
  this._curve = curve;
}
Radial.prototype = {
  areaStart: function() {
    this._curve.areaStart();
  },
  areaEnd: function() {
    this._curve.areaEnd();
  },
  lineStart: function() {
    this._curve.lineStart();
  },
  lineEnd: function() {
    this._curve.lineEnd();
  },
  point: function(a2, r) {
    this._curve.point(r * Math.sin(a2), r * -Math.cos(a2));
  }
};
function curveRadial(curve) {
  function radial(context) {
    return new Radial(curve(context));
  }
  radial._curve = curve;
  return radial;
}
var sqrt3$2 = sqrt(3);
var tan30 = sqrt(1 / 3);
var tan30_2 = tan30 * 2;
var kr = sin(pi2 / 10) / sin(7 * pi2 / 10);
var kx = sin(tau2 / 10) * kr;
var ky = -cos(tau2 / 10) * kr;
var sqrt3$1 = sqrt(3);
var sqrt3 = sqrt(3);
var s = sqrt(3) / 2;
var k = 1 / sqrt(12);
var a = (k / 2 + 1) * 3;
function noop() {
}
function point$3(that, x2, y2) {
  that._context.bezierCurveTo(
    (2 * that._x0 + that._x1) / 3,
    (2 * that._y0 + that._y1) / 3,
    (that._x0 + 2 * that._x1) / 3,
    (that._y0 + 2 * that._y1) / 3,
    (that._x0 + 4 * that._x1 + x2) / 6,
    (that._y0 + 4 * that._y1 + y2) / 6
  );
}
function Basis(context) {
  this._context = context;
}
Basis.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._y0 = this._y1 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 3:
        point$3(this, this._x1, this._y1);
      // falls through
      case 2:
        this._context.lineTo(this._x1, this._y1);
        break;
    }
    if (this._line || this._line !== 0 && this._point === 1) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x2, y2) {
    x2 = +x2, y2 = +y2;
    switch (this._point) {
      case 0:
        this._point = 1;
        this._line ? this._context.lineTo(x2, y2) : this._context.moveTo(x2, y2);
        break;
      case 1:
        this._point = 2;
        break;
      case 2:
        this._point = 3;
        this._context.lineTo((5 * this._x0 + this._x1) / 6, (5 * this._y0 + this._y1) / 6);
      // falls through
      default:
        point$3(this, x2, y2);
        break;
    }
    this._x0 = this._x1, this._x1 = x2;
    this._y0 = this._y1, this._y1 = y2;
  }
};
function BasisClosed(context) {
  this._context = context;
}
BasisClosed.prototype = {
  areaStart: noop,
  areaEnd: noop,
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 1: {
        this._context.moveTo(this._x2, this._y2);
        this._context.closePath();
        break;
      }
      case 2: {
        this._context.moveTo((this._x2 + 2 * this._x3) / 3, (this._y2 + 2 * this._y3) / 3);
        this._context.lineTo((this._x3 + 2 * this._x2) / 3, (this._y3 + 2 * this._y2) / 3);
        this._context.closePath();
        break;
      }
      case 3: {
        this.point(this._x2, this._y2);
        this.point(this._x3, this._y3);
        this.point(this._x4, this._y4);
        break;
      }
    }
  },
  point: function(x2, y2) {
    x2 = +x2, y2 = +y2;
    switch (this._point) {
      case 0:
        this._point = 1;
        this._x2 = x2, this._y2 = y2;
        break;
      case 1:
        this._point = 2;
        this._x3 = x2, this._y3 = y2;
        break;
      case 2:
        this._point = 3;
        this._x4 = x2, this._y4 = y2;
        this._context.moveTo((this._x0 + 4 * this._x1 + x2) / 6, (this._y0 + 4 * this._y1 + y2) / 6);
        break;
      default:
        point$3(this, x2, y2);
        break;
    }
    this._x0 = this._x1, this._x1 = x2;
    this._y0 = this._y1, this._y1 = y2;
  }
};
function basisClosed(context) {
  return new BasisClosed(context);
}
function BasisOpen(context) {
  this._context = context;
}
BasisOpen.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._y0 = this._y1 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    if (this._line || this._line !== 0 && this._point === 3) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x2, y2) {
    x2 = +x2, y2 = +y2;
    switch (this._point) {
      case 0:
        this._point = 1;
        break;
      case 1:
        this._point = 2;
        break;
      case 2:
        this._point = 3;
        var x0 = (this._x0 + 4 * this._x1 + x2) / 6, y0 = (this._y0 + 4 * this._y1 + y2) / 6;
        this._line ? this._context.lineTo(x0, y0) : this._context.moveTo(x0, y0);
        break;
      case 3:
        this._point = 4;
      // falls through
      default:
        point$3(this, x2, y2);
        break;
    }
    this._x0 = this._x1, this._x1 = x2;
    this._y0 = this._y1, this._y1 = y2;
  }
};
function Bundle(context, beta) {
  this._basis = new Basis(context);
  this._beta = beta;
}
Bundle.prototype = {
  lineStart: function() {
    this._x = [];
    this._y = [];
    this._basis.lineStart();
  },
  lineEnd: function() {
    var x2 = this._x, y2 = this._y, j = x2.length - 1;
    if (j > 0) {
      var x0 = x2[0], y0 = y2[0], dx = x2[j] - x0, dy = y2[j] - y0, i = -1, t;
      while (++i <= j) {
        t = i / j;
        this._basis.point(
          this._beta * x2[i] + (1 - this._beta) * (x0 + t * dx),
          this._beta * y2[i] + (1 - this._beta) * (y0 + t * dy)
        );
      }
    }
    this._x = this._y = null;
    this._basis.lineEnd();
  },
  point: function(x2, y2) {
    this._x.push(+x2);
    this._y.push(+y2);
  }
};
var bundle = (function custom(beta) {
  function bundle2(context) {
    return beta === 1 ? new Basis(context) : new Bundle(context, beta);
  }
  bundle2.beta = function(beta2) {
    return custom(+beta2);
  };
  return bundle2;
})(0.85);
function point$2(that, x2, y2) {
  that._context.bezierCurveTo(
    that._x1 + that._k * (that._x2 - that._x0),
    that._y1 + that._k * (that._y2 - that._y0),
    that._x2 + that._k * (that._x1 - x2),
    that._y2 + that._k * (that._y1 - y2),
    that._x2,
    that._y2
  );
}
function Cardinal(context, tension) {
  this._context = context;
  this._k = (1 - tension) / 6;
}
Cardinal.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._y0 = this._y1 = this._y2 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 2:
        this._context.lineTo(this._x2, this._y2);
        break;
      case 3:
        point$2(this, this._x1, this._y1);
        break;
    }
    if (this._line || this._line !== 0 && this._point === 1) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x2, y2) {
    x2 = +x2, y2 = +y2;
    switch (this._point) {
      case 0:
        this._point = 1;
        this._line ? this._context.lineTo(x2, y2) : this._context.moveTo(x2, y2);
        break;
      case 1:
        this._point = 2;
        this._x1 = x2, this._y1 = y2;
        break;
      case 2:
        this._point = 3;
      // falls through
      default:
        point$2(this, x2, y2);
        break;
    }
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x2;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y2;
  }
};
var cardinal = (function custom2(tension) {
  function cardinal2(context) {
    return new Cardinal(context, tension);
  }
  cardinal2.tension = function(tension2) {
    return custom2(+tension2);
  };
  return cardinal2;
})(0);
function CardinalClosed(context, tension) {
  this._context = context;
  this._k = (1 - tension) / 6;
}
CardinalClosed.prototype = {
  areaStart: noop,
  areaEnd: noop,
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._x5 = this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = this._y5 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 1: {
        this._context.moveTo(this._x3, this._y3);
        this._context.closePath();
        break;
      }
      case 2: {
        this._context.lineTo(this._x3, this._y3);
        this._context.closePath();
        break;
      }
      case 3: {
        this.point(this._x3, this._y3);
        this.point(this._x4, this._y4);
        this.point(this._x5, this._y5);
        break;
      }
    }
  },
  point: function(x2, y2) {
    x2 = +x2, y2 = +y2;
    switch (this._point) {
      case 0:
        this._point = 1;
        this._x3 = x2, this._y3 = y2;
        break;
      case 1:
        this._point = 2;
        this._context.moveTo(this._x4 = x2, this._y4 = y2);
        break;
      case 2:
        this._point = 3;
        this._x5 = x2, this._y5 = y2;
        break;
      default:
        point$2(this, x2, y2);
        break;
    }
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x2;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y2;
  }
};
var cardinalClosed = (function custom3(tension) {
  function cardinal2(context) {
    return new CardinalClosed(context, tension);
  }
  cardinal2.tension = function(tension2) {
    return custom3(+tension2);
  };
  return cardinal2;
})(0);
function CardinalOpen(context, tension) {
  this._context = context;
  this._k = (1 - tension) / 6;
}
CardinalOpen.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._y0 = this._y1 = this._y2 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    if (this._line || this._line !== 0 && this._point === 3) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x2, y2) {
    x2 = +x2, y2 = +y2;
    switch (this._point) {
      case 0:
        this._point = 1;
        break;
      case 1:
        this._point = 2;
        break;
      case 2:
        this._point = 3;
        this._line ? this._context.lineTo(this._x2, this._y2) : this._context.moveTo(this._x2, this._y2);
        break;
      case 3:
        this._point = 4;
      // falls through
      default:
        point$2(this, x2, y2);
        break;
    }
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x2;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y2;
  }
};
var cardinalOpen = (function custom4(tension) {
  function cardinal2(context) {
    return new CardinalOpen(context, tension);
  }
  cardinal2.tension = function(tension2) {
    return custom4(+tension2);
  };
  return cardinal2;
})(0);
function point$1(that, x2, y2) {
  var x1 = that._x1, y1 = that._y1, x22 = that._x2, y22 = that._y2;
  if (that._l01_a > epsilon2) {
    var a2 = 2 * that._l01_2a + 3 * that._l01_a * that._l12_a + that._l12_2a, n = 3 * that._l01_a * (that._l01_a + that._l12_a);
    x1 = (x1 * a2 - that._x0 * that._l12_2a + that._x2 * that._l01_2a) / n;
    y1 = (y1 * a2 - that._y0 * that._l12_2a + that._y2 * that._l01_2a) / n;
  }
  if (that._l23_a > epsilon2) {
    var b = 2 * that._l23_2a + 3 * that._l23_a * that._l12_a + that._l12_2a, m = 3 * that._l23_a * (that._l23_a + that._l12_a);
    x22 = (x22 * b + that._x1 * that._l23_2a - x2 * that._l12_2a) / m;
    y22 = (y22 * b + that._y1 * that._l23_2a - y2 * that._l12_2a) / m;
  }
  that._context.bezierCurveTo(x1, y1, x22, y22, that._x2, that._y2);
}
function CatmullRom(context, alpha) {
  this._context = context;
  this._alpha = alpha;
}
CatmullRom.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._y0 = this._y1 = this._y2 = NaN;
    this._l01_a = this._l12_a = this._l23_a = this._l01_2a = this._l12_2a = this._l23_2a = this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 2:
        this._context.lineTo(this._x2, this._y2);
        break;
      case 3:
        this.point(this._x2, this._y2);
        break;
    }
    if (this._line || this._line !== 0 && this._point === 1) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x2, y2) {
    x2 = +x2, y2 = +y2;
    if (this._point) {
      var x23 = this._x2 - x2, y23 = this._y2 - y2;
      this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
    }
    switch (this._point) {
      case 0:
        this._point = 1;
        this._line ? this._context.lineTo(x2, y2) : this._context.moveTo(x2, y2);
        break;
      case 1:
        this._point = 2;
        break;
      case 2:
        this._point = 3;
      // falls through
      default:
        point$1(this, x2, y2);
        break;
    }
    this._l01_a = this._l12_a, this._l12_a = this._l23_a;
    this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x2;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y2;
  }
};
var catmullRom = (function custom5(alpha) {
  function catmullRom2(context) {
    return alpha ? new CatmullRom(context, alpha) : new Cardinal(context, 0);
  }
  catmullRom2.alpha = function(alpha2) {
    return custom5(+alpha2);
  };
  return catmullRom2;
})(0.5);
function CatmullRomClosed(context, alpha) {
  this._context = context;
  this._alpha = alpha;
}
CatmullRomClosed.prototype = {
  areaStart: noop,
  areaEnd: noop,
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._x5 = this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = this._y5 = NaN;
    this._l01_a = this._l12_a = this._l23_a = this._l01_2a = this._l12_2a = this._l23_2a = this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 1: {
        this._context.moveTo(this._x3, this._y3);
        this._context.closePath();
        break;
      }
      case 2: {
        this._context.lineTo(this._x3, this._y3);
        this._context.closePath();
        break;
      }
      case 3: {
        this.point(this._x3, this._y3);
        this.point(this._x4, this._y4);
        this.point(this._x5, this._y5);
        break;
      }
    }
  },
  point: function(x2, y2) {
    x2 = +x2, y2 = +y2;
    if (this._point) {
      var x23 = this._x2 - x2, y23 = this._y2 - y2;
      this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
    }
    switch (this._point) {
      case 0:
        this._point = 1;
        this._x3 = x2, this._y3 = y2;
        break;
      case 1:
        this._point = 2;
        this._context.moveTo(this._x4 = x2, this._y4 = y2);
        break;
      case 2:
        this._point = 3;
        this._x5 = x2, this._y5 = y2;
        break;
      default:
        point$1(this, x2, y2);
        break;
    }
    this._l01_a = this._l12_a, this._l12_a = this._l23_a;
    this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x2;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y2;
  }
};
var catmullRomClosed = (function custom6(alpha) {
  function catmullRom2(context) {
    return alpha ? new CatmullRomClosed(context, alpha) : new CardinalClosed(context, 0);
  }
  catmullRom2.alpha = function(alpha2) {
    return custom6(+alpha2);
  };
  return catmullRom2;
})(0.5);
function CatmullRomOpen(context, alpha) {
  this._context = context;
  this._alpha = alpha;
}
CatmullRomOpen.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._y0 = this._y1 = this._y2 = NaN;
    this._l01_a = this._l12_a = this._l23_a = this._l01_2a = this._l12_2a = this._l23_2a = this._point = 0;
  },
  lineEnd: function() {
    if (this._line || this._line !== 0 && this._point === 3) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x2, y2) {
    x2 = +x2, y2 = +y2;
    if (this._point) {
      var x23 = this._x2 - x2, y23 = this._y2 - y2;
      this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
    }
    switch (this._point) {
      case 0:
        this._point = 1;
        break;
      case 1:
        this._point = 2;
        break;
      case 2:
        this._point = 3;
        this._line ? this._context.lineTo(this._x2, this._y2) : this._context.moveTo(this._x2, this._y2);
        break;
      case 3:
        this._point = 4;
      // falls through
      default:
        point$1(this, x2, y2);
        break;
    }
    this._l01_a = this._l12_a, this._l12_a = this._l23_a;
    this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x2;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y2;
  }
};
var catmullRomOpen = (function custom7(alpha) {
  function catmullRom2(context) {
    return alpha ? new CatmullRomOpen(context, alpha) : new CardinalOpen(context, 0);
  }
  catmullRom2.alpha = function(alpha2) {
    return custom7(+alpha2);
  };
  return catmullRom2;
})(0.5);
function LinearClosed(context) {
  this._context = context;
}
LinearClosed.prototype = {
  areaStart: noop,
  areaEnd: noop,
  lineStart: function() {
    this._point = 0;
  },
  lineEnd: function() {
    if (this._point) this._context.closePath();
  },
  point: function(x2, y2) {
    x2 = +x2, y2 = +y2;
    if (this._point) this._context.lineTo(x2, y2);
    else this._point = 1, this._context.moveTo(x2, y2);
  }
};
function sign(x2) {
  return x2 < 0 ? -1 : 1;
}
function slope3(that, x2, y2) {
  var h0 = that._x1 - that._x0, h1 = x2 - that._x1, s0 = (that._y1 - that._y0) / (h0 || h1 < 0 && -0), s1 = (y2 - that._y1) / (h1 || h0 < 0 && -0), p = (s0 * h1 + s1 * h0) / (h0 + h1);
  return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
}
function slope2(that, t) {
  var h = that._x1 - that._x0;
  return h ? (3 * (that._y1 - that._y0) / h - t) / 2 : t;
}
function point(that, t0, t1) {
  var x0 = that._x0, y0 = that._y0, x1 = that._x1, y1 = that._y1, dx = (x1 - x0) / 3;
  that._context.bezierCurveTo(x0 + dx, y0 + dx * t0, x1 - dx, y1 - dx * t1, x1, y1);
}
function MonotoneX(context) {
  this._context = context;
}
MonotoneX.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._y0 = this._y1 = this._t0 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 2:
        this._context.lineTo(this._x1, this._y1);
        break;
      case 3:
        point(this, this._t0, slope2(this, this._t0));
        break;
    }
    if (this._line || this._line !== 0 && this._point === 1) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x2, y2) {
    var t1 = NaN;
    x2 = +x2, y2 = +y2;
    if (x2 === this._x1 && y2 === this._y1) return;
    switch (this._point) {
      case 0:
        this._point = 1;
        this._line ? this._context.lineTo(x2, y2) : this._context.moveTo(x2, y2);
        break;
      case 1:
        this._point = 2;
        break;
      case 2:
        this._point = 3;
        point(this, slope2(this, t1 = slope3(this, x2, y2)), t1);
        break;
      default:
        point(this, this._t0, t1 = slope3(this, x2, y2));
        break;
    }
    this._x0 = this._x1, this._x1 = x2;
    this._y0 = this._y1, this._y1 = y2;
    this._t0 = t1;
  }
};
function MonotoneY(context) {
  this._context = new ReflectContext(context);
}
(MonotoneY.prototype = Object.create(MonotoneX.prototype)).point = function(x2, y2) {
  MonotoneX.prototype.point.call(this, y2, x2);
};
function ReflectContext(context) {
  this._context = context;
}
ReflectContext.prototype = {
  moveTo: function(x2, y2) {
    this._context.moveTo(y2, x2);
  },
  closePath: function() {
    this._context.closePath();
  },
  lineTo: function(x2, y2) {
    this._context.lineTo(y2, x2);
  },
  bezierCurveTo: function(x1, y1, x2, y2, x3, y3) {
    this._context.bezierCurveTo(y1, x1, y2, x2, y3, x3);
  }
};
function Natural(context) {
  this._context = context;
}
Natural.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x = [];
    this._y = [];
  },
  lineEnd: function() {
    var x2 = this._x, y2 = this._y, n = x2.length;
    if (n) {
      this._line ? this._context.lineTo(x2[0], y2[0]) : this._context.moveTo(x2[0], y2[0]);
      if (n === 2) {
        this._context.lineTo(x2[1], y2[1]);
      } else {
        var px = controlPoints(x2), py = controlPoints(y2);
        for (var i0 = 0, i1 = 1; i1 < n; ++i0, ++i1) {
          this._context.bezierCurveTo(px[0][i0], py[0][i0], px[1][i0], py[1][i0], x2[i1], y2[i1]);
        }
      }
    }
    if (this._line || this._line !== 0 && n === 1) this._context.closePath();
    this._line = 1 - this._line;
    this._x = this._y = null;
  },
  point: function(x2, y2) {
    this._x.push(+x2);
    this._y.push(+y2);
  }
};
function controlPoints(x2) {
  var i, n = x2.length - 1, m, a2 = new Array(n), b = new Array(n), r = new Array(n);
  a2[0] = 0, b[0] = 2, r[0] = x2[0] + 2 * x2[1];
  for (i = 1; i < n - 1; ++i) a2[i] = 1, b[i] = 4, r[i] = 4 * x2[i] + 2 * x2[i + 1];
  a2[n - 1] = 2, b[n - 1] = 7, r[n - 1] = 8 * x2[n - 1] + x2[n];
  for (i = 1; i < n; ++i) m = a2[i] / b[i - 1], b[i] -= m, r[i] -= m * r[i - 1];
  a2[n - 1] = r[n - 1] / b[n - 1];
  for (i = n - 2; i >= 0; --i) a2[i] = (r[i] - a2[i + 1]) / b[i];
  b[n - 1] = (x2[n] + a2[n - 1]) / 2;
  for (i = 0; i < n - 1; ++i) b[i] = 2 * x2[i + 1] - a2[i + 1];
  return [a2, b];
}
function Step(context, t) {
  this._context = context;
  this._t = t;
}
Step.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x = this._y = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    if (0 < this._t && this._t < 1 && this._point === 2) this._context.lineTo(this._x, this._y);
    if (this._line || this._line !== 0 && this._point === 1) this._context.closePath();
    if (this._line >= 0) this._t = 1 - this._t, this._line = 1 - this._line;
  },
  point: function(x2, y2) {
    x2 = +x2, y2 = +y2;
    switch (this._point) {
      case 0:
        this._point = 1;
        this._line ? this._context.lineTo(x2, y2) : this._context.moveTo(x2, y2);
        break;
      case 1:
        this._point = 2;
      // falls through
      default: {
        if (this._t <= 0) {
          this._context.lineTo(this._x, y2);
          this._context.lineTo(x2, y2);
        } else {
          var x1 = this._x * (1 - this._t) + x2 * this._t;
          this._context.lineTo(x1, this._y);
          this._context.lineTo(x1, y2);
        }
        break;
      }
    }
    this._x = x2, this._y = y2;
  }
};

// src/rng.js
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return function() {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function mulberry32(a2) {
  return function() {
    a2 |= 0;
    a2 = a2 + 1831565813 | 0;
    let t = Math.imul(a2 ^ a2 >>> 15, 1 | a2);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function makeRng(seedStr) {
  const seedFn = xmur3(String(seedStr));
  return mulberry32(seedFn());
}

// src/generator.js
var CANVAS_W = 640;
var CANVAS_H = 560;
var VIEW_TYPES = {
  A4C: {
    name: "\u5FC3\u5C16\u56DB\u8154\u5207\u9762",
    chambers: [
      { key: "LV", label: "\u5DE6\u5FC3\u5BA4", cx: 258, cy: 285, rx: 68, ry: 128, rot: -8, ratio: 0.41 },
      { key: "RV", label: "\u53F3\u5FC3\u5BA4", cx: 402, cy: 278, rx: 54, ry: 112, rot: 10, ratio: 0.29 },
      { key: "LA", label: "\u5DE6\u5FC3\u623F", cx: 252, cy: 462, rx: 62, ry: 52, rot: 0, ratio: 0.15 },
      { key: "RA", label: "\u53F3\u5FC3\u623F", cx: 406, cy: 458, rx: 60, ry: 52, rot: 0, ratio: 0.15 }
    ],
    valves: [
      { key: "MV", label: "\u4E8C\u5C16\u74E3", between: ["LA", "LV"] },
      { key: "TV", label: "\u4E09\u5C16\u74E3", between: ["RA", "RV"] }
    ],
    flows: [
      { key: "FLV", label: "\u8212\u5F20\u671F\u6D41\u5165", from: "LA", to: "LV" },
      { key: "FRV", label: "\u8212\u5F20\u671F\u6D41\u5165", from: "RA", to: "RV" }
    ]
  },
  PLAX: {
    name: "\u80F8\u9AA8\u65C1\u5DE6\u5BA4\u957F\u8F74\u5207\u9762",
    chambers: [
      { key: "LV", label: "\u5DE6\u5FC3\u5BA4", cx: 285, cy: 320, rx: 140, ry: 60, rot: 0, ratio: 0.49 },
      { key: "LA", label: "\u5DE6\u5FC3\u623F", cx: 480, cy: 345, rx: 56, ry: 46, rot: 0, ratio: 0.15 },
      { key: "RVOT", label: "\u53F3\u5BA4\u6D41\u51FA\u9053", cx: 280, cy: 210, rx: 125, ry: 34, rot: 0, ratio: 0.25 },
      { key: "AO", label: "\u4E3B\u52A8\u8109", cx: 465, cy: 245, rx: 62, ry: 30, rot: 0, ratio: 0.11 }
    ],
    valves: [
      { key: "MV", label: "\u4E8C\u5C16\u74E3", between: ["LA", "LV"] },
      { key: "AV", label: "\u4E3B\u52A8\u8109\u74E3", between: ["LV", "AO"] }
    ],
    flows: [
      { key: "FAO", label: "\u6536\u7F29\u671F\u5C04\u8840", from: "LV", to: "AO" },
      { key: "FLV", label: "\u8212\u5F20\u671F\u6D41\u5165", from: "LA", to: "LV" }
    ]
  },
  PSAX: {
    name: "\u4E73\u5934\u808C\u6C34\u5E73\u77ED\u8F74\u5207\u9762",
    chambers: [
      { key: "LV", label: "\u5DE6\u5FC3\u5BA4\u8154", cx: 330, cy: 320, rx: 96, ry: 92, rot: 0, ratio: 0.61 },
      { key: "RV", label: "\u53F3\u5FC3\u5BA4", cx: 320, cy: 180, rx: 92, ry: 40, rot: 0, ratio: 0.26 },
      { key: "IVS", label: "\u5BA4\u95F4\u9694", cx: 330, cy: 250, rx: 88, ry: 22, rot: 0, ratio: 0.13 }
    ],
    valves: [{ key: "MV", label: "\u4E8C\u5C16\u74E3(\u9C7C\u53E3)", between: ["IVS", "LV"] }],
    flows: [{ key: "FLV", label: "\u8212\u5F20\u671F\u6D41\u5165", from: "IVS", to: "LV" }]
  },
  SC: {
    name: "\u5251\u7A81\u4E0B\u56DB\u8154\u5207\u9762",
    chambers: [
      { key: "LV", label: "\u5DE6\u5FC3\u5BA4", cx: 382, cy: 285, rx: 68, ry: 126, rot: 8, ratio: 0.41 },
      { key: "RV", label: "\u53F3\u5FC3\u5BA4", cx: 238, cy: 278, rx: 54, ry: 110, rot: -10, ratio: 0.29 },
      { key: "LA", label: "\u5DE6\u5FC3\u623F", cx: 388, cy: 462, rx: 62, ry: 52, rot: 0, ratio: 0.15 },
      { key: "RA", label: "\u53F3\u5FC3\u623F", cx: 234, cy: 458, rx: 60, ry: 52, rot: 0, ratio: 0.15 }
    ],
    valves: [
      { key: "MV", label: "\u4E8C\u5C16\u74E3", between: ["LA", "LV"] },
      { key: "TV", label: "\u4E09\u5C16\u74E3", between: ["RA", "RV"] }
    ],
    flows: [
      { key: "FLV", label: "\u8212\u5F20\u671F\u6D41\u5165", from: "LA", to: "LV" },
      { key: "FRV", label: "\u8212\u5F20\u671F\u6D41\u5165", from: "RA", to: "RV" }
    ]
  }
};
var LEVELS = {
  L1: { name: "L1 \u4EC5\u8154\u5BA4", chambers: true, valves: false, flows: false },
  L2: { name: "L2 \u8154\u5BA4+\u74E3\u819C", chambers: true, valves: true, flows: false },
  L3: { name: "L3 \u8154\u5BA4+\u74E3\u819C+\u8840\u6D41", chambers: true, valves: true, flows: true }
};
var deg2rad = (d) => d * Math.PI / 180;
function rotatePt(x2, y2, cx, cy, deg) {
  const r = deg2rad(deg);
  const cos2 = Math.cos(r), sin2 = Math.sin(r);
  const dx = x2 - cx, dy = y2 - cy;
  return [cx + dx * cos2 - dy * sin2, cy + dx * sin2 + dy * cos2];
}
function ellipsePoints(cx, cy, rx, ry, rot, rng, n = 28) {
  const pts = [];
  const rr = deg2rad(rot);
  const cos2 = Math.cos(rr), sin2 = Math.sin(rr);
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2;
    const wobble = 1 + (rng() * 2 - 1) * 0.06;
    const ex = Math.cos(t) * rx * wobble;
    const ey = Math.sin(t) * ry * wobble;
    pts.push([cx + ex * cos2 - ey * sin2, cy + ex * sin2 + ey * cos2]);
  }
  return pts;
}
var pathOf = line().x((d) => d[0]).y((d) => d[1]).curve(basisClosed);
function boundaryPoint(chamber, angleDeg) {
  const t = deg2rad(angleDeg);
  const tx = chamber.cx + Math.cos(t) * 500;
  const ty = chamber.cy + Math.sin(t) * 500;
  let best = chamber.points[0], bd = Infinity;
  for (const p of chamber.points) {
    const d = (p[0] - tx) ** 2 + (p[1] - ty) ** 2;
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return { x: best[0], y: best[1] };
}
function generateView(params, viewIndex) {
  const tpl = VIEW_TYPES[params.viewType];
  const lvl = LEVELS[params.level];
  const rng = makeRng(`${params.seed}::${params.viewType}::${viewIndex}`);
  const angle = Number(params.probeAngle) || 0;
  const CX = CANVAS_W / 2, CY = CANVAS_H / 2;
  const chambers = tpl.chambers.map((c, i) => {
    const j = (v, amt) => v + (rng() * 2 - 1) * amt;
    const cx = j(c.cx, 14), cy = j(c.cy, 12);
    const rx = c.rx * (0.92 + rng() * 0.16);
    const ry = c.ry * (0.92 + rng() * 0.16);
    const rot = (c.rot || 0) + (rng() * 2 - 1) * 6;
    let pts = ellipsePoints(cx, cy, rx, ry, rot, rng);
    if (angle) pts = pts.map(([x2, y2]) => rotatePt(x2, y2, CX, CY, angle));
    const rcx = angle ? rotatePt(cx, cy, CX, CY, angle) : [cx, cy];
    return {
      key: c.key,
      label: c.label,
      targetRatio: c.ratio,
      colorIdx: i,
      cx: rcx[0],
      cy: rcx[1],
      rx,
      ry,
      rot: rot + angle,
      points: pts,
      path: pathOf(pts),
      area: Math.abs(area(pts))
    };
  });
  const totalArea = chambers.reduce((s2, c) => s2 + c.area, 0);
  chambers.forEach((c) => {
    c.actualRatio = c.area / totalArea;
  });
  const byKey = Object.fromEntries(chambers.map((c) => [c.key, c]));
  const valves = tpl.valves.map((v) => {
    const a2 = byKey[v.between[0]], b = byKey[v.between[1]];
    const mx = (a2.cx + b.cx) / 2, my = (a2.cy + b.cy) / 2;
    const dx = b.cx - a2.cx, dy = b.cy - a2.cy;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len, py = dx / len;
    const half = 16 + rng() * 10;
    return {
      key: v.key,
      label: v.label,
      x1: mx - px * half,
      y1: my - py * half,
      x2: mx + px * half,
      y2: my + py * half,
      mx,
      my
    };
  });
  const flows = tpl.flows.map((f) => {
    const a2 = byKey[f.from], b = byKey[f.to];
    const dx = b.cx - a2.cx, dy = b.cy - a2.cy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const trim = 26;
    return {
      key: f.key,
      label: f.label,
      x1: a2.cx + ux * trim,
      y1: a2.cy + uy * trim,
      x2: b.cx - ux * trim,
      y2: b.cy - uy * trim,
      mx: (a2.cx + b.cx) / 2,
      my: (a2.cy + b.cy) / 2
    };
  });
  const annotations = [];
  const addAnn = (targetKey, text, anchor, baseAngle) => {
    const a2 = baseAngle + (rng() * 2 - 1) * 30;
    const dist = 42 + rng() * 55;
    annotations.push({
      id: `ann-${viewIndex}-${targetKey}`,
      targetKey,
      text,
      anchor: { x: Math.round(anchor.x), y: Math.round(anchor.y) },
      x: Math.round(anchor.x + Math.cos(deg2rad(a2)) * dist),
      y: Math.round(anchor.y + Math.sin(deg2rad(a2)) * dist),
      locked: false,
      manual: false
    });
  };
  if (lvl.chambers) {
    chambers.forEach((c) => {
      const side = c.cx < CX ? 180 : 0;
      addAnn(c.key, c.label, boundaryPoint(c, side), side);
    });
  }
  if (lvl.valves) valves.forEach((v) => addAnn(v.key, v.label, { x: v.mx, y: v.my }, v.mx < CX ? 200 : -20));
  if (lvl.flows) flows.forEach((f) => addAnn(f.key, f.label, { x: f.mx, y: f.my }, 90));
  return {
    index: viewIndex,
    viewType: params.viewType,
    viewName: tpl.name,
    chambers,
    valves,
    flows,
    annotations,
    requiredTargets: requiredTargets(params)
  };
}
function requiredTargets(params) {
  const tpl = VIEW_TYPES[params.viewType];
  const lvl = LEVELS[params.level];
  const req = tpl.chambers.map((c) => ({ key: c.key, label: c.label }));
  if (lvl.valves) tpl.valves.forEach((v) => req.push({ key: v.key, label: v.label }));
  if (lvl.flows) tpl.flows.forEach((f) => req.push({ key: f.key, label: f.label }));
  return req;
}
function generateBatchViews(params) {
  const views = [];
  for (let i = 0; i < params.count; i++) views.push(generateView(params, i));
  return views;
}

// src/qc.js
function textBBox(ann, fontSize = 12) {
  let w = 0;
  for (const ch of ann.text) w += ch.charCodeAt(0) > 255 ? fontSize : fontSize * 0.55;
  return { x: ann.x, y: ann.y - fontSize, w, h: fontSize + 4 };
}
function segIntersect(p1, p2, p3, p4) {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-9) return false;
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  return t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98;
}
function bboxOverlap(a2, b) {
  return a2.x < b.x + b.w && a2.x + a2.w > b.x && a2.y < b.y + b.h && a2.y + a2.h > b.y;
}
var seq = 0;
function issue(batchId, viewIndex, type, severity, message, targetKey = null) {
  return {
    id: `IS-${batchId}-${viewIndex}-${type}-${targetKey || seq++}`,
    batchId,
    viewIndex,
    type,
    severity,
    message,
    targetKey,
    status: "pending",
    // pending | confirmed | rejected
    comment: "",
    reviewer: ""
  };
}
function checkView(batchId, view) {
  const out = [];
  const M = 4;
  for (const ann of view.annotations) {
    const b = textBBox(ann);
    if (b.x < M || b.y < M || b.x + b.w > CANVAS_W - M || b.y + b.h > CANVAS_H - M) {
      out.push(issue(
        batchId,
        view.index,
        "outOfBounds",
        "severe",
        `\u6807\u6CE8\u300C${ann.text}\u300D\u8D85\u51FA\u56FE\u5E45\u8FB9\u754C (x=${ann.x}, y=${ann.y})`,
        ann.targetKey
      ));
    }
  }
  for (const c of view.chambers) {
    const dev = (c.actualRatio - c.targetRatio) * 100;
    const adev = Math.abs(dev);
    if (adev > 5) {
      out.push(issue(
        batchId,
        view.index,
        "areaRatio",
        "severe",
        `\u300C${c.label}\u300D\u9762\u79EF\u5360\u6BD4 ${(c.actualRatio * 100).toFixed(1)}%\uFF0C\u6807\u51C6 ${(c.targetRatio * 100).toFixed(1)}%\uFF0C\u504F\u5DEE ${dev > 0 ? "+" : ""}${dev.toFixed(1)} \u4E2A\u767E\u5206\u70B9\uFF08>5\uFF09`,
        c.key
      ));
    } else if (adev > 3) {
      out.push(issue(
        batchId,
        view.index,
        "areaRatio",
        "major",
        `\u300C${c.label}\u300D\u9762\u79EF\u5360\u6BD4\u504F\u5DEE ${dev > 0 ? "+" : ""}${dev.toFixed(1)} \u4E2A\u767E\u5206\u70B9\uFF083~5\uFF09`,
        c.key
      ));
    }
  }
  const anns = view.annotations;
  for (let i = 0; i < anns.length; i++) {
    for (let j = i + 1; j < anns.length; j++) {
      if (bboxOverlap(textBBox(anns[i]), textBBox(anns[j]))) {
        out.push(issue(
          batchId,
          view.index,
          "textOverlap",
          "major",
          `\u6807\u6CE8\u300C${anns[i].text}\u300D\u4E0E\u300C${anns[j].text}\u300D\u6587\u5B57\u91CD\u53E0`,
          anns[i].targetKey
        ));
      }
    }
  }
  for (const req of view.requiredTargets) {
    if (!anns.some((a2) => a2.targetKey === req.key)) {
      out.push(issue(
        batchId,
        view.index,
        "missing",
        "severe",
        `\u7F3A\u5931\u5FC5\u8981\u6807\u6CE8\u300C${req.label}\u300D`,
        req.key
      ));
    }
  }
  for (let i = 0; i < anns.length; i++) {
    for (let j = i + 1; j < anns.length; j++) {
      const a2 = anns[i], b = anns[j];
      if (segIntersect(a2.anchor, a2, b.anchor, b)) {
        out.push(issue(
          batchId,
          view.index,
          "leaderCross",
          "minor",
          `\u300C${a2.text}\u300D\u4E0E\u300C${b.text}\u300D\u7684\u6807\u6CE8\u5F15\u7EBF\u4EA4\u53C9`,
          a2.targetKey
        ));
      }
    }
  }
  return out;
}
function checkBatch(batch) {
  seq = 0;
  return batch.views.flatMap((v) => checkView(batch.id, v));
}

// .test/sweep.mjs
for (const seed of ["SEED-1001", "SEED-2042", "SEED-3077", "SEED-4100", "SEED-5555"]) {
  for (const vt of ["A4C", "PLAX", "PSAX", "SC"]) {
    const views = generateBatchViews({ viewType: vt, probeAngle: 6, level: "L3", seed, count: 3 });
    const issues = checkBatch({ id: "T", views });
    const by = {};
    issues.forEach((i) => by[i.type + ":" + i.severity[0]] = (by[i.type + ":" + i.severity[0]] || 0) + 1);
    console.log(seed, vt, JSON.stringify(by));
  }
}
