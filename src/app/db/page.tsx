'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, Table, Users, MessageSquare, Flame, Star, Settings, History, Trophy } from 'lucide-react';

interface TableData {
  name: string;
  count: number;
  icon: React.ReactNode;
  description: string;
  lastUpdated?: string;
  data: any[];
}

export default function DatabasePage() {
  const [tables, setTables] = useState<TableData[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const tableDefinitions = [
    {
      name: 'pixey_users',
      icon: <Users className="h-5 w-5" />,
      description: 'User accounts and wallet information',
    },
    {
      name: 'pixey_pixels',
      icon: <Table className="h-5 w-5" />,
      description: 'Pixel board state with coordinates and colors',
    },
    {
      name: 'pixey_burn_transactions',
      icon: <Flame className="h-5 w-5" />,
      description: 'Token burn transactions and confirmations',
    },
    {
      name: 'pixey_chat_messages',
      icon: <MessageSquare className="h-5 w-5" />,
      description: 'Real-time chat messages from users',
    },
    {
      name: 'pixey_featured_artworks',
      icon: <Star className="h-5 w-5" />,
      description: 'Curated featured artworks and gallery items',
    },
    {
      name: 'pixey_game_settings',
      icon: <Settings className="h-5 w-5" />,
      description: 'Global game configuration and settings',
    },
    {
      name: 'pixey_pixel_history',
      icon: <History className="h-5 w-5" />,
      description: 'Historical record of all pixel changes',
    },
    {
      name: 'pixey_leaderboard',
      icon: <Trophy className="h-5 w-5" />,
      description: 'Materialized view of top players (refreshed automatically)',
    }
  ];

  const fetchDatabaseData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/db');
      const result = await response.json();
      
      if (result.success) {
        const tableData: TableData[] = tableDefinitions.map(def => {
          const dbData = result.data[def.name];
          return {
            ...def,
            count: dbData?.count || 0,
            lastUpdated: dbData?.last_updated ? new Date(dbData.last_updated).toLocaleString() : 'Unknown',
            data: dbData?.recent_data || [],
          };
        });
        setTables(tableData);
      } else {
        console.error('Failed to fetch database data:', result.error);
        // Fallback to empty tables on error
        const emptyTables: TableData[] = tableDefinitions.map(def => ({
          ...def,
          count: 0,
          lastUpdated: 'Error loading',
          data: [],
        }));
        setTables(emptyTables);
      }
    } catch (error) {
      console.error('Error fetching database data:', error);
      // Fallback to empty tables on error
      const emptyTables: TableData[] = tableDefinitions.map(def => ({
        ...def,
        count: 0,
        lastUpdated: 'Connection failed',
        data: [],
      }));
      setTables(emptyTables);
    } finally {
      setIsLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => {
    fetchDatabaseData();
  }, []);

  const refreshData = async () => {
    await fetchDatabaseData();
  };

  const formatValue = (key: string, value: any) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-500 italic">null</span>;
    }
    
    if (typeof value === 'boolean') {
      return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value.toString()}
        </span>
      );
    }
    
    if (key.includes('color') && typeof value === 'string' && value.startsWith('#')) {
      return (
        <div className="flex items-center space-x-2">
          <div 
            className="w-6 h-6 rounded border border-gray-300"
            style={{ backgroundColor: value }}
          />
          <span className="font-mono text-sm">{value}</span>
        </div>
      );
    }
    
    if (key.includes('_at') && typeof value === 'string') {
      return (
        <span className="text-sm text-gray-600">
          {new Date(value).toLocaleString()}
        </span>
      );
    }
    
    if (key.includes('address') && typeof value === 'string' && value.length > 20) {
      return (
        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
          {value.slice(0, 8)}...{value.slice(-8)}
        </span>
      );
    }
    
    if (typeof value === 'number') {
      return <span className="font-medium">{value.toLocaleString()}</span>;
    }
    
    return <span>{value.toString()}</span>;
  };

  const selectedTableData = tables.find(t => t.name === selectedTable);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Database className="h-8 w-8 text-purple-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Pixey Database</h1>
              <p className="text-gray-400">Database tables and content overview</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
            <Button
              onClick={refreshData}
              disabled={isLoading}
              variant="outline"
              className="bg-purple-600 border-purple-500 text-white hover:bg-purple-700"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Tables Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {tables.map((table) => (
            <Card
              key={table.name}
              className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                selectedTable === table.name
                  ? 'bg-purple-800 border-purple-500'
                  : 'bg-gray-800 border-gray-600 hover:border-purple-500'
              }`}
              onClick={() => setSelectedTable(selectedTable === table.name ? null : table.name)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="text-purple-400">{table.icon}</div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{table.count.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">records</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold text-white mb-1">{table.name}</h3>
                <p className="text-sm text-gray-400 mb-2">{table.description}</p>
                {table.lastUpdated && (
                  <div className="text-xs text-gray-500">Updated {table.lastUpdated}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Selected Table Details */}
        {selectedTableData && (
          <Card className="bg-gray-800 border-gray-600">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="text-purple-400">{selectedTableData.icon}</div>
                <CardTitle className="text-white text-xl">{selectedTableData.name}</CardTitle>
                <div className="text-purple-400">({selectedTableData.count.toLocaleString()} records)</div>
              </div>
              <p className="text-gray-400">{selectedTableData.description}</p>
            </CardHeader>
            <CardContent>
              {selectedTableData.data.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-600">
                        {Object.keys(selectedTableData.data[0]).map((key) => (
                          <th key={key} className="text-left py-3 px-4 font-medium text-gray-300">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTableData.data.map((row, index) => (
                        <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/50">
                          {Object.entries(row).map(([key, value]) => (
                            <td key={key} className="py-3 px-4 text-white">
                              {formatValue(key, value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {selectedTableData.data.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No data available for this table
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Database Schema Info */}
        <Card className="mt-8 bg-gray-800 border-gray-600">
          <CardHeader>
            <CardTitle className="text-white">Database Schema Information</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-purple-400 mb-3">Table Relationships</h4>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>pixey_users</strong> → Referenced by pixels, transactions, chat</li>
                  <li>• <strong>pixey_pixels</strong> → Core game board state</li>
                  <li>• <strong>pixey_burn_transactions</strong> → Links to users</li>
                  <li>• <strong>pixey_chat_messages</strong> → Links to users</li>
                  <li>• <strong>pixey_featured_artworks</strong> → Optional user link</li>
                  <li>• <strong>pixey_game_settings</strong> → Global singleton table</li>
                  <li>• <strong>pixey_pixel_history</strong> → Audit trail for pixels</li>
                  <li>• <strong>pixey_leaderboard</strong> → Materialized view (auto-refresh)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-purple-400 mb-3">Key Features</h4>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>ACID Compliance</strong> - PostgreSQL transactions</li>
                  <li>• <strong>Real-time Updates</strong> - Triggers for leaderboard</li>
                  <li>• <strong>Indexes</strong> - Optimized for coordinates & users</li>
                  <li>• <strong>Foreign Keys</strong> - Data integrity constraints</li>
                  <li>• <strong>Timestamps</strong> - Automatic created_at/updated_at</li>
                  <li>• <strong>Audit Trail</strong> - Pixel history tracking</li>
                  <li>• <strong>Performance</strong> - Materialized views</li>
                  <li>• <strong>Scalability</strong> - Connection pooling ready</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
