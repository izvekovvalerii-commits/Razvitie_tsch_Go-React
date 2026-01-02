import React, { useMemo } from 'react';
import './GanttChart.css';

export interface GanttTask {
    id: number;
    name: string;
    status: string;
    createdAt?: string | Date; // Start date
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
    // viewMode is now controlled from parent

    // 1. Calculate Timeline Range and Dates
    // Memoize the timeline computation
    const { ganttDates, timelineStart } = useMemo(() => {

        if (!tasks.length && !projectCreatedAt) return { ganttDates: [], totalUnits: 0 };

        const startDates = tasks.map(t => new Date(t.createdAt || Date.now())).filter(d => !isNaN(d.getTime()));
        if (projectCreatedAt) startDates.push(new Date(projectCreatedAt));

        let minDate = startDates.length ? new Date(Math.min(...startDates.map(d => d.getTime()))) : new Date();

        // Find max date (based on deadlines)
        const endDates = tasks.map(t => new Date(t.normativeDeadline || Date.now())).filter(d => !isNaN(d.getTime()));
        let maxDate = endDates.length ? new Date(Math.max(...endDates.map(d => d.getTime()))) : new Date();

        // Add minimal padding for better visibility
        // Start from the first day of the first task (no left padding)
        maxDate.setDate(maxDate.getDate() + 7); // Small buffer at end

        // Generate dates array based on view mode
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

    // Helper: Calculate difference in units (days/weeks/etc)
    const getDiffInUnits = (d1: Date, d2: Date) => {
        const diffTime = d2.getTime() - d1.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);

        switch (viewMode) {
            case 'day': return diffDays;
            case 'week': return diffDays / 7;
            case 'month': return diffDays / 30.44; // Approx
            case 'quarter': return diffDays / 91.25;
            default: return diffDays;
        }
    };

    // Helper: Position calculations
    const getTaskLayout = (task: GanttTask) => {
        if (!timelineStart || !task.normativeDeadline) return { unitsFromStart: 0, durationUnits: 0 };

        // Fallback for null createdAt: use project creation date or a reasonable default
        let taskStart: Date;
        if (task.createdAt) {
            taskStart = new Date(task.createdAt);
        } else if (projectCreatedAt) {
            taskStart = new Date(projectCreatedAt);
            console.warn(`⚠️ Task ${task.id} (${task.name}) has null createdAt, using project creation date`);
        } else {
            // Last resort: use timeline start
            taskStart = new Date(timelineStart);
            console.warn(`⚠️ Task ${task.id} (${task.name}) has null createdAt and no project date, using timeline start`);
        }

        // Use actualDate for completed tasks, normativeDeadline otherwise
        const endDate = task.status === 'Завершена' && task.actualDate
            ? new Date(task.actualDate)
            : new Date(task.normativeDeadline);

        if (taskStart < timelineStart) {
            // Clamping logic if needed
        }

        const unitsFromStart = Math.max(0, getDiffInUnits(timelineStart, taskStart));
        const durationUnits = Math.max(0.1, getDiffInUnits(taskStart, endDate)); // Min width

        // Convert to percentage
        // Total width is totalUnits. 1 unit = 1 column.
        // If we use fixed widths for columns (e.g. 40px), we can calculate pixels.
        // But the previous implementation used percentages. Let's stick to percentages for responsiveness?
        // Actually, infinite scroll usually works better with PX.
        // Let's deduce column width based on mode.

        return { unitsFromStart, durationUnits };
    };

    // Memoize column width calculation
    const COL_WIDTH = useMemo(() => {
        switch (viewMode) {
            case 'day': return 40;
            case 'week': return 60;
            case 'month': return 100;
            case 'quarter': return 120;
            default: return 40;
        }
    }, [viewMode]);

    const TOTAL_WIDTH_PX = useMemo(() =>
        ganttDates.length * COL_WIDTH,
        [ganttDates.length, COL_WIDTH]
    );

    // Memoize the calculated task positions to avoid recalc on render
    const taskPositions = useMemo(() => {
        return tasks.map(task => {
            const { unitsFromStart, durationUnits } = getTaskLayout(task);
            const leftPx = unitsFromStart * COL_WIDTH;
            const widthPx = durationUnits * COL_WIDTH;
            return { id: task.id, left: leftPx, width: widthPx, task };
        });
    }, [tasks, timelineStart, viewMode]);

    // Connections (Menhattan/Bezier style with arrows)
    const connections = useMemo(() => {
        const paths: { path: string; id: string }[] = [];
        const taskMap = new Map((tasks || []).map((t, i) => [t.code, { ...t, index: i }]));

        tasks.forEach((task, index) => {
            if (!task.dependsOn) return;
            task.dependsOn.forEach(depCode => {
                const depTask = taskMap.get(depCode);
                if (depTask) {
                    const depLayout = taskPositions.find(p => p.id === depTask.id);
                    const currentLayout = taskPositions.find(p => p.id === task.id);

                    if (depLayout && currentLayout) {
                        // Start point: Right side of dependency bar
                        const startX = depLayout.left + depLayout.width;
                        const startY = depTask.index * ROW_HEIGHT + (ROW_HEIGHT / 2);

                        // End point: Left side of current task bar
                        const endX = currentLayout.left;
                        const endY = index * ROW_HEIGHT + (ROW_HEIGHT / 2);

                        // Enhanced smooth S-curve path
                        const gap = 25;
                        const midX = (startX + endX) / 2;

                        // Control points for beautiful S-curve
                        const cp1x = startX + gap * 3;
                        const cp1y = startY;
                        const cp2x = endX - gap * 2;
                        const cp2y = endY;

                        // Cubic Bezier curve for smooth connection
                        const smoothPath = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

                        paths.push({ path: smoothPath, id: `${depTask.id}-${task.id}` });
                    }
                }
            });
        });
        return paths;
    }, [tasks, taskPositions]);

    // Helper: isToday
    const isToday = (d: Date) => {
        const today = new Date();
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    };

    // Helper: duration
    const getDuration = (t: GanttTask) => {
        if (!t.createdAt || !t.normativeDeadline) return 0;
        return Math.ceil((new Date(t.normativeDeadline).getTime() - new Date(t.createdAt).getTime()) / (1000 * 3600 * 24));
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
                                <div key={i} className={`dateHeader ${isToday(d) ? 'today' : ''}`} style={{ width: COL_WIDTH }}>
                                    {viewMode === 'day' && <>{d.getDate()}<br />{d.toLocaleString('default', { month: 'short' })}</>}
                                    {viewMode === 'week' && <>Н{Math.ceil(d.getDate() / 7)}<br />{d.getDate()}.{d.getMonth() + 1}</>}
                                    {viewMode === 'month' && <>{d.toLocaleString('default', { month: 'long' })}<br />{d.getFullYear()}</>}
                                    {viewMode === 'quarter' && <>Q{Math.ceil((d.getMonth() + 1) / 3)}<br />{d.getFullYear()}</>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Background Grid - Rendered ONCE */}
                    <div className="ganttGridBackground">
                        {ganttDates.map((d, i) => (
                            <div key={i} className={`gridColumn ${isToday(d) ? 'today' : ''}`} style={{ width: COL_WIDTH }}></div>
                        ))}
                    </div>

                    {/* Content Rows */}
                    {tasks.map((task) => {
                        const pos = taskPositions.find(p => p.id === task.id);
                        return (
                            <div key={task.id} className="ganttRow">
                                <div className="ganttRowSidebar" title={task.name}>{task.name}</div>
                                <div className="ganttRowContent">
                                    {/* Bar */}
                                    {pos && (
                                        <div
                                            className={`ganttBar ${getStatusClass(task.status)}`}
                                            style={{ left: pos.left, width: pos.width }}
                                            onClick={() => onTaskClick?.(task)}
                                            title={`${task.name}: ${task.status}`}
                                        >
                                            {getDuration(task)} дн.
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Connections Overlay - Smooth thin lines without arrows */}
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
        </div>
    );
};
