import React from 'react';

export function AdminHeader() {
  return (
    <header className="flex justify-between items-center mb-12">
      <div>
        <h1 className="text-2xl font-black text-brand-dark tracking-tight">Admin Portal</h1>
        <p className="text-gray-500 text-sm font-medium">Welcome back, Admin</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-brand-pink flex items-center justify-center text-white font-black">
          A
        </div>
      </div>
    </header>
  );
}
