'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface ResultCardProps {
  result: {
    prediction: string;
    probability: number;
    contributions: Array<{ feature: string; impact: number }>;
  };
}

export default function ResultCard({ result }: ResultCardProps) {
  const isChurn = result.prediction === 'Churn';
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <div className={`p-8 rounded-2xl border-2 flex items-center space-x-6 ${
        isChurn 
          ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400" 
          : "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400"
      }`}>
        <div className={`p-4 rounded-full ${isChurn ? "bg-red-100 dark:bg-red-900/20" : "bg-emerald-100 dark:bg-emerald-900/20"}`}>
          {isChurn ? <AlertTriangle className="h-10 w-10" /> : <CheckCircle2 className="h-10 w-10" />}
        </div>
        <div>
          <h2 className="text-3xl font-bold">{result.prediction} Risk</h2>
          <p className="text-lg opacity-80">
            Probability: <span className="font-mono font-bold">{result.probability}%</span>
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center mb-6">
          <Info className="h-5 w-5 text-indigo-500 mr-2" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Why this prediction?</h3>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Top features influencing the model's decision (SHAP Importance):
          </p>
          {result.contributions.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {item.feature.replace('num__', '').replace('cat__', '')}
                </span>
                <span className={item.impact > 0 ? "text-red-500" : "text-emerald-500"}>
                  {item.impact > 0 ? "+" : ""}{item.impact.toFixed(4)}
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(Math.abs(item.impact) * 100, 100)}%` }}
                  className={`h-full ${item.impact > 0 ? "bg-red-500" : "bg-emerald-500"}`}
                />
              </div>
            </div>
          ))}
        </div>
        
        <p className="mt-6 text-xs text-slate-400 italic">
          Positive values (+) increase churn probability, while negative values (-) decrease it.
        </p>
      </div>
    </motion.div>
  );
}
