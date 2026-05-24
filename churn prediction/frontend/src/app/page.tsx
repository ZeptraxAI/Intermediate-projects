'use client';

import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  ShieldCheck, 
  BarChart, 
  Zap, 
  Target 
} from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto space-y-16 py-12">
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-4 py-1.5 mb-4 text-xs font-semibold tracking-wider text-indigo-600 uppercase bg-indigo-50 rounded-full dark:bg-indigo-900/30 dark:text-indigo-400">
            Machine Learning Powered
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Predict Customer Churn <br />
            <span className="text-indigo-600">Before It Happens.</span>
          </h1>
          <p className="mt-6 text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Empower your retention strategy with high-precision machine learning models. 
            Identify at-risk customers and understand the key drivers behind their behavior.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/dashboard" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex items-center group">
              Start Prediction
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/analytics" className="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">
              View Analytics
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: "90%+ Accuracy",
            desc: "Optimized XGBoost and Random Forest models for reliable forecasts.",
            icon: Target,
            color: "blue"
          },
          {
            title: "Explainable AI",
            desc: "Understand specific reasons for churn with SHAP interpretability.",
            icon: ShieldCheck,
            color: "green"
          },
          {
            title: "Real-time Processing",
            desc: "Instant predictions through our high-performance FastAPI backend.",
            icon: Zap,
            color: "yellow"
          },
          {
            title: "Deep Analytics",
            desc: "Comprehensive dashboards to visualize trends and cohorts.",
            icon: BarChart,
            color: "purple"
          }
        ].map((feature, idx) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center bg-${feature.color}-100 dark:bg-${feature.color}-900/20`}>
              <feature.icon className={`h-6 w-6 text-${feature.color}-600 dark:text-${feature.color}-400`} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{feature.title}</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{feature.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* Quick Stats */}
      <section className="bg-indigo-600 rounded-3xl p-8 md:p-12 text-white overflow-hidden relative">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-4xl font-bold">7,043+</p>
            <p className="text-indigo-100 mt-1">Training Samples</p>
          </div>
          <div>
            <p className="text-4xl font-bold">20+</p>
            <p className="text-indigo-100 mt-1">Customer Attributes</p>
          </div>
          <div>
            <p className="text-4xl font-bold">3</p>
            <p className="text-indigo-100 mt-1">SOTA Algorithms</p>
          </div>
        </div>
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-indigo-900/30 rounded-full blur-3xl"></div>
      </section>
    </div>
  );
}
