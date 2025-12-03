// pages/leaderboard.js
import { useEffect, useState } from "react";
import { apiGet } from "../utils/api";

export default function Leaderboard() {
  const [data, setData] = useState([]);

  useEffect(() => {
    apiGet("leaderboard")
      .then((json) => setData(json))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div style={{ padding: "40px" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "20px" }}>
        📊 Community Leaderboard
      </h1>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th style={th}>Rank</th>
            <th style={th}>Name</th>
            <th style={th}>Queries</th>
            <th style={th}>MCQs</th>
            <th style={th}>Correct</th>
            <th style={th}>Accuracy</th>
            <th style={th}>Streak</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={tr}>
              <td style={td}>{i + 1}</td>
              <td style={td}>{row.display_name}</td>
              <td style={td}>{row.total_queries}</td>
              <td style={td}>{row.total_mcqs_generated}</td>
              <td style={td}>{row.total_mcqs_correct}</td>
              <td style={td}>{(row.avg_accuracy * 100).toFixed(1)}%</td>
              <td style={td}>{row.streak_days}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = {
  padding: "10px",
  textAlign: "left",
  borderBottom: "2px solid #ddd",
  fontWeight: "600",
};

const td = {
  padding: "10px",
  borderBottom: "1px solid #eee",
};

const tr = {
  background: "white",
};
