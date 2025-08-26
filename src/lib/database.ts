import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DATABASE_POOL_SIZE || '20'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  getClient: () => pool.connect(),
};

// Health check
export const checkDatabaseConnection = async () => {
  try {
    await db.query('SELECT NOW()');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

// Get table statistics
export const getTableStats = async () => {
  try {
    const tables = [
      'pixey_users',
      'pixey_pixels', 
      'pixey_burn_transactions',
      'pixey_chat_messages',
      'pixey_game_settings',
      'pixey_pixel_history'
    ];

    const stats: Record<string, any> = {};

    for (const table of tables) {
      try {
        // Get row count
        const countResult = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(countResult.rows[0].count);

        // Get recent data (limit 10)
        let recentDataQuery = `SELECT * FROM ${table}`;
        
        // Add ORDER BY if table has created_at or placed_at column
        if (['pixey_users', 'pixey_burn_transactions', 'pixey_chat_messages'].includes(table)) {
          recentDataQuery += ' ORDER BY created_at DESC';
        } else if (table === 'pixey_pixels') {
          recentDataQuery += ' ORDER BY placed_at DESC';
        } else if (table === 'pixey_pixel_history') {
          recentDataQuery += ' ORDER BY changed_at DESC';
        } else if (table === 'pixey_game_settings') {
          recentDataQuery += ' ORDER BY updated_at DESC';
        }
        
        recentDataQuery += ' LIMIT 10';

        const dataResult = await db.query(recentDataQuery);

        stats[table] = {
          count,
          recent_data: dataResult.rows,
          last_updated: new Date().toISOString()
        };
      } catch (tableError) {
        console.warn(`Error querying table ${table}:`, tableError);
        stats[table] = {
          count: 0,
          recent_data: [],
          error: 'Table not found or query failed',
          last_updated: new Date().toISOString()
        };
      }
    }

    // Add leaderboard if it exists
    try {
      const leaderboardResult = await db.query('SELECT * FROM pixey_leaderboard ORDER BY rank ASC LIMIT 10');
      const leaderboardCount = await db.query('SELECT COUNT(*) as count FROM pixey_leaderboard');
      
      stats['pixey_leaderboard'] = {
        count: parseInt(leaderboardCount.rows[0].count),
        recent_data: leaderboardResult.rows,
        last_updated: new Date().toISOString()
      };
    } catch (leaderboardError) {
      console.warn('Leaderboard view not found:', leaderboardError);
      stats['pixey_leaderboard'] = {
        count: 0,
        recent_data: [],
        error: 'Materialized view not created yet',
        last_updated: new Date().toISOString()
      };
    }

    return stats;
  } catch (error) {
    console.error('Error getting table stats:', error);
    throw error;
  }
};

// Get specific table data
export const getTableData = async (tableName: string, limit: number = 50) => {
  try {
    // Validate table name to prevent SQL injection
    const allowedTables = [
      'pixey_users',
      'pixey_pixels', 
      'pixey_burn_transactions',
      'pixey_chat_messages',
      'pixey_featured_artworks',
      'pixey_game_settings',
      'pixey_pixel_history',
      'pixey_leaderboard'
    ];

    if (!allowedTables.includes(tableName)) {
      throw new Error('Invalid table name');
    }

    // Get total count
    const countResult = await db.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    const count = parseInt(countResult.rows[0].count);

    // Get data with appropriate ordering
    let dataQuery = `SELECT * FROM ${tableName}`;
    
    if (['pixey_users', 'pixey_burn_transactions', 'pixey_chat_messages', 'pixey_featured_artworks'].includes(tableName)) {
      dataQuery += ' ORDER BY created_at DESC';
    } else if (tableName === 'pixey_pixels') {
      dataQuery += ' ORDER BY placed_at DESC';
    } else if (tableName === 'pixey_pixel_history') {
      dataQuery += ' ORDER BY changed_at DESC';
    } else if (tableName === 'pixey_game_settings') {
      dataQuery += ' ORDER BY updated_at DESC';
    } else if (tableName === 'pixey_leaderboard') {
      dataQuery += ' ORDER BY rank ASC';
    }
    
    dataQuery += ` LIMIT ${limit}`;

    const dataResult = await db.query(dataQuery);

    return {
      count,
      data: dataResult.rows,
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error getting data for table ${tableName}:`, error);
    throw error;
  }
};
