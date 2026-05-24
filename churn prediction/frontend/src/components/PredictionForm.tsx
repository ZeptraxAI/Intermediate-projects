'use client';

import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';

const options = {
  gender: ['Female', 'Male'],
  SeniorCitizen: [0, 1],
  Partner: ['Yes', 'No'],
  Dependents: ['Yes', 'No'],
  PhoneService: ['Yes', 'No'],
  MultipleLines: ['Yes', 'No', 'No phone service'],
  InternetService: ['DSL', 'Fiber optic', 'No'],
  OnlineSecurity: ['Yes', 'No', 'No internet service'],
  OnlineBackup: ['Yes', 'No', 'No internet service'],
  DeviceProtection: ['Yes', 'No', 'No internet service'],
  TechSupport: ['Yes', 'No', 'No internet service'],
  StreamingTV: ['Yes', 'No', 'No internet service'],
  StreamingMovies: ['Yes', 'No', 'No internet service'],
  Contract: ['Month-to-month', 'One year', 'Two year'],
  PaperlessBilling: ['Yes', 'No'],
  PaymentMethod: ['Electronic check', 'Mailed check', 'Bank transfer (automatic)', 'Credit card (automatic)'],
};

export default function PredictionForm({ onResult }: { onResult: (data: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    gender: 'Male',
    SeniorCitizen: 0,
    Partner: 'No',
    Dependents: 'No',
    tenure: 1,
    PhoneService: 'Yes',
    MultipleLines: 'No',
    InternetService: 'Fiber optic',
    OnlineSecurity: 'No',
    OnlineBackup: 'No',
    DeviceProtection: 'No',
    TechSupport: 'No',
    StreamingTV: 'No',
    StreamingMovies: 'No',
    Contract: 'Month-to-month',
    PaperlessBilling: 'Yes',
    PaymentMethod: 'Electronic check',
    MonthlyCharges: 70.0,
    TotalCharges: 70.0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'tenure' || name === 'MonthlyCharges' || name === 'TotalCharges' || name === 'SeniorCitizen'
        ? Number(value)
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      onResult(data);
    } catch (err) {
      console.error(err);
      alert("Failed to connect to backend. Make sure the API is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Numeric Inputs */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tenure (Months)</label>
          <input
            type="number"
            name="tenure"
            value={formData.tenure}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Monthly Charges ($)</label>
          <input
            type="number"
            step="0.01"
            name="MonthlyCharges"
            value={formData.MonthlyCharges}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total Charges ($)</label>
          <input
            type="number"
            step="0.01"
            name="TotalCharges"
            value={formData.TotalCharges}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />
        </div>

        {/* Select Inputs */}
        {Object.entries(options).map(([key, vals]) => (
          <div key={key} className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </label>
            <select
              name={key}
              value={formData[key as keyof typeof formData]}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {vals.map(v => (
                <option key={v} value={v} className="dark:bg-slate-800">
                  {v === 0 ? 'No' : v === 1 ? 'Yes' : v}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl transition-all flex items-center justify-center"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Calculating Prediction...
          </>
        ) : (
          <>
            <Send className="mr-2 h-5 w-5" />
            Analyze Customer
          </>
        )}
      </button>
    </form>
  );
}
