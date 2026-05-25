const { query } = require('./index');

async function createSessionRecordingsTable() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS session_recordings (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
                recording_url TEXT NOT NULL,
                duration_minutes INTEGER,
                file_size BIGINT,
                recording_type VARCHAR(50) DEFAULT 'video' CHECK (recording_type IN ('video', 'audio', 'screen')),
                status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await query(`
            CREATE INDEX IF NOT EXISTS idx_session_recordings_session ON session_recordings(session_id)
        `);

        console.log('session_recordings table created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error creating session_recordings table:', error);
        process.exit(1);
    }
}

createSessionRecordingsTable();
