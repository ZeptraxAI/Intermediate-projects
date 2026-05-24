'use client';

import { useState } from 'react';
import PredictionForm from '@/components/PredictionForm';
import ResultCard from '@/components/ResultCard';
import BatchUpload from '@/components/BatchUpload';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [result, setResult] = useState<any>(null);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Customer Risk Assessment</h1>
        <p className="text-slate-500 dark:text-slate-400">Fill in the details below to predict the likelihood of customer churn.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <BatchUpload />
          <PredictionForm onResult={setResult} />
        </motion.div>

        <div className="lg:sticky lg:top-8">
          {result ? (
            <ResultCard result={result} />
          ) : (
            <div className="h-[500px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">?</span>
              </div>
              <h3 className="text-lg font-semibold">No Analysis Yet</h3>
              <p className="max-w-xs mt-2">Enter customer data and click "Analyze Customer" to see the prediction results here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
