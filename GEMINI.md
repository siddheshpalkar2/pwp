# Learning Companion — GEMINI.md

## Project Overview

Learning Companion is a simple AI-powered learning assistant built for a hackathon.
The system should personalize content and adapt to user pace and understanding.

The application should help users:

* Learn new concepts
* Get simple explanations
* Practice with quizzes
* Track learning progress
* Receive adaptive learning support

The project must focus on:

* Simplicity
* Fast development
* Clean code
* Small project size
* Accessibility
* Security
* Problem statement alignment
* Google services usage

---

# Tech Stack

## Frontend

* HTML
* CSS
* Vanilla JavaScript

## Backend

* Node.js
* Express.js

## Database

* SQLite

## AI

* Gemini API

---

# Important Project Constraints

## GitHub Repository Size

The full project size must stay under 10 MB.

Rules:

* Do not use unnecessary libraries
* Avoid large UI frameworks
* Avoid React, Next.js, etc.
* Do not upload videos or large images
* Compress assets when needed
* Use simple CSS instead of heavy frameworks
* Keep dependencies minimal
* Ignore node_modules using .gitignore

---

# Core Features

## AI Learning Assistant

The assistant should:

* Explain concepts simply
* Answer learning questions
* Adapt explanations based on user understanding
* Provide examples

## Quiz Feature

Support:

* Multiple choice questions
* Instant feedback
* Basic scoring system

## Progress Tracking

Track:

* Completed topics
* Quiz scores
* Learning streaks

---

# Folder Structure

project/
├── public/
│   ├── css/
│   ├── js/
│   └── images/
├── views/
├── routes/
├── database/
├── server.js
├── package.json
├── .env
└── README.md

---

# Coding Rules

* Keep code simple and readable
* Use modular JavaScript files
* Avoid unnecessary abstraction
* Use async/await
* Use meaningful variable names
* Keep functions small
* Reuse utility functions when possible

---

# Frontend Rules

* Use plain HTML, CSS (Use bootstrap, tailwind only if required, not necessary) and JavaScript
* Use responsive layouts
* Keep UI clean and minimal
* Avoid heavy animations
* Use semantic HTML

Accessibility requirements:

* Keyboard navigation support
* Proper labels for forms
* Good color contrast
* Mobile responsive design

---

# Backend Rules

* Use Express.js only
* Keep APIs simple
* Use REST-style routes
* Validate request data
* Handle API errors properly

---

# Database Rules

* Use SQLite
* Keep database schema simple
* Store only required data
* Avoid unnecessary tables

Example:

* users
* learning_progress
* quiz_scores

---

# Security Rules

* Store API keys in .env
* Never expose secrets
* Validate all user input
* Sanitize AI responses when needed
* Handle API failures safely

---

# Performance Rules

* Minimize API requests
* Keep JavaScript lightweight
* Optimize images
* Avoid unnecessary dependencies
* Keep CSS files small

---

# UI/UX Guidelines

The UI should be:

* Simple
* Educational
* Lightweight
* Easy to navigate

Include:

* Loading states
* Simple progress indicators
* Clean typography
* Mobile-friendly layout

---

# Development Workflow

Before coding:

1. Keep architecture simple
2. Avoid unnecessary packages
3. Focus on core features first

After coding:

1. Test all features
2. Check mobile responsiveness
3. Verify accessibility
4. Remove unused files
5. Ensure project size stays under 10 MB

---

# Problem Statement Alignment

All features must support the main goal:

"Create an intelligent assistant that helps users learn new concepts effectively through personalization and adaptive learning."

Do not add unrelated features.

---

# Forbidden Actions

* Do not use React or large frontend frameworks
* Do not upload node_modules
* Do not use unnecessary libraries
* Do not hardcode secrets
* Do not create overly complex architecture
* Do not ignore accessibility
* Do not commit broken code

---

# Recommended Lightweight Packages

Allowed packages:

* express
* sqlite3
* dotenv
* cors

Avoid heavy packages unless absolutely necessary.

---

# AI Agent Instructions

When generating code:

* Keep implementation lightweight
* Prefer vanilla JavaScript
* Minimize dependencies
* Prioritize hackathon speed
* Focus on working features
* Keep repository size under 10 MB

Before completing tasks:

* Verify imports
* Remove unused files
* Check responsiveness
* Check accessibility
* Ensure project works locally
* Ensure repository remains lightweight
