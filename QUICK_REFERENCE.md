# 🚀 Modern LMS Components - Quick Reference Guide

## 📦 Available Components

### Core Components

| Component                 | Path                            | Purpose              | Status   |
| ------------------------- | ------------------------------- | -------------------- | -------- |
| FloatingAIAssistant       | `ModernCards.jsx`               | Floating chat widget | ✅ Ready |
| ModernStudentDashboard    | `ModernStudentDashboard.jsx`    | Student homepage     | ✅ Ready |
| ModernCourseDetail        | `ModernCourseDetail.jsx`        | Course learning      | ✅ Ready |
| ModernInstructorDashboard | `ModernInstructorDashboard.jsx` | Instructor analytics | ✅ Ready |
| ModernAdminDashboard      | `ModernAdminDashboard.jsx`      | Admin control        | ✅ Ready |

### Card Library (ModernCards.jsx)

| Card Type      | Use Case              | Import               |
| -------------- | --------------------- | -------------------- |
| Card           | Basic container       | `{ Card }`           |
| CardWithHeader | Section with title    | `{ CardWithHeader }` |
| GradientCard   | Stats/metrics display | `{ GradientCard }`   |
| ActionCard     | CTA buttons           | `{ ActionCard }`     |
| ProgressCard   | Progress bars         | `{ ProgressCard }`   |
| FeatureCard    | Feature showcase      | `{ FeatureCard }`    |
| CourseCard     | Course tiles          | `{ CourseCard }`     |
| UserCard       | User profiles         | `{ UserCard }`       |
| StatusCard     | Status alerts         | `{ StatusCard }`     |
| EmptyStateCard | No data states        | `{ EmptyStateCard }` |
| SkeletonCard   | Loading states        | `{ SkeletonCard }`   |
| ListCard       | Lists container       | `{ ListCard }`       |

---

## 🎨 Color System

### Quick Access

```jsx
import colors from "@/theme/colors";

// Primary colors
colors.primary[600]; // #4F46E5 (Indigo)
colors.secondary[600]; // #9333EA (Purple)
colors.success[500]; // #10B981 (Emerald)

// Backgrounds
colors.background.light; // #F8FAFC
colors.background.dark; // #0F172A

// Gradients (ready to use with Tailwind)
("from-indigo-600 to-purple-600");
("from-emerald-500 to-teal-500");
("from-orange-500 to-rose-500");
```

---

## 💡 Usage Examples

### Add Floating AI Assistant to Layout

```jsx
// StudentLayout.jsx
import FloatingAIAssistant from "@/components/FloatingAIAssistant";

export default function StudentLayout() {
  return (
    <div>
      {/* Your existing layout */}
      <StudentLayout />
      {/* Add at bottom for z-index to work */}
      <FloatingAIAssistant />
    </div>
  );
}
```

### Create Dashboard Stats Section

```jsx
import { GradientCard, Card, CardWithHeader } from "@/components/ModernCards";

function DashboardStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <GradientCard
        icon="📚"
        label="Courses"
        value={12}
        color="from-blue-500 to-cyan-400"
        trend="+2 this month"
      />
      <GradientCard
        icon="👥"
        label="Students"
        value={245}
        color="from-purple-500 to-pink-500"
        trend="+45 this month"
      />
    </div>
  );
}
```

### Create Course Management Grid

```jsx
import { CourseCard } from "@/components/ModernCards";

function CoursesGrid({ courses }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          progress={course.progress}
          enrolled={true}
          onEnroll={() => enrollCourse(course.id)}
        />
      ))}
    </div>
  );
}
```

### Create Status Indicators

```jsx
import { StatusCard } from "@/components/ModernCards";

function StatusIndicators() {
  return (
    <div className="space-y-3">
      <StatusCard
        icon="✅"
        status="Success"
        message="Your submission was accepted"
        type="success"
      />
      <StatusCard
        icon="⚠️"
        status="Warning"
        message="Your assignment is due tomorrow"
        type="warning"
      />
      <StatusCard
        icon="❌"
        status="Error"
        message="Failed to save changes"
        type="error"
      />
    </div>
  );
}
```

### Create Empty State

```jsx
import { EmptyStateCard } from "@/components/ModernCards";

function NoCourses() {
  return (
    <EmptyStateCard
      icon="📚"
      title="No courses yet"
      description="Start your learning journey by browsing available courses"
      action={
        <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg">
          Browse Courses
        </button>
      }
    />
  );
}
```

### Create Data Table

```jsx
import { Card } from "@/components/ModernCards";

function UserTable({ users }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                Role
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4">{user.name}</td>
                <td className="px-6 py-4">{user.email}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                    {user.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
```

### Create Progress Section

```jsx
import { CardWithHeader, ProgressCard } from "@/components/ModernCards";

function ProgressSection() {
  return (
    <CardWithHeader title="Your Progress" subtitle="Track your learning">
      <div className="space-y-6">
        <ProgressCard
          label="React Fundamentals"
          value="75%"
          percentage={75}
          color="from-indigo-500 to-purple-600"
          detailed={true}
        />
        <ProgressCard
          label="Advanced JavaScript"
          value="45%"
          percentage={45}
          color="from-blue-500 to-cyan-500"
          detailed={true}
        />
        <ProgressCard
          label="Web Design"
          value="100%"
          percentage={100}
          color="from-emerald-500 to-teal-500"
          detailed={true}
        />
      </div>
    </CardWithHeader>
  );
}
```

---

## 🎯 Common Patterns

### Alert Banner

```jsx
<div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl p-6 flex items-start gap-4">
  <span className="text-2xl flex-shrink-0">ℹ️</span>
  <div>
    <p className="font-bold">Maintenance Notice</p>
    <p className="text-sm text-blue-100">
      System maintenance scheduled for tonight.
    </p>
  </div>
</div>
```

### Feature Highlight

```jsx
<div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl p-8">
  <div className="text-5xl mb-4">🤖</div>
  <h2 className="text-2xl font-bold mb-2">AI-Powered Learning</h2>
  <p className="text-indigo-100">
    Get personalized recommendations and instant help
  </p>
</div>
```

### Sidebar Section

```jsx
<div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
  <h3 className="font-bold text-gray-900 dark:text-white mb-4">
    ⚙️ Quick Actions
  </h3>
  <div className="space-y-2">
    <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition">
      → Settings
    </button>
    <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition">
      → Help Center
    </button>
    <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition">
      → Contact Support
    </button>
  </div>
</div>
```

### Loading Skeleton

```jsx
import { SkeletonCard } from "@/components/ModernCards";

function LoadingPlaceholder() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} lines={3} />
      ))}
    </div>
  );
}
```

---

## 📱 Responsive Patterns

### Grid Layouts

```jsx
// Auto-responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Two-column layout
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

// Three-column dashboard
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

### Flex Patterns

```jsx
// Horizontal layout with wrap
<div className="flex flex-wrap gap-4">

// Vertical stack on mobile, horizontal on desktop
<div className="flex flex-col lg:flex-row gap-6">

// Center content
<div className="flex items-center justify-center h-96">
```

### Hidden Elements

```jsx
// Hide on mobile, show on desktop
<div className="hidden md:block">Desktop only</div>

// Show on mobile, hide on desktop
<div className="md:hidden">Mobile only</div>

// Different display on breakpoints
<div className="block md:flex lg:grid">
```

---

## 🎬 Animation Presets

### Smooth Transitions

```jsx
// Standard transition
className = "transition-all duration-300";

// Quick hover effect
className = "hover:scale-105 transition-transform duration-150";

// Smooth color change
className = "hover:from-indigo-700 transition-colors duration-300";

// Elevated shadow
className = "hover:shadow-lg transition-shadow duration-300";
```

### Loading States

```jsx
// Pulse animation
<div className="animate-pulse bg-gray-200 h-4 rounded-lg"></div>

// Spin animation
<div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>

// Bounce animation
<div className="animate-bounce">Loading...</div>
```

---

## 🔒 Common Props

### GradientCard Props

```jsx
<GradientCard
  icon="📚" // Emoji or icon
  label="Courses" // Label text
  value={12} // Display value
  color="from-blue-500 to-cyan-400" // Gradient color
  trend="+2 this month" // Optional trend text
/>
```

### ActionCard Props

```jsx
<ActionCard
  icon="✨" // Emoji or icon
  title="Create Course" // Button title
  description="..." // Subtitle
  color="from-indigo-600 to-purple-600" // Gradient
  to="/path" // Link destination
  onClick={handler} // Or click handler
/>
```

### CourseCard Props

```jsx
<CourseCard
  course={{
    // Course object
    title: "React",
    instructor: "John",
    icon: "💻",
  }}
  progress={75} // 0-100
  enrolled={true} // Boolean
  onEnroll={handler} // Callback
/>
```

---

## 🚨 Common Mistakes to Avoid

❌ **DON'T**: Hardcode colors instead of using system
✅ **DO**: Use gradient classes like `from-indigo-600 to-purple-600`

❌ **DON'T**: Add custom spacing that breaks the system
✅ **DO**: Use Tailwind classes: `p-4`, `p-6`, `p-8`

❌ **DON'T**: Forget dark mode classes
✅ **DO**: Always add `dark:` classes: `bg-white dark:bg-slate-800`

❌ **DON'T**: Make buttons too small for mobile
✅ **DO**: Use minimum 44px touch targets with adequate padding

❌ **DON'T**: Overuse animations
✅ **DO**: Use 300ms standard, 150ms quick, 500ms slow

❌ **DON'T**: Skip accessibility
✅ **DO**: Use semantic HTML and ARIA labels

---

## ⚡ Performance Tips

### Code Splitting

```jsx
import { lazy, Suspense } from "react";

const Dashboard = lazy(() => import("./ModernStudentDashboard"));

<Suspense fallback={<LoadingSpinner />}>
  <Dashboard />
</Suspense>;
```

### Memoization

```jsx
import { memo } from "react";

export const CourseCardMemo = memo(CourseCard);
// Use CourseCardMemo instead of CourseCard in lists
```

### Image Optimization

```jsx
// Use WebP format
<img src="image.webp" alt="Description" loading="lazy" />

// Or use responsive images
<img
    srcSet="small.jpg 480w, medium.jpg 800w, large.jpg 1920w"
    sizes="(max-width: 600px) 100vw, 50vw"
    alt="Description"
/>
```

---

## 🧪 Testing Checklist

Before deploying, verify:

- [ ] Light mode looks good
- [ ] Dark mode looks good
- [ ] Mobile view (375px) responsive
- [ ] Tablet view (768px) responsive
- [ ] Desktop view (1920px) responsive
- [ ] All links work
- [ ] API calls working
- [ ] No console errors
- [ ] Loading states appear
- [ ] Error states handle gracefully
- [ ] Dark mode toggle works
- [ ] Touch targets 44px minimum
- [ ] Text contrast sufficient
- [ ] Animations smooth (no jank)

---

## 📚 File Structure

```
student-frontend/src/
├── theme/
│   └── colors.js                    # Color system
├── components/
│   ├── FloatingAIAssistant.jsx      # AI chat widget
│   ├── ModernCards.jsx              # Card library
│   ├── ModernStudentDashboard.jsx   # Student home
│   ├── ModernCourseDetail.jsx       # Course page
│   └── ModernInstructorDashboard.jsx
└── pages/
    └── (existing pages with modern components)

admin-frontend/src/
└── components/
    └── ModernAdminDashboard.jsx     # Admin home
```

---

## 🎓 Learning Resources

- Review `DESIGN_SYSTEM.md` for comprehensive design guidelines
- Read `IMPLEMENTATION_GUIDE.md` for detailed setup
- Check `INTEGRATION_CHECKLIST.md` for phase planning
- Reference component source code for advanced patterns

---

## 💬 Quick Help

**Q: How do I change a color?**  
A: All major elements use Tailwind color classes (`bg-indigo-600`, etc.). Just update the class name.

**Q: How do I add dark mode?**  
A: Add `dark:` prefix to classes: `bg-white dark:bg-slate-800`

**Q: How do I make something responsive?**  
A: Use breakpoints: `md:`, `lg:`, `xl:` prefixes on Tailwind classes

**Q: How do I customize a component?**  
A: Pass different props (color, icon, label, etc.) to change appearance

**Q: Where are the components?**  
A: In `student-frontend/src/components/Modern*.jsx` files

**Q: How do I add the floating AI?**  
A: Import and add `<FloatingAIAssistant />` at the end of your layout component

---

**Last Updated**: May 2026  
**Version**: 1.0  
**Status**: Production Ready ✅
