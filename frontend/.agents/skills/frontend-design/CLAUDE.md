# CLAUDE.md

This file provides guidance for Claude Code when working with this codebase.

## Project Overview

This is a React admin dashboard built with shadcn/ui components (shadcn-admin template).

## Tech Stack

- **Framework**: React 19 with Vite
- **Language**: TypeScript
- **Routing**: TanStack Router (file-based routing in `src/routes/`)
- **State Management**: Zustand (stores in `src/stores/`)
- **Data Fetching**: TanStack Query
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI primitives) in `src/components/ui/`
- **Forms**: React Hook Form + Zod validation
- **Authentication**: Clerk
- **Package Manager**: pnpm

## Project Structure

```
src/
├── assets/        # Static assets
├── components/    # Reusable components (ui/ for shadcn components)
├── config/        # App configuration
├── context/       # React contexts
├── features/      # Feature-based modules
├── hooks/         # Custom React hooks
├── lib/           # Utility functions
├── routes/        # TanStack Router file-based routes
├── stores/        # Zustand stores
└── styles/        # Global styles
```

## Common Commands

```bash
pnpm dev          # Start development server
pnpm build        # TypeScript check + production build
pnpm lint         # Run ESLint
pnpm format       # Format code with Prettier
pnpm format:check # Check formatting
pnpm knip         # Find unused code
```

## Import Alias

Use `@/*` for imports from `src/`:
```typescript
import { Button } from '@/components/ui/button'
```

## Key Patterns

- **Route files** are in `src/routes/` - TanStack Router auto-generates `routeTree.gen.ts`
- **Feature modules** in `src/features/` contain domain-specific components/logic
- **UI components** follow shadcn/ui conventions with CVA for variants
- **State** is managed with Zustand stores in `src/stores/`
