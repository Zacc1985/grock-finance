"use client";

import React from "react";
import Link from "next/link";

// Placeholder data for the bar graph
const data = [
  { label: "Needs (50%)", value: 1000, color: "#3b82f6" },
  { label: "Wants (30%)", value: 600, color: "#f59e42" },
  { label: "Savings (20%)", value: 400, color: "#10b981" },
];

export default function FiftyThirtyTwenty() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6">50/30/20 Rule Overview</h1>
      <div className="w-full max-w-md bg-gray-800 rounded-xl p-6 shadow-xl mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Budget Breakdown</h2>
        <div className="space-y-4">
          {data.map((item) => (
            <div key={item.label} className="mb-2">
              <div className="flex justify-between mb-1">
                <span>{item.label}</span>
                <span className="font-mono">${item.value}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4">
                <div
                  className="h-4 rounded-full"
                  style={{ width: `${item.value / 20}%`, background: item.color }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Link href="/dashboard">
        <button className="bg-grock-500 text-white px-6 py-2 rounded-lg hover:bg-grock-600 transition-colors">
          Back to Dashboard
        </button>
      </Link>
    </div>
  );
} 