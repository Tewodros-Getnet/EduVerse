import React from 'react';

export default function StatCard({ title, value, change, icon, gradient }) {
    const isPositive = change && !change.startsWith('-');
    return (
        <div className={`rounded-2xl p-5 text-white bg-gradient-to-br ${gradient} relative overflow-hidden`}>
            <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{icon}</span>
                {change && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isPositive ? 'bg-white/20' : 'bg-red-500/30'}`}>
                        {change}
                    </span>
                )}
            </div>
            <div className="text-3xl font-bold mb-1">{value}</div>
            <div className="text-sm opacity-80">{title}</div>
        </div>
    );
}
