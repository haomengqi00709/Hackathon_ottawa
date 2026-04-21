import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function FinancialsPanel({ records }) {
  if (!records.length) return (
    <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No financial indicators</CardContent></Card>
  );

  const latest = records[0];
  const govRatio = latest.totalRevenue > 0 ? Math.round((latest.governmentRevenue || 0) / latest.totalRevenue * 100) : 0;
  const compRatio = latest.totalExpenses > 0 ? Math.round((latest.compensationExpense || 0) / latest.totalExpenses * 100) : 0;
  const progRatio = latest.totalExpenses > 0 ? Math.round((latest.programExpense || 0) / latest.totalExpenses * 100) : 0;

  const revenueData = [
    { name: 'Govt', value: latest.governmentRevenue || 0, color: '#3b82f6' },
    { name: 'Earned', value: latest.earnedRevenue || 0, color: '#22c55e' },
    { name: 'Donations', value: latest.donationsRevenue || 0, color: '#a855f7' },
    { name: 'Other', value: latest.otherRevenue || 0, color: '#6b7280' },
  ].filter(d => d.value > 0);

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">Financial Indicators — FY {latest.fiscalYear}</CardTitle>
        <Badge variant="outline" className={`text-xs capitalize ${
          latest.latestFilingStatus === 'current' ? 'border-green-200 text-green-700' :
          latest.latestFilingStatus === 'late' ? 'border-yellow-200 text-yellow-700' :
          'border-red-200 text-red-700'
        }`}>Filing: {latest.latestFilingStatus}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Govt Dependency</p>
            <p className={`text-xl font-bold ${govRatio > 80 ? 'text-red-600' : govRatio > 60 ? 'text-yellow-600' : 'text-green-600'}`}>{govRatio}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Compensation</p>
            <p className={`text-xl font-bold ${compRatio > 70 ? 'text-red-600' : compRatio > 50 ? 'text-yellow-600' : 'text-green-600'}`}>{compRatio}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Program Spending</p>
            <p className={`text-xl font-bold ${progRatio < 30 ? 'text-red-600' : progRatio < 50 ? 'text-yellow-600' : 'text-green-600'}`}>{progRatio}%</p>
          </div>
        </div>

        {revenueData.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Revenue Breakdown</p>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={revenueData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {revenueData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-muted/50 rounded"><span className="text-muted-foreground">Revenue:</span> <span className="font-medium">${(latest.totalRevenue || 0).toLocaleString()}</span></div>
          <div className="p-2 bg-muted/50 rounded"><span className="text-muted-foreground">Expenses:</span> <span className="font-medium">${(latest.totalExpenses || 0).toLocaleString()}</span></div>
          <div className="p-2 bg-muted/50 rounded"><span className="text-muted-foreground">Programs:</span> <span className="font-medium">${(latest.programExpense || 0).toLocaleString()}</span></div>
          <div className="p-2 bg-muted/50 rounded"><span className="text-muted-foreground">Transfers:</span> <span className="font-medium">${(latest.transferToOtherEntities || 0).toLocaleString()}</span></div>
        </div>
      </CardContent>
    </Card>
  );
}