"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { DailyPoint, MoodSlice } from "@/db/analytics";

const AXIS = "#94a0bd";
const GRID = "#28324f";

const tooltipStyle = {
  background: "#1b2340",
  border: "1px solid #28324f",
  borderRadius: 8,
  color: "#e8ecf6",
};

function shortDate(d: string) {
  // "2026-06-17" -> "Jun 17"
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Daily entries created — the data-volume time series. */
export function EntriesTrend({ data }: { data: DailyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="entriesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c8cff" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#7c8cff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={shortDate} stroke={AXIS} fontSize={12} minTickGap={24} />
        <YAxis stroke={AXIS} fontSize={12} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={shortDate} />
        <Area
          type="monotone"
          dataKey="entries"
          name="Entries created"
          stroke="#7c8cff"
          strokeWidth={2}
          fill="url(#entriesFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Daily signups — the user-growth time series. */
export function SignupsTrend({ data }: { data: DailyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={shortDate} stroke={AXIS} fontSize={12} minTickGap={24} />
        <YAxis stroke={AXIS} fontSize={12} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={shortDate} />
        <Legend />
        <Line
          type="monotone"
          dataKey="signups"
          name="New signups"
          stroke="#36d6c3"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

const MOOD_COLORS = ["#7c8cff", "#36d6c3", "#f7b955", "#f76e6e", "#a78bfa", "#4ade80", "#94a0bd"];

/** Distribution of entries by mood. */
export function MoodPie({ data }: { data: MoodSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="mood"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={MOOD_COLORS[i % MOOD_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
