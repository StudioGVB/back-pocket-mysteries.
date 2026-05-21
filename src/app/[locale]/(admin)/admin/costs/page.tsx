import { getAdminStats, getAiCosts } from '../admin-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Cost Tracking</h1>
        <p className="text-muted-foreground mt-2">
          Monitor your AI API usage and compare it against your incoming revenue.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">From completed orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AI Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${totalAiCost.toFixed(4)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total API expenditure</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit / Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(totalRevenue - totalAiCost).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{profitMargin.toFixed(1)}% margin on AI usage</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent AI Generation Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Feature</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead className="text-right">Cost (USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No AI usage logs found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.slice(0, 50).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{format(new Date(log.created_at), 'MMM d, h:mm a')}</TableCell>
                    <TableCell className="font-medium capitalize">{log.feature_name.replace(/_/g, ' ')}</TableCell>
                    <TableCell>{log.model_name}</TableCell>
                    <TableCell>
                      {log.prompt_tokens ? `${log.prompt_tokens} in / ${log.completion_tokens} out` : 'N/A (Image)'}
                    </TableCell>
                    <TableCell className="text-right">${Number(log.cost_usd).toFixed(5)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
