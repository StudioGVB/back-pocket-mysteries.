import { getAdminStats, getAiCosts } from '../admin-data';

export default async function CostsPage() {
  const [stats, logs] = await Promise.all([
    getAdminStats(),
    getAiCosts()
  ]);

  const totalRevenue = stats.totalRevenue;
  
  // Aggregate total AI costs
  const totalAiCost = logs.reduce((acc, log) => acc + Number(log.cost_usd || 0), 0);
  const profitMargin = totalRevenue > 0 
    ? ((totalRevenue - totalAiCost) / totalRevenue) * 100 
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">AI Cost Tracking</h1>
        <p className="text-slate-500 mt-2 font-medium">
          Monitor your AI API usage and compare it against your incoming revenue.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Revenue Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Revenue</h2>
          <div className="text-4xl font-black text-green-600">
            ${totalRevenue.toFixed(2)}
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">From completed orders</p>
        </div>

        {/* AI Cost Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Total AI Cost</h2>
          <div className="text-4xl font-black text-red-500">
            ${totalAiCost.toFixed(4)}
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">Total API expenditure</p>
        </div>

        {/* Profit Margin Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Net Profit</h2>
          <div className="text-4xl font-black text-slate-900">
            ${(totalRevenue - totalAiCost).toFixed(2)}
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">{profitMargin.toFixed(1)}% margin on AI usage</p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Recent AI Generation Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Feature</th>
                <th className="px-6 py-4">Model</th>
                <th className="px-6 py-4">Tokens</th>
                <th className="px-6 py-4 text-right">Cost (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No AI usage logs found.
                  </td>
                </tr>
              ) : (
                logs.slice(0, 50).map((log) => {
                  const formattedDate = new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  }).format(new Date(log.created_at));

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">{formattedDate}</td>
                      <td className="px-6 py-4 font-bold text-slate-800 capitalize">{log.feature_name.replace(/_/g, ' ')}</td>
                      <td className="px-6 py-4 text-xs">{log.model_name}</td>
                      <td className="px-6 py-4">
                        {log.prompt_tokens ? (
                          <span className="text-xs text-slate-500">
                            <span className="text-slate-800">{log.prompt_tokens}</span> in / <span className="text-slate-800">{log.completion_tokens}</span> out
                          </span>
                        ) : (
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">Image Gen</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-red-500">
                        ${Number(log.cost_usd).toFixed(5)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
