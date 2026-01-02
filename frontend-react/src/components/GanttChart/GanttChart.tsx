import React, { useMemo, useState } from 'react';
import './GanttChart.css';

export interface GanttTask {
    id: number;
    name: string;
    status: string;
    createdAt?: string | Date; // Creation timestamp
    plannedStartDate?: string | Date; // Planned start date (for Gantt display)
    normativeDeadline?: string | Date; // Calculated end date
    actualDate?: string | Date; // Completion date
    code?: string;
    days?: number; // Duration
    dependsOn?: string[]; // Codes of dependencies
    stage?: string;
    responsible?: string;
}

export type ViewMode = 'day' | 'week' | 'month' | 'quarter';

interface GanttChartProps {
    tasks: GanttTask[];
    projectCreatedAt?: string | Date;
    viewMode: ViewMode;
    onTaskClick?: (task: GanttTask) => void;
}

const ROW_HEIGHT = 48;

export const GanttChart: React.FC<GanttChartProps> = ({
    tasks,
    projectCreatedAt,
    viewMode,
    onTaskClick
}) => {
    const [tooltip, setTooltip] = useState<{ task: GanttTask, x: number, y: number } | null>(null);

    // 1. Calculate Timeline Range and Dates
    const { ganttDates, timelineStart } = useMemo(() => {
        if (!tasks.length && !projectCreatedAt) return { ganttDates: [], totalUnits: 0 };

        const startDates = tasks.map(t => new Date(t.createdAt || Date.now())).filter(d => !isNaN(d.getTime()));
        if (projectCreatedAt) startDates.push(new Date(projectCreatedAt));

        let minDate = startDates.length ? new Date(Math.min(...startDates.map(d => d.getTime()))) : new Date();

        const endDates = tasks.map(t => new Date(t.normativeDeadline || Date.now())).filter(d => !isNaN(d.getTime()));
        let maxDate = endDates.length ? new Date(Math.max(...endDates.map(d => d.getTime()))) : new Date();

        maxDate.setDate(maxDate.getDate() + 14); // Buffer

        const dates: Date[] = [];
        const current = new Date(minDate);
        current.setHours(0, 0, 0, 0);

        const end = new Date(maxDate);

        while (current <= end) {
            dates.push(new Date(current));
            if (viewMode === 'day') current.setDate(current.getDate() + 1);
            else if (viewMode === 'week') current.setDate(current.getDate() + 7);
            else if (viewMode === 'month') current.setMonth(current.getMonth() + 1);
            else if (viewMode === 'quarter') current.setMonth(current.getMonth() + 3);
        }

        return {
            ganttDates: dates,
            timelineStart: dates[0],
            timelineEnd: dates[dates.length - 1],
            totalUnits: dates.length
        };
    }, [tasks, projectCreatedAt, viewMode]);

    // Helper: isWeekend
    const isWeekend = (d: Date) => {
        const day = d.getDay();
        return day === 0 || day === 6;
    };

    // Helper: isToday
    const isToday = (d: Date) => {
        const today = new Date();
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    };

    // Helper: Calculate difference
    const getDiffInUnits = (d1: Date, d2: Date) => {
        const diffTime = d2.getTime() - d1.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);

        switch (viewMode) {
            case 'day': return diffDays;
            case 'week': return diffDays / 7;
            case 'month': return diffDays / 30.44;
            case 'quarter': return diffDays / 91.25;
            default: return diffDays;
        }
    };

    // Helper: Layout
    const getTaskLayout = (task: GanttTask) => {
        if (!timelineStart || !task.normativeDeadline) return { unitsFromStart: 0, durationUnits: 0 };

        let taskStart: Date;
        if (task.plannedStartDate) {
            taskStart = new Date(task.plannedStartDate);
        } else if (task.createdAt) {
            taskStart = new Date(task.createdAt);
        } else if (projectCreatedAt) {
            taskStart = new Date(projectCreatedAt);
        } else {
            taskStart = new Date(timelineStart);
        }

        const endDate = task.status === 'Завершена' && task.actualDate
            ? new Date(task.actualDate)
            : new Date(task.normativeDeadline);

        const unitsFromStart = Math.max(0, getDiffInUnits(timelineStart, taskStart));
        const durationUnits = Math.max(0.1, getDiffInUnits(taskStart, endDate));

        return { unitsFromStart, durationUnits };
    };

    const COL_WIDTH = useMemo(() => {
        switch (viewMode) {
            case 'day': return 40;
            case 'week': return 60;
            case 'month': return 100;
            case 'quarter': return 120;
            default: return 40;
        }
    }, [viewMode]);

    const TOTAL_WIDTH_PX = useMemo(() => ganttDates.length * COL_WIDTH, [ganttDates.length, COL_WIDTH]);

    // Pre-calculate map for tooltips and connections
    const taskMap = useMemo(() => new Map((tasks || []).map(t => [t.code, t])), [tasks]);

    const taskPositions = useMemo(() => {
        return tasks.map((task, index) => {
            const { unitsFromStart, durationUnits } = getTaskLayout(task);
            return {
                id: task.id,
                left: unitsFromStart * COL_WIDTH,
                width: durationUnits * COL_WIDTH,
                task,
                index
            };
        });
    }, [tasks, timelineStart, viewMode]);

    const connections = useMemo(() => {
        const paths: { path: string; id: string }[] = [];

        taskPositions.forEach(target => {
            if (!target.task.dependsOn) return;

            target.task.dependsOn.forEach(depCode => {
                const depTask = taskMap.get(depCode); // Find task data
                if (!depTask) return;

                // Find position of dependency
                const source = taskPositions.find(p => p.id === depTask.id);

                if (source) {
                    const startX = source.left + source.width;
                    const startY = source.index * ROW_HEIGHT + (ROW_HEIGHT / 2);
                    const endX = target.left;
                    const endY = target.index * ROW_HEIGHT + (ROW_HEIGHT / 2);

                    const gap = 20;
                    const cp1x = startX + gap;
                    const cp1y = startY;
                    const cp2x = endX - gap;
                    const cp2y = endY;

                    const smoothPath = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
                    paths.push({ path: smoothPath, id: `${source.id}-${target.id}` });
                }
            });
        });
        return paths;
    }, [taskPositions, taskMap]);

    const getDuration = (t: GanttTask) => {
        const start = t.plannedStartDate ? new Date(t.plannedStartDate) : (t.createdAt ? new Date(t.createdAt) : null);
        if (!start || !t.normativeDeadline) return 0;
        return Math.ceil((new Date(t.normativeDeadline).getTime() - start.getTime()) / (1000 * 3600 * 24));
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Ожидание': return 'bar-pending';
            case 'Назначена': return 'bar-assigned';
            case 'В работе': return 'bar-in-progress';
            case 'Завершена': return 'bar-completed';
            default: return 'bar-planned';
        }
    };

    const getDeviation = (t: GanttTask) => {
        if (!t.normativeDeadline) return null;

        const deadline = new Date(t.normativeDeadline);
        let end = new Date(); // Default to now for active tasks

        // If completed, use actual date
        if (t.status === 'Завершена' && t.actualDate) {
            end = new Date(t.actualDate);
        } else if (t.status !== 'Завершена') {
            // For active tasks, only show if overdue
            if (end <= deadline) return null;
        } else {
            return null;
        }

        // Calculate diff
        const diffTime = end.getTime() - deadline.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

        return diffDays;
    };

    const getInitials = (name?: string) => {
        if (!name) return '';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
    };

    const formatDate = (d?: string | Date) => {
        if (!d) return 'N/A';
        return new Date(d).toLocaleDateString('ru-RU');
    };

    const handleMouseEnter = (e: React.MouseEvent, task: GanttTask) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // Adjust X if too close to right edge
        let x = rect.right + 10;
        if (x + 250 > window.innerWidth) {
            x = rect.left - 260; // Show on left
        }

        setTooltip({
            task,
            x: x,
            y: rect.top
        });
    };

    if (!tasks || tasks.length === 0) {
        return <div className="no-data">Нет задач для отображения</div>;
    }

    return (
        <div className="ganttContainer">
            <div className="ganttScrollArea">
                <div className="ganttLayout" style={{ width: Math.max(1000, 280 + TOTAL_WIDTH_PX) }}>

                    {/* Header */}
                    <div className="ganttHeader">
                        <div className="ganttHeaderSidebar">Задача</div>
                        <div className="ganttHeaderTimeline">
                            {ganttDates.map((d, i) => (
                                <div
                                    key={i}
                                    className={`dateHeader ${isToday(d) ? 'today' : ''} ${isWeekend(d) ? 'weekend' : ''}`}
                                    style={{ width: COL_WIDTH }}
                                >
                                    {viewMode === 'day' && <>{d.getDate()}<br />{d.toLocaleString('default', { month: 'short' })}</>}
                                    {viewMode === 'week' && <>Н{Math.ceil(d.getDate() / 7)}<br />{d.getDate()}.{d.getMonth() + 1}</>}
                                    {viewMode === 'month' && <>{d.toLocaleString('default', { month: 'long' })}<br />{d.getFullYear()}</>}
                                    {viewMode === 'quarter' && <>Q{Math.ceil((d.getMonth() + 1) / 3)}<br />{d.getFullYear()}</>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="ganttGridBackground">
                        {ganttDates.map((d, i) => (
                            <div
                                key={i}
                                className={`gridColumn ${isToday(d) ? 'today' : ''} ${isWeekend(d) ? 'weekend' : ''}`}
                                style={{ width: COL_WIDTH }}
                            ></div>
                        ))}
                    </div>

                    {/* Rows */}
                    {tasks.map((task) => {
                        const pos = taskPositions.find(p => p.id === task.id);
                        return (
                            <div key={task.id} className="ganttRow">
                                <div className="ganttRowSidebar" title={task.name}>{task.name}</div>
                                <div className="ganttRowContent">
                                    {pos && (
                                        <>
                                            <div
                                                className={`ganttBar ${getStatusClass(task.status)}`}
                                                style={{ left: pos.left, width: pos.width }}
                                                onClick={() => onTaskClick?.(task)}
                                                onMouseEnter={(e) => handleMouseEnter(e, task)}
                                                onMouseLeave={() => setTooltip(null)}
                                            >
                                                {getDuration(task)}
                                            </div>
                                            {task.responsible && (
                                                <div
                                                    className="gantt-avatar"
                                                    style={{ left: pos.left + pos.width + 12 }}
                                                    title={task.responsible}
                                                >
                                                    {getInitials(task.responsible)}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Connections */}
                    <svg className="connectionsOverlay">
                        {connections.map((conn, i) => (
                            <path
                                key={conn.id || i}
                                d={conn.path}
                                fill="none"
                                stroke="#94a3b8"
                                strokeWidth="2"
                                opacity="0.6"
                            />
                        ))}
                    </svg>

                </div>
            </div>

            {/* Rich Tooltip Portal/Overlay */}
            {tooltip && (
                <div className="gantt-tooltip" style={{ top: tooltip.y, left: tooltip.x }}>
                    <div className="tooltip-header">
                        <span>{tooltip.task.name}</span>
                        <span className="tooltip-status">{tooltip.task.status}</span>
                    </div>
                    <div className="tooltip-body">
                        <div className="tooltip-row">
                            <span className="tooltip-label">Старт:</span>
                            <span className="tooltip-value">{formatDate(tooltip.task.plannedStartDate || tooltip.task.createdAt)}</span>
                        </div>
                        <div className="tooltip-row">
                            <span className="tooltip-label">Финиш:</span>
                            <span className="tooltip-value">{formatDate(tooltip.task.actualDate || tooltip.task.normativeDeadline)}</span>
                        </div>
                        <div className="tooltip-row">
                            <span className="tooltip-label">Длительность:</span>
                            <span className="tooltip-value">{getDuration(tooltip.task)} дн.</span>
                        </div>

                        {(() => {
                            const dev = getDeviation(tooltip.task);
                            if (dev !== null && dev !== 0) {
                                const isLate = dev > 0;
                                return (
                                    <div className="tooltip-row">
                                        <span className="tooltip-label">Отклонение:</span>
                                        <span className="tooltip-value" style={{ color: isLate ? '#ef4444' : '#22c55e' }}>
                                            {isLate ? `+${dev} дн.` : `${dev} дн.`}
                                        </span>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {tooltip.task.responsible && (
                            <div className="tooltip-row">
                                <span className="tooltip-label">Ответственный:</span>
                                <span className="tooltip-value">{tooltip.task.responsible}</span>
                            </div>
                        )}

                        {tooltip.task.dependsOn && tooltip.task.dependsOn.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                                <span className="tooltip-label" style={{ display: 'block', marginBottom: 4 }}>Зависит от:</span>
                                {tooltip.task.dependsOn.map(code => {
                                    const dep = taskMap.get(code);
                                    return (
                                        <div key={code} style={{ fontSize: 10, color: '#64748b', marginLeft: 4 }}>
                                            • {dep ? dep.name : code}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
