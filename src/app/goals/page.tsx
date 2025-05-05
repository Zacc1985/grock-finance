import React, { useEffect, useState } from 'react';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  status: string;
}

const GoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/goals')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch goals');
        return res.json();
      })
      .then((data) => {
        setGoals(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Financial Goals</h1>
      {loading && <p>Loading goals...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!loading && !error && goals.length === 0 && <p>No goals yet! 🎯</p>}
      {!loading && !error && goals.length > 0 && (
        <ul>
          {goals.map((goal) => (
            <li key={goal.id} style={{ marginBottom: '1rem' }}>
              <strong>{goal.name}</strong> — Target: ${goal.targetAmount} — Current: ${goal.currentAmount} <br />
              Status: {goal.status}
              {goal.deadline && <span> — Deadline: {new Date(goal.deadline).toLocaleDateString()}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GoalsPage; 