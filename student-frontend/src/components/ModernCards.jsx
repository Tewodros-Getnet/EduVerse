import React from 'react';

/**
 * Reusable Modern Card Components
 * Following EduVerse Design System
 */

// Basic Card Component
export function Card({ children, className = '', ...props }) {
    return (
        <div
            className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-md transition-all ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

// Card with Header
export function CardWithHeader({ title, subtitle, children, action, className = '', ...props }) {
    return (
        <Card className={className} {...props}>
            <div className="border-b border-gray-200 dark:border-slate-700 p-6 flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                    {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
                </div>
                {action && <div>{action}</div>}
            </div>
            <div className="p-6">{children}</div>
        </Card>
    );
}

// Gradient Card (for stats, highlights)
export function GradientCard({ icon, label, value, color = 'from-indigo-600 to-purple-600', trend, className = '', ...props }) {
    return (
        <div
            className={`bg-gradient-to-br ${color} rounded-2xl shadow-lg p-6 text-white ${className}`}
            {...props}
        >
            <div className="text-4xl mb-3">{icon}</div>
            <p className="text-white/80 text-sm font-medium">{label}</p>
            <p className="text-3xl font-bold my-2">{value}</p>
            {trend && <p className="text-sm text-white/70">{trend}</p>}
        </div>
    );
}

// Action Card (for quick links, CTAs)
export function ActionCard({ icon, title, description, onClick, to, color = 'from-indigo-600 to-purple-600', className = '', ...props }) {
    const Component = to ? 'a' : 'button';
    const componentProps = to ? { href: to } : { onClick };

    return (
        <Component
            className={`bg-gradient-to-br ${color} text-white rounded-2xl p-6 hover:shadow-lg hover:scale-105 transition-all group text-left cursor-pointer border-none ${className}`}
            {...componentProps}
            {...props}
        >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{icon}</div>
            <h3 className="font-bold mb-1">{title}</h3>
            <p className="text-sm text-white/80">{description}</p>
        </Component>
    );
}

// Progress Card
export function ProgressCard({ label, value, percentage, color = 'from-indigo-500 to-purple-600', detailed = false }) {
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{value}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                    className={`bg-gradient-to-r ${color} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            {detailed && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {percentage}% complete
                </div>
            )}
        </div>
    );
}

// Feature Card (with icon, title, description)
export function FeatureCard({ icon, title, description, badge, onClick, className = '', ...props }) {
    return (
        <Card
            className={`p-6 hover:border-indigo-300 dark:hover:border-indigo-600 cursor-pointer ${className}`}
            onClick={onClick}
            {...props}
        >
            <div className="flex items-start gap-4">
                <div className="text-4xl flex-shrink-0">{icon}</div>
                <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
                        {badge && (
                            <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                                {badge}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
                </div>
            </div>
        </Card>
    );
}

// Course Card (with progress)
export function CourseCard({ course, progress, enrolled, onEnroll, className = '', ...props }) {
    return (
        <Card className={`overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-600 ${className}`} {...props}>
            {/* Header with Gradient */}
            <div className="h-32 bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-8 -mt-8"></div>
                </div>
                <div className="relative h-full flex items-end p-4">
                    <span className="text-4xl">{course.icon || '📚'}</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 mb-2">{course.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{course.instructor}</p>

                {enrolled && progress !== undefined ? (
                    <>
                        {/* Progress Bar */}
                        <ProgressCard
                            label="Progress"
                            value={`${progress}%`}
                            percentage={progress}
                        />
                    </>
                ) : null}

                {/* Button */}
                <button
                    onClick={onEnroll}
                    className="w-full mt-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm hover:opacity-90 transition"
                >
                    {enrolled ? 'Continue Learning' : 'Enroll Now'}
                </button>
            </div>
        </Card>
    );
}

// User Profile Card
export function UserCard({ user, role, stats, className = '', ...props }) {
    return (
        <Card className={`p-6 ${className}`} {...props}>
            <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                    {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white">{user.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{role}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{user.email}</p>
                </div>
            </div>

            {stats && (
                <>
                    <div className="border-t border-gray-200 dark:border-slate-700 my-4"></div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        {stats.map((stat, idx) => (
                            <div key={idx}>
                                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{stat.value}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </Card>
    );
}

// Status Badge Card
export function StatusCard({ icon, status, message, type = 'info', className = '', ...props }) {
    const colors = {
        success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
        warning: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
        error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    };

    const textColors = {
        success: 'text-emerald-900 dark:text-emerald-300',
        warning: 'text-orange-900 dark:text-orange-300',
        error: 'text-red-900 dark:text-red-300',
        info: 'text-blue-900 dark:text-blue-300',
    };

    return (
        <div
            className={`border rounded-2xl p-6 flex items-start gap-4 ${colors[type]} ${className}`}
            {...props}
        >
            <div className="text-3xl flex-shrink-0">{icon}</div>
            <div className="flex-1">
                <p className={`font-bold ${textColors[type]}`}>{status}</p>
                <p className={`text-sm mt-1 ${textColors[type]}`}>{message}</p>
            </div>
        </div>
    );
}

// Empty State Card
export function EmptyStateCard({ icon, title, description, action, className = '', ...props }) {
    return (
        <Card className={`p-12 text-center ${className}`} {...props}>
            <div className="text-6xl mb-4">{icon}</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{description}</p>
            {action && <div>{action}</div>}
        </Card>
    );
}

// Skeleton Card (loading state)
export function SkeletonCard({ lines = 3, className = '', ...props }) {
    return (
        <Card className={`p-6 ${className}`} {...props}>
            <div className="space-y-4">
                <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                {Array.from({ length: lines }).map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                ))}
            </div>
        </Card>
    );
}

// List Card
export function ListCard({ items, renderItem, title, className = '', ...props }) {
    return (
        <CardWithHeader title={title} className={className} {...props}>
            <div className="space-y-2">
                {items && items.length > 0 ? (
                    items.map((item, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-600/50 transition">
                            {renderItem ? renderItem(item) : item}
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">No items</p>
                )}
            </div>
        </CardWithHeader>
    );
}

export default {
    Card,
    CardWithHeader,
    GradientCard,
    ActionCard,
    ProgressCard,
    FeatureCard,
    CourseCard,
    UserCard,
    StatusCard,
    EmptyStateCard,
    SkeletonCard,
    ListCard,
};
