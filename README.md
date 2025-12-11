# AI Assignment Tracker

A React-based task management app that helps students track assignments, monitor workload and reduce stress through visual feedback and AI-like suggestions.

## What It Does

The AI Assignment Tracker shows your tasks in a clean interface with stress level indicators, weekly workload heatmaps, and smart suggestions for what to work on next. It includes a focus mode for time-boxed work sessions and generates helpful summaries for each task.

## Dependencies

Before starting, you'll need to install these packages:

**Main dependencies:**
- `react` and `react-dom` - Core React framework
- `react-scripts` - Build tools for Create React App
- `framer-motion` - Smooth animations and transitions
- `lucide-react` - Icon library

**Development dependencies:**
- `tailwindcss` - CSS framework for styling
- `postcss` - CSS processing
- `autoprefixer` - Automatic CSS vendor prefixes

**Testing (optional):**
- `@testing-library/react` and related packages
- `web-vitals` - Performance monitoring

## Installation

1. Make sure you have Node.js installed on your computer.

2. Open a terminal in the project folder.

3. Install all dependencies:
   ```bash
   npm install
   ```

4. Install the additional packages needed:
   ```bash
   npm install framer-motion lucide-react
   npm install -D tailwindcss postcss autoprefixer
   ```

## Starting the Project

Once all dependencies are installed, start the development server:

```bash
npm start
```

The app will open automatically at `http://localhost:3000` in your browser. The page will refresh automatically when you make changes to the code.

## Important Notes

**Tailwind CSS:** The project uses Tailwind for styling. Make sure `tailwind.config.js` and `postcss.config.js` are in the project root. Tailwind classes are processed automatically when you run the app.

**PostCSS:** This processes your CSS and applies Tailwind. It runs automatically with the build tools.

**Lucide React:** Icons are imported from this library. You can see examples in the code like `<Clock />`, `<Bell />`, and `<Sparkles />`.

**Framer Motion:** Used for smooth page transitions and animations. Components wrapped in `<motion.div>` will animate when they appear or disappear.

## Features

**Home View:** See all your tasks with AI-generated summaries on each card. View your weekly remaining effort and current stress level.

**Stress Level Panel:** A simple indicator showing if your workload is Low, Moderate, or High based on upcoming deadlines and remaining work.

**Cognitive Load Heatmap:** A visual week strip showing which days have the heaviest workload. Higher bars mean more work scheduled for that day.

**Next Best Action Card:** Suggests which task to work on next, with a recommended time block and difficulty level.

**Focus Mode:** A distraction-free view for working on a single task with a built-in timer. Helps break large assignments into manageable blocks.

**Add Task Form:** Create new assignments with title, course, due date, time estimate, priority, and notes.

**Task Details:** Edit tasks, update progress, and generate AI summaries. Includes helpful tips for managing your workload.

**Weekly View:** See tasks organized by due date buckets (Today/1d, 2–3d, 4–7d, >1w).

**AI Nudges:** Gentle reminders appear when you have urgent tasks that need attention.

