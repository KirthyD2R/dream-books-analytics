import { getDashboardData } from "@/db/analytics";
import { StatCard } from "@/components/StatCard";
import { EntriesTrend, SignupsTrend, MoodPie } from "@/components/Charts";

// Always read fresh numbers; analytics shouldn't be statically cached.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { totals, daily, active, topCreators, moods } = await getDashboardData();

  return (
    <main className="page">
      <header className="header">
        <div>
          <h1>Dream Books · Analytics</h1>
          <div className="sub">Data volume &amp; user activity · last 30 days</div>
        </div>
        <div className="sub">Updated {new Date().toLocaleString()}</div>
      </header>

      {/* Data volume KPIs */}
      <section className="grid cards">
        <StatCard
          label="Total users"
          value={totals.totalUsers}
          delta={`+${totals.newUsers30d} in 30d`}
        />
        <StatCard label="Dream books" value={totals.totalBooks} />
        <StatCard
          label="Dream entries"
          value={totals.totalEntries}
          delta={`+${totals.newEntries30d} in 30d`}
        />
        <StatCard label="Words written" value={totals.totalWords} />
        <StatCard label="Entries / user" value={totals.avgEntriesPerUser} />
        <StatCard label="Entries / book" value={totals.avgEntriesPerBook} />
      </section>

      {/* Active-user KPIs */}
      <section className="grid cards">
        <StatCard label="Daily active (DAU)" value={active.dau} />
        <StatCard label="Weekly active (WAU)" value={active.wau} />
        <StatCard label="Monthly active (MAU)" value={active.mau} />
        <StatCard label="Stickiness (DAU/MAU)" value={`${active.stickiness}%`} />
      </section>

      {/* Time series */}
      <section className="grid charts" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3 className="panel-title">
            Entries created<span className="hint">daily, last 30 days</span>
          </h3>
          <EntriesTrend data={daily} />
        </div>
        <div className="card">
          <h3 className="panel-title">
            Mood mix<span className="hint">all entries</span>
          </h3>
          {moods.length ? <MoodPie data={moods} /> : <Empty />}
        </div>
      </section>

      <section className="grid row-2">
        <div className="card">
          <h3 className="panel-title">
            New signups<span className="hint">daily, last 30 days</span>
          </h3>
          <SignupsTrend data={daily} />
        </div>
        <div className="card">
          <h3 className="panel-title">
            Top creators<span className="hint">by entries written</span>
          </h3>
          {topCreators.length ? (
            <ul className="list">
              {topCreators.map((u) => (
                <li key={u.userId}>
                  <span>{u.name}</span>
                  <span className="muted">{u.entries.toLocaleString()} entries</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </div>
      </section>
    </main>
  );
}

function Empty() {
  return <div className="empty">No data yet — run the seed or connect your database.</div>;
}
