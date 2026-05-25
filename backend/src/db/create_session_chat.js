const { query } = require('./index');

async function createSessionChatTable() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS session_chat (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                user_name VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await query(`
            CREATE INDEX IF NOT EXISTS idx_session_chat_session ON session_chat(session_id)
        `);

        console.log('session_chat table created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error creating session_chat table:', error);
        process.exit(1);
    }
}

createSessionChatTable();
