// components/LeaderboardTable.js

export default function LeaderboardTable({ data }) {
    if (!data || data.length === 0) {
      return <div style={{ padding: "20px" }}>No leaderboard data available.</div>;
    }
  
    return (
      <table style={tableStyle}>
        <thead>
          <tr style={headerRow}>
            <th style={th}>Rank</th>
            <th style={th}>Name</th>
            <th style={th}>Queries</th>
            <th style={th}>MCQs Received</th>
            <th style={th}>Correct</th>
            <th style={th}>Accuracy</th>
            <th style={th}>Streak</th>
          </tr>
        </thead>
  
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={rowStyle}>
              <td style={td}>{i + 1}</td>
              <td style={td}>{row.display_name}</td>
              <td style={td}>{row.total_queries}</td>
              <td style={td}>{row.total_mcqs_generated}</td>
              <td style={td}>{row.total_mcqs_correct}</td>
              <td style={td}>
                {(row.avg_accuracy * 100).toFixed(1)}%
              </td>
              <td style={td}>{row.streak_days}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  
  // ---------- Styling ----------
  
  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px",
    backgroundColor: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  };
  
  const headerRow = {
    backgroundColor: "#f5f5f5",
  };
  
  const th = {
    padding: "12px",
    textAlign: "left",
    fontWeight: "600",
    borderBottom: "2px solid #ddd",
  };
  
  const td = {
    padding: "12px",
    borderBottom: "1px solid #eee",
  };
  
  const rowStyle = {
    backgroundColor: "white",
  };
  