/**
 * Generate test admin notifications
 * Run after migration: node test-admin-notifications.js
 */

require('dotenv').config();
const { query } = require('./src/db');

async function generateTestNotifications() {
    try {
        console.log('🔍 Finding admin user...');
        
        // Find first admin user
        const adminResult = await query(
            "SELECT id, email, name FROM users WHERE role = 'admin' LIMIT 1"
        );
        
        if (adminResult.rows.length === 0) {
            console.error('❌ No admin user found. Create an admin user first.');
            process.exit(1);
        }
        
        const admin = adminResult.rows[0];
        console.log(`✅ Found admin: ${admin.email}`);
        
        const mockNotifications = [
            {
                title: 'System Alert',
                message: 'Database backup completed successfully',
                type: 'system_alert',
                action_url: '/admin/system-logs',
                action_text: 'View Details'
            },
            {
                title: 'New User Registration',
                message: '15 new users registered in the last 24 hours',
                type: 'announcement',
                action_url: '/admin/users',
                action_text: 'View Users'
            },
            {
                title: 'Security Update',
                message: 'All systems are secure and up to date',
                type: 'security',
                action_url: '/admin/security',
                action_text: 'View Report'
            },
            {
                title: 'Course Review Required',
                message: '3 courses pending admin review',
                type: 'course_review',
                action_url: '/admin/courses/pending',
                action_text: 'Review Courses'
            },
            {
                title: 'User Report',
                message: '2 user reports require attention',
                type: 'user_report',
                action_url: '/admin/reports',
                action_text: 'View Reports'
            }
        ];
        
        console.log(`\n📧 Creating ${mockNotifications.length} test notifications...`);
        
        for (const notif of mockNotifications) {
            await query(
                `INSERT INTO notifications (user_id, title, message, type, is_read, action_url, action_text, created_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                [admin.id, notif.title, notif.message, notif.type, false, notif.action_url, notif.action_text]
            );
            console.log(`  ✅ ${notif.title}`);
        }
        
        console.log(`\n✅ Success! Created ${mockNotifications.length} notifications for ${admin.email}`);
        console.log('\n🔄 Refresh your admin notifications page to see them!');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

generateTestNotifications();
