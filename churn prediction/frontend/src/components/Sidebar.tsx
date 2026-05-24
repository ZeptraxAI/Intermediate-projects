'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BarChart3, 
  Settings, 
  Info, 
  Activity, 
  Users 
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Home', href: '/', icon: Info },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Model Performance', href: '/performance', icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-slate-900 text-white transition-all duration-300">
      <div className="flex h-20 items-center justify-center border-b border-slate-800">
        <Users className="h-8 w-8 text-indigo-500" />
        <span className="ml-2 text-xl font-bold tracking-tight">ChurnAI</span>
      </div>
      
      <nav className="flex-1 space-y-1 px-4 py-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive 
                  ? "bg-indigo-600 text-white" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "mr-3 h-5 w-5 transition-colors",
                isActive ? "text-white" : "text-slate-500 group-hover:text-white"
              )} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center rounded-lg bg-slate-800 p-3">
          <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold">
            A
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-medium truncate">Admin User</p>
            <p className="text-xs text-slate-500 truncate">admin@churnai.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
