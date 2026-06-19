import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Transaction, CurrencyConfig } from '../types';

interface PerformanceChartProps {
  transactions: Transaction[];
  currency: CurrencyConfig;
}

interface ChartPoint {
  date: string;
  cumulativeValue: number;
  label: string;
}

export default function PerformanceChart({ transactions, currency }: PerformanceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 260 });
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const [hoverY, setHoverY] = useState<number>(0);

  // Measure container sizing dynamically to make the chart fully responsive
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 280),
          height: 260
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Compute daily cumulative profit/loss trend
  const chartData = useMemo(() => {
    // Standard sorting older first
    const sorted = [...transactions]
      .filter((t) => t.type === 'profit' || t.type === 'loss')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (sorted.length === 0) return [];

    let currentSum = 0;
    const dataPoints: ChartPoint[] = [];

    // Add an initial baseline point
    const firstDate = new Date(sorted[0].date);
    firstDate.setDate(firstDate.getDate() - 1);
    const baselineDateString = firstDate.toISOString().split('T')[0];
    
    dataPoints.push({
      date: baselineDateString,
      cumulativeValue: 0,
      label: 'Start'
    });

    sorted.forEach((t) => {
      const change = t.type === 'profit' ? t.amount : -t.amount;
      currentSum += change;
      
      // If same date already exists, update it, otherwise create new
      const existing = dataPoints.find(dp => dp.date === t.date);
      if (existing) {
        existing.cumulativeValue = currentSum;
      } else {
        dataPoints.push({
          date: t.date,
          cumulativeValue: currentSum,
          label: new Date(t.date).toLocaleDateString(currency.locale, { month: 'short', day: 'numeric' })
        });
      }
    });

    return dataPoints;
  }, [transactions, currency]);

  // SVG parameters
  const padding = { top: 30, right: 20, bottom: 40, left: 60 };
  const chartWidth = dimensions.width - padding.left - padding.right;
  const chartHeight = dimensions.height - padding.top - padding.bottom;

  const { pathData, areaData, points, yGridLines, yLabels } = useMemo(() => {
    if (chartData.length === 0) {
      return { pathData: '', areaData: '', points: [], yGridLines: [], yLabels: [] };
    }

    const values = chartData.map(d => d.cumulativeValue);
    const maxVal = Math.max(...values, 1000);
    const minVal = Math.min(...values, -1000);
    
    // Pad limits slightly
    const range = maxVal - minVal;
    const absMax = Math.max(Math.abs(maxVal), Math.abs(minVal));
    const yMax = absMax * 1.15;
    const yMin = -absMax * 1.15;

    const getX = (index: number) => {
      if (chartData.length <= 1) return padding.left;
      return padding.left + (index / (chartData.length - 1)) * chartWidth;
    };

    const getY = (value: number) => {
      const scale = chartHeight / (yMax - yMin);
      // yMax is at top (0 of canvas inside padding), yMin at bottom (height of chart)
      return padding.top + chartHeight - (value - yMin) * scale;
    };

    const calculatedPoints = chartData.map((d, i) => ({
      x: getX(i),
      y: getY(d.cumulativeValue),
      data: d
    }));

    // Build SVG Path
    let path = '';
    let area = '';
    
    if (calculatedPoints.length > 0) {
      path = `M ${calculatedPoints[0].x} ${calculatedPoints[0].y}`;
      for (let i = 1; i < calculatedPoints.length; i++) {
        path += ` L ${calculatedPoints[i].x} ${calculatedPoints[i].y}`;
      }

      // Create closed area for gradient fill
      const zeroY = getY(0);
      area = `${path} L ${calculatedPoints[calculatedPoints.length - 1].x} ${zeroY} L ${calculatedPoints[0].x} ${zeroY} Z`;
    }

    // Grid lines
    const gridCount = 5;
    const lines = [];
    const labels = [];
    for (let i = 0; i < gridCount; i++) {
      const val = yMin + (i * (yMax - yMin)) / (gridCount - 1);
      lines.push(getY(val));
      labels.push(val);
    }

    return {
      pathData: path,
      areaData: area,
      points: calculatedPoints,
      yGridLines: lines,
      yLabels: labels
    };
  }, [chartData, chartWidth, chartHeight, padding.left, padding.right, padding.top, padding.bottom]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (points.length === 0) return;
    
    const svgRect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - svgRect.left;
    
    // Find closest point by X coordinate
    let closestIndex = 0;
    let minDistance = Infinity;
    
    points.forEach((pt, idx) => {
      const distance = Math.abs(pt.x - clientX);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = idx;
      }
    });

    const targetPoint = points[closestIndex];
    if (targetPoint) {
      setHoveredPoint(targetPoint.data);
      setHoverX(targetPoint.x);
      setHoverY(targetPoint.y);
    }
  };

  const formattedValue = (val: number) => {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toLocaleString(currency.locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div id="chart-container-wrapper" className="bg-surface-container border border-outline-variant rounded-xl p-6 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h3 className="font-headline-md text-xl font-bold text-on-surface">Cumulative Trend Value</h3>
          <p className="text-sm text-on-surface-variant font-medium">Visual representation of net trading yields</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-primary">
            <span className="w-3 h-3 rounded-full bg-primary/20 border border-primary"></span>
            Gains Focus
          </div>
          <div className="flex items-center gap-1.5 text-secondary">
            <span className="w-3 h-3 rounded-full bg-secondary/20 border border-secondary"></span>
            Drawdowns
          </div>
        </div>
      </div>

      <div ref={containerRef} className="w-full relative h-[260px] cursor-crosshair select-none" id="svg-chart-container">
        {transactions.filter(t => t.type === 'profit' || t.type === 'loss').length < 2 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-on-surface-variant/60 gap-2">
            <span className="material-symbols-outlined text-4xl">show_chart</span>
            <p className="text-sm font-medium">Add at least two profit/loss entries to plot performance trend lines</p>
          </div>
        ) : (
          <svg
            width={dimensions.width}
            height={dimensions.height}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredPoint(null)}
            className="overflow-visible"
          >
            <defs>
              <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4be277" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#4be277" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="chart-area-grad-neg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffb3ad" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#ffb3ad" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {yGridLines.map((y, idx) => (
              <g key={`grid-${idx}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={dimensions.width - padding.right}
                  y2={y}
                  stroke="#3d4a3d"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.3"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  fill="#bccbb9"
                  fontSize="12"
                  textAnchor="end"
                  fontFamily="monospace"
                  opacity="0.8"
                >
                  {formattedValue(yLabels[idx])}
                </text>
              </g>
            ))}

            {/* Zero Baseline */}
            {points.length > 0 && (
              <line
                x1={padding.left}
                y1={yGridLines[Math.floor(yGridLines.length / 2)] || (padding.top + chartHeight / 2)}
                x2={dimensions.width - padding.right}
                y2={yGridLines[Math.floor(yGridLines.length / 2)] || (padding.top + chartHeight / 2)}
                stroke="#869585"
                strokeWidth="1.5"
                opacity="0.4"
              />
            )}

            {/* Area Path */}
            {areaData && (
              <path
                d={areaData}
                fill="url(#chart-area-grad)"
                opacity="0.7"
              />
            )}

            {/* Trend Stroke Path */}
            {pathData && (
              <path
                d={pathData}
                fill="none"
                stroke={chartData[chartData.length - 1]?.cumulativeValue >= 0 ? '#4be277' : '#ffb3ad'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data point dots */}
            {points.map((pt, idx) => (
              <circle
                key={`dot-${idx}`}
                cx={pt.x}
                cy={pt.y}
                r={hoveredPoint?.date === pt.data.date ? '6' : '3'}
                fill={pt.data.cumulativeValue >= 0 ? '#4be277' : '#ffb3ad'}
                stroke="#0b1326"
                strokeWidth={hoveredPoint?.date === pt.data.date ? '2' : '1'}
                className="transition-all duration-150"
              />
            ))}

            {/* Hover vertical slider bar */}
            {hoveredPoint && (
              <g>
                <line
                  x1={hoverX}
                  y1={padding.top}
                  x2={hoverX}
                  y2={dimensions.height - padding.bottom}
                  stroke="#869585"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
              </g>
            )}

            {/* X-axis labels (render first and last, and some intermediate to avoid clashing) */}
            {points.length > 0 && (
              <g>
                <text
                  x={points[0].x}
                  y={dimensions.height - padding.bottom + 18}
                  fill="#bccbb9"
                  fontSize="11"
                  textAnchor="start"
                >
                  {points[0].data.label}
                </text>
                {points.length > 2 && (
                  <text
                    x={points[Math.floor(points.length / 2)].x}
                    y={dimensions.height - padding.bottom + 18}
                    fill="#bccbb9"
                    fontSize="11"
                    textAnchor="middle"
                  >
                    {points[Math.floor(points.length / 2)].data.label}
                  </text>
                )}
                <text
                  x={points[points.length - 1].x}
                  y={dimensions.height - padding.bottom + 18}
                  fill="#bccbb9"
                  fontSize="11"
                  textAnchor="end"
                >
                  {points[points.length - 1].data.label}
                </text>
              </g>
            )}
          </svg>
        )}

        {/* Hover info tooltip box */}
        {hoveredPoint && (
          <div
            className="absolute bg-surface-container-highest border border-outline-variant p-2.5 rounded-lg shadow-xl text-xs flex flex-col gap-1 pointer-events-none z-10 transition-transform duration-75"
            style={{
              left: `${Math.min(hoverX + 15, dimensions.width - 160)}px`,
              top: `${Math.min(hoverY - 45, dimensions.height - 80)}px`,
            }}
          >
            <span className="font-bold text-on-surface">{new Date(hoveredPoint.date).toLocaleDateString(currency.locale, { weekday: 'short', month: 'long', day: 'numeric' })}</span>
            <span className={`font-mono text-lg font-bold ${hoveredPoint.cumulativeValue >= 0 ? 'text-primary' : 'text-secondary'}`}>
              {formattedValue(hoveredPoint.cumulativeValue)} {currency.symbol}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
