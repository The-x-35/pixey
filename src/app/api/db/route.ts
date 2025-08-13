import { NextRequest, NextResponse } from 'next/server';
import { getTableStats, getTableData, checkDatabaseConnection } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Check database connection first
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed. Please check your DATABASE_URL environment variable.'
      }, { status: 500 });
    }

    if (table) {
      // Return specific table data
      const tableData = await getTableData(table, limit);
      return NextResponse.json({
        success: true,
        data: {
          [table]: tableData
        }
      });
    }

    // Return all table statistics
    const allStats = await getTableStats();
    return NextResponse.json({
      success: true,
      data: allStats
    });

  } catch (error) {
    console.error('Error fetching database info:', error);
    
    let errorMessage = 'Failed to fetch database information';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.stack : 'Unknown error'
    }, { status: 500 });
  }
}
