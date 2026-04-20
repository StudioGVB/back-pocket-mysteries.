import React from 'react';

export default function AdminUsers() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-brand-dark uppercase tracking-tight">User Management</h2>
          <p className="text-gray-500 text-sm font-medium">Manage your community of mystery hosts</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">User</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Joined Date</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Mysteries Owned</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Last Active</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[
              { email: 'sarah.jones@example.com', date: 'Jan 2024', owned: 3, active: '2 hours ago' },
              { email: 'mike.ross@pearson.com', date: 'Feb 2024', owned: 1, active: '1 day ago' },
              { email: 'harvey.specter@pearson.com', date: 'Mar 2024', owned: 5, active: 'Just now' },
            ].map((user, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center text-xs font-black">
                      {user.email[0].toUpperCase()}
                    </div>
                    <p className="text-sm font-bold text-brand-dark">{user.email}</p>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <p className="text-sm text-gray-500 font-medium">{user.date}</p>
                </td>
                <td className="px-8 py-6">
                  <p className="text-sm font-black text-brand-dark">{user.owned}</p>
                </td>
                <td className="px-8 py-6">
                  <p className="text-sm text-gray-500 font-medium">{user.active}</p>
                </td>
                <td className="px-8 py-6">
                  <button className="text-gray-400 text-xs font-black uppercase tracking-widest hover:text-brand-pink transition-colors">View Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
