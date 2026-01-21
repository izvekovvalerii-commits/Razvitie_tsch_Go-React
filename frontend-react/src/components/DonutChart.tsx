import React, { useState } from 'react';

interface Segment {
    name: string;
    value: number;
    color: string;
}

interface DonutChartProps {
    data: Segment[];
    total: number;
    size?: number;
    strokeWidth?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
    data,
    total,
    size = 120,
    strokeWidth = 12
}) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const center = size / 2;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    let accumulatedOffset = 0; // Start from top (-90deg) handled by transform

    // Correctly handle empty data
    if (total === 0) {
        return (
            <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={size} height={size}>
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth={strokeWidth}
                    />
                </svg>
                <div style={{ position: 'absolute', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#94a3b8' }}>0</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Проектов</div>
                </div>
            </div>
        )
    }

    return (
        <div style={{ width: size, height: size, position: 'relative' }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Track */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth={strokeWidth}
                />

                {data.filter(d => d.value > 0).map((segment) => {
                    const originalIndex = data.indexOf(segment);
                    const percentage = segment.value / total;
                    const dashArray = percentage * circumference;
                    // Improved Gap logic for butt style
                    const gap = 2;
                    const visualDashArray = Math.max(0, dashArray - gap);

                    const offset = accumulatedOffset;
                    accumulatedOffset += dashArray;

                    const isHovered = hoveredIndex === originalIndex;

                    return (
                        <circle
                            key={segment.name}
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="none"
                            stroke={segment.color}
                            strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                            strokeDasharray={`${visualDashArray} ${circumference - visualDashArray}`}
                            strokeDashoffset={-offset}
                            strokeLinecap="butt"
                            style={{
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'pointer',
                                opacity: hoveredIndex !== null && hoveredIndex !== originalIndex ? 0.3 : 1
                            }}
                            onMouseEnter={() => setHoveredIndex(originalIndex)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        />
                    );
                })}
            </svg>

            {/* Center Content */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
            }}>
                {hoveredIndex !== null ? (
                    <>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: data[hoveredIndex].color, lineHeight: 1 }}>
                            {data[hoveredIndex].value}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
                            {data[hoveredIndex].name}
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                            {total}
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                            Проектов
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
