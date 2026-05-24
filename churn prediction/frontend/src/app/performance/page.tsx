'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckCircle2, 
  TrendingUp, 
  Target, 
  Layers,
  Loader2
} from 'lucide-react';

export default function Performance() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('http://localhost:8000/model-stats');
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch model stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const metrics = [
    { name: 'ROC-AUC', value: data?.roc_auc?.toFixed(4) || 'N/A', desc: 'Area Under Curve', icon: TrendingUp, color: 'indigo' },
    { name: 'Accuracy', value: data?.accuracy_score ? `${(data.accuracy_score * 100).toFixed(1)}%` : 'N/A', desc: 'Overall correct predictions', icon: Target, color: 'emerald' },
    { name: 'Precision', value: data?.precision ? `${(data.precision * 100).toFixed(1)}%` : 'N/A', desc: 'Correct positive predictions', icon: CheckCircle2, color: 'blue' },
    { name: 'F1 Score', value: data?.f1_score?.toFixed(3) || 'N/A', desc: 'Balance of Prec/Recall', icon: Layers, color: 'purple' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Model Performance</h1>
        <p className="text-slate-500 dark:text-slate-400">Deep dive into the machine learning model metrics and evaluation results.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((m, idx) => (
          <motion.div
            key={m.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${m.color}-100 dark:bg-${m.color}-900/20 mb-4`}>
              <m.icon className={`h-5 w-5 text-${m.color}-600 dark:text-${m.color}-400`} />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{m.name}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{m.value}</p>
            <p className="text-xs text-slate-400 mt-2">{m.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Model Info */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800">
          <h3 className="text-xl font-bold mb-6">Algorithm Details</h3>
          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Active Model</span>
              <span className="font-semibold">{data?.model_name || 'Logistic Regression'}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Preprocessing</span>
              <span className="font-semibold">StandardScaler + OHE</span>
            </div>
            <div className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Feature Selection</span>
              <span className="font-semibold">Recursive Feature Elim.</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-slate-500">Calibration</span>
              <span className="font-semibold">Isotonic</span>
            </div>
          </div>
        </div>

        {/* Confusion Matrix Visualization */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800">
          <h3 className="text-xl font-bold mb-6">Confusion Matrix</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="aspect-square bg-emerald-500/10 flex flex-col items-center justify-center rounded-lg border border-emerald-500/20">
              <span className="text-2xl font-bold text-emerald-600">{data?.confusion_matrix?.tn || 0}</span>
              <span className="text-xs uppercase tracking-wider text-emerald-700">True Negative</span>
            </div>
            <div className="aspect-square bg-red-500/10 flex flex-col items-center justify-center rounded-lg border border-red-500/20">
              <span className="text-2xl font-bold text-red-600">{data?.confusion_matrix?.fp || 0}</span>
              <span className="text-xs uppercase tracking-wider text-red-700">False Positive</span>
            </div>
            <div className="aspect-square bg-red-500/10 flex flex-col items-center justify-center rounded-lg border border-red-500/20">
              <span className="text-2xl font-bold text-red-600">{data?.confusion_matrix?.fn || 0}</span>
              <span className="text-xs uppercase tracking-wider text-red-700">False Negative</span>
            </div>
            <div className="aspect-square bg-emerald-500/10 flex flex-col items-center justify-center rounded-lg border border-emerald-500/20">
              <span className="text-2xl font-bold text-emerald-600">{data?.confusion_matrix?.tp || 0}</span>
              <span className="text-xs uppercase tracking-wider text-emerald-700">True Positive</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
