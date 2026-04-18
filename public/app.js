(function () {
  var REFRESH_MS = 2000;
  var HISTORY_LEN = 20;
  var RING_HUE = 155;
  var NET_BAR_COLOR = "#7fe3b5";
  var CPU_CENTER_X = 82;
  var CPU_CENTER_Y = 74;
  var MEM_CENTER_X = 176;
  var MEM_CENTER_Y = 94;

  function drawRing(
    ctx,
    centerX,
    centerY,
    outerRadius,
    width,
    startAngle,
    endAngle,
    isCounterClockwise,
    percentage,
    bgHue,
    bgAlpha,
    colorHue,
    alpha,
  ) {
    var percentAngle;
    var p = Math.min(1, Math.max(0, percentage));
    if (isCounterClockwise) {
      if (endAngle < startAngle) {
        percentAngle = -((-endAngle + startAngle) * p - startAngle);
      } else {
        percentAngle = -((360 - endAngle + startAngle) * p - startAngle);
      }
    } else {
      if (endAngle < startAngle) {
        percentAngle = (360 + endAngle - startAngle) * p + startAngle;
      } else {
        percentAngle = (endAngle - startAngle) * p + startAngle;
      }
    }

    percentAngle *= (2 * Math.PI) / 360;
    endAngle *= (2 * Math.PI) / 360;
    startAngle *= (2 * Math.PI) / 360;

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle, isCounterClockwise);
    ctx.arc(centerX, centerY, outerRadius - width, endAngle, startAngle, !isCounterClockwise);
    ctx.fillStyle = "hsla(" + bgHue + ",100%,100%," + bgAlpha + ")";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, startAngle, percentAngle, isCounterClockwise);
    ctx.arc(centerX, centerY, outerRadius - width, percentAngle, startAngle, !isCounterClockwise);
    ctx.fillStyle = "hsla(" + colorHue + ",100%,70%," + alpha + ")";
    ctx.fill();
  }

  function formatRate(bytesPerSec) {
    var units = ["B/s", "KB/s", "MB/s", "GB/s"];
    var v = Math.max(0, bytesPerSec || 0);
    var i = 0;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i++;
    }
    return v.toFixed(2) + " " + units[i];
  }

  function formatGiB(bytes) {
    var gb = (bytes || 0) / Math.pow(1024, 3);
    return gb.toFixed(2) + "G";
  }

  function drawMiniBarChart(c, data, maxVal, color) {
    var w = c.canvas.width;
    var h = c.canvas.height;
    c.clearRect(0, 0, w, h);
    var barW = w / data.length;
    var m = maxVal > 0 ? maxVal : 1;
    for (var i = 0; i < data.length; i++) {
      var v = Math.abs(data[i] || 0);
      var bh = (v / m) * (h - 2);
      c.fillStyle = "#444";
      c.fillRect(i * barW, 0, barW - 1, h);
      c.fillStyle = color;
      c.fillRect(i * barW, h - bh, barW - 1, bh);
    }
  }

  var ringsCanvas = document.getElementById("rings");
  var ctx = ringsCanvas && ringsCanvas.getContext ? ringsCanvas.getContext("2d") : null;

  var chartUp = document.getElementById("chart-up");
  var chartDown = document.getElementById("chart-down");
  var ctxUp = chartUp && chartUp.getContext ? chartUp.getContext("2d") : null;
  var ctxDn = chartDown && chartDown.getContext ? chartDown.getContext("2d") : null;

  var elCpuTemp = document.getElementById("cputemp");
  var elMemData = document.getElementById("mem-data");
  var elNetUp = document.getElementById("net-up");
  var elNetDown = document.getElementById("net-down");
  var elExternalIp = document.getElementById("external-ip");
  var elBattery = document.getElementById("battery-row");

  var upHistory = [];
  var downHistory = [];
  for (var i = 0; i < HISTORY_LEN; i++) {
    upHistory.push(0);
    downHistory.push(0);
  }

  function renderMetrics(m) {
    var cores = (m && m.cpu && m.cpu.cores) || [];
    var used = m && m.memory ? m.memory.used : 0;
    var total = m && m.memory ? m.memory.total : 1;
    var tx = m && m.network ? m.network.txBytesPerSec : 0;
    var rx = m && m.network ? m.network.rxBytesPerSec : 0;

    if (elCpuTemp) {
      if (m && typeof m.cpuTempC === "number") elCpuTemp.textContent = Math.round(m.cpuTempC) + "°";
      else elCpuTemp.textContent = "";
    }

    if (elMemData) elMemData.textContent = formatGiB(used) + "/" + formatGiB(total);

    if (elNetUp) elNetUp.textContent = formatRate(tx);
    if (elNetDown) elNetDown.textContent = formatRate(rx);

    if (elExternalIp) {
      var ip = m && m.externalIp ? String(m.externalIp).trim() : "";
      elExternalIp.textContent = ip ? ip : "—";
    }

    if (elBattery) {
      if (m && m.battery) elBattery.textContent = "Battery " + m.battery.percent + "% · " + m.battery.state;
      else elBattery.textContent = "";
    }

    upHistory.push(tx);
    upHistory.shift();
    downHistory.push(-rx);
    downHistory.shift();

    if (ctx && ringsCanvas) {
      ctx.clearRect(0, 0, ringsCanvas.width, ringsCanvas.height);
      for (var i = cores.length - 1; i >= 0; i--) {
        var load = cores[i] || 0;
        drawRing(
          ctx,
          CPU_CENTER_X,
          CPU_CENTER_Y,
          25 + i * 7,
          6,
          30,
          330,
          false,
          load / 100,
          0,
          0.5,
          RING_HUE,
          0.5,
        );
      }

      drawRing(
        ctx,
        MEM_CENTER_X,
        MEM_CENTER_Y,
        30,
        12,
        90,
        180,
        true,
        used / total,
        RING_HUE,
        0.25,
        RING_HUE,
        0.65,
      );
    }

    if (ctxUp) {
      var maxUp = 1;
      for (var i = 0; i < upHistory.length; i++) maxUp = Math.max(maxUp, Math.abs(upHistory[i]));
      drawMiniBarChart(ctxUp, upHistory, maxUp, NET_BAR_COLOR);
    }

    if (ctxDn) {
      var maxDn = 1;
      for (var i = 0; i < downHistory.length; i++) maxDn = Math.max(maxDn, Math.abs(downHistory[i]));
      drawMiniBarChart(ctxDn, downHistory, maxDn, NET_BAR_COLOR);
    }
  }

  function poll() {
    var url = "/api/metrics?_=" + new Date().getTime();
    var req = new XMLHttpRequest();
    req.open("GET", url, true);
    req.timeout = 20000;
    req.onreadystatechange = function () {
      if (req.readyState !== 4) return;
      if (req.status >= 200 && req.status < 300) {
        try {
          var data = JSON.parse(req.responseText);
          renderMetrics(data);
        } catch (_e) {
          // ignore
        }
      } else {
        if (elMemData) elMemData.textContent = "offline";
      }
    };
    req.ontimeout = function () {
      if (elMemData) elMemData.textContent = "offline";
    };
    req.send();
  }

  poll();
  setInterval(poll, REFRESH_MS);
})();
