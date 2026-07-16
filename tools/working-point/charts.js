'use strict';
/* ══════════════════════════════════════════════════════════
   Working Point Explorer — charts.js
   Chart.js 建圖、plugins、applyChartTheme。
   ══════════════════════════════════════════════════════════
   Dataset 索引（固定，主圖）：
     0  邊界曲線（藍色實線）
     1  負載拋物線（橘色虛線）
     2  工作點水平輔助線
     3  工作點垂直輔助線
     4  工作點圓點（紅色）
     5+ Query 點（每個 Query 佔 3 個：H線、V線、菱形點）
   ══════════════════════════════════════════════════════════ */
const ctx = document.getElementById('chart').getContext('2d');

let fixedSpeedN = 15000; // 目前目標轉速
let fixedSpeedOperable = true; // 是否在可工作區域內（供 plugin 讀色）

/** 填充邊界曲線下方（可工作區域） */
const fillPlugin = {
  id: 'fillBelow',
  beforeDatasetsDraw(chart) {
    const ds   = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);
    if (!ds.data.length || !meta.data.length) return;
    const { ctx: c, chartArea: { top, bottom, left, right } } = chart;
    c.save();
    // 裁切到圖表範圍，避免填充超出邊框
    c.beginPath();
    c.rect(left, top, right - left, bottom - top);
    c.clip();
    // 沿邊界曲線 → 底部 → 封閉路徑
    c.beginPath();
    meta.data.forEach((pt, i) => i === 0 ? c.moveTo(pt.x, pt.y) : c.lineTo(pt.x, pt.y));
    c.lineTo(meta.data[meta.data.length - 1].x, bottom);
    c.lineTo(meta.data[0].x, bottom);
    c.closePath();
    c.fillStyle = fillPlugin._dark ? 'rgba(77,143,255,0.10)' : 'rgba(219,234,254,0.35)';
    c.fill();
    c.restore();
  }
};

/** 主圖 datasets 初始定義 */
const chartData = {
  datasets: [
    // 0：邊界曲線（藍色實線）
    {
      label: 'Boundary  V_sum = V_rated',
      data: [], borderColor: '#1d4ed8',
      borderWidth: 2.5, pointRadius: 0, fill: false, tension: 0.3, order: 3,
    },
    // 1：負載拋物線（橘色虛線）T_A = T_A_ref × (N/N_ref)²
    {
      label: 'Load curve  T_A_ref×(N/N_ref)²',
      data: [], borderColor: '#f59e0b',
      borderWidth: 2, borderDash: [6, 3],
      pointRadius: 0, fill: false, tension: 0.3, order: 3,
    },
    // 2：工作點水平輔助線（紅色點線）
    {
      label: '_wpH',
      data: [], borderColor: 'rgba(220,38,38,0.6)',
      borderWidth: 1.2, borderDash: [5, 4], pointRadius: 0, fill: false, order: 4,
    },
    // 3：工作點垂直輔助線（紅色點線）
    {
      label: '_wpV',
      data: [], borderColor: 'rgba(220,38,38,0.6)',
      borderWidth: 1.2, borderDash: [5, 4], pointRadius: 0, fill: false, order: 4,
    },
    // 4：工作點圓點（紅色）
    {
      label: 'Working point',
      data: [], borderColor: '#fff', backgroundColor: '#ef4444',
      borderWidth: 2, pointRadius: 8, pointHoverRadius: 10,
      fill: false, order: 6,
    },
    // 5+：Query 點 datasets（動態新增，每個 Query 佔 3 個）
  ]
};

const fixedSpeedLinePlugin = {
  id: 'fixedSpeedLine',
  afterDraw(chart) {
    const box = document.getElementById('fixedSpeedBox');
    if (box && box.classList.contains('collapsed')) return;
    const xScale = chart.scales.x;
    const { ctx, chartArea: { top, bottom, left, right } } = chart;
    const xPx = xScale.getPixelForValue(fixedSpeedN);
    if (xPx < left || xPx > right) return;

    const lineColor = fixedSpeedOperable ? '#10b981' : '#ef4444';

    ctx.save();
    // 虛線
    ctx.beginPath();
    ctx.moveTo(xPx, top);
    ctx.lineTo(xPx, bottom);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([6, 3]);
    ctx.globalAlpha = 0.85;
    ctx.stroke();
    // 頂部文字標籤（無背景框）
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    ctx.fillStyle = lineColor;
    ctx.font = '10px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(fixedSpeedN.toFixed(0) + ' RPM', xPx, top + 11);
    ctx.restore();
  }
};

/** 建立主圖 Chart 實例 */
const myChart = new Chart(ctx, {
  type: 'line',
  data: chartData,
  plugins: [fillPlugin, fixedSpeedLinePlugin],
  options: {
    animation: false,             // 關閉動畫，滑動滑桿時即時更新
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true, position: 'top', align: 'end',
        labels: {
          filter: item => !item.text.startsWith('_'), // 隱藏輔助線圖例（底線開頭）
          font: { size: 10 }, boxWidth: 20, padding: 10, usePointStyle: true,
        }
      },
      tooltip: { enabled: false }, // 關閉 hover tooltip
    },
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: 'Speed N (RPM)', font: { size: 11 } },
        min: 0, max: 80000,
        grid: { color: '#e5e7eb' }, ticks: { font: { size: 9 } },
      },
      y: {
        type: 'linear',
        title: { display: true, text: 'T_A  (μN·m)', font: { size: 11 } },
        min: 0,
        grid: { color: '#e5e7eb' }, ticks: { font: { size: 9 } },
      }
    }
  }
});

/** 初始化 Sweep 圖（第二張） */
const sweepCtx   = document.getElementById('sweepChart').getContext('2d');
const sweepChart = new Chart(sweepCtx, {
  type: 'line',
  data: { datasets: [] },
  plugins: [],
  options: {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true, position: 'top', align: 'end',
        labels: { font: { size: 10 }, boxWidth: 20, padding: 8, usePointStyle: true,
                  filter: item => !item.text.startsWith('_') },
      },
      tooltip: { enabled: false },
    },
    scales: {
      x: { type: 'linear', title: { display: true, text: '', font: { size: 11 } },
           grid: { color: '#e5e7eb' }, ticks: { font: { size: 9 } } },
      y: { type: 'linear', title: { display: true, text: '', font: { size: 11 } },
           grid: { color: '#e5e7eb' }, ticks: { font: { size: 9 } } }
    }
  }
});

/** 套用圖表主題（格線、刻度、圖例文字顏色） */
function applyChartTheme(isDark) {
  const grid = isDark ? '#2d3148' : '#e5e7eb';
  const text = isDark ? '#8896b0' : '#374151';
  [myChart, sweepChart].forEach(function(ch) {
    ch.options.scales.x.grid.color         = grid;
    ch.options.scales.y.grid.color         = grid;
    ch.options.scales.x.ticks.color        = text;
    ch.options.scales.y.ticks.color        = text;
    ch.options.scales.x.title.color        = text;
    ch.options.scales.y.title.color        = text;
    ch.options.plugins.legend.labels.color = text;
    ch.update('none');
  });
  fillPlugin._dark = isDark; // 更新填充色
  myChart.update('none');
}
