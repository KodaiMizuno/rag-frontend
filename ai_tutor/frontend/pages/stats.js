import { useEffect, useState } from "react";
import { apiGet } from "../utils/api";

export default function Stats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    apiGet("users/me/stats")
      .then((json) => setStats(json))
      .catch((err) => console.error(err));
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div style={{ padding: "40px" }}>
      <h1>Your Stats</h1>
      <p><b>Name:</b> {stats.display_name}</p>
      <p><b>Total Queries:</b> {stats.total_queries}</p>
      <p><b>MCQs Generated:</b> {stats.total_mcqs_generated}</p>
      <p><b>MCQs Answered:</b> {stats.total_mcqs_answered}</p>
      <p><b>Correct Answers:</b> {stats.total_mcqs_correct}</p>
      <p><b>Accuracy:</b> {(stats.avg_accuracy * 100).toFixed(1)}%</p>
      <p><b>Streak:</b> {stats.streak_days}</p>
    </div>
  );
}
