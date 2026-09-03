# OnlyBooks — University Library Research Assistant

React + TypeScript + Vite + Tailwind CSS v4 digital archive and research assistant for university libraries.

## Problem Context
University libraries hold thousands of research papers, theses, and course materials, yet students struggle to find concise, citation-backed explanations and instead scroll through dozens of unrelated documents. OnlyBooks synthesizes university holdings into structured, citable explanations with verifiable inline references and an interactive Reading Room.

## Development Commands
- `pnpm install`: Install dependencies
- `pnpm run dev`: Start Vite development server (port 5173)
- `pnpm run build`: Compile production bundle
- `pnpm run preview`: Preview production build

## Project Structure
- `src/main.tsx` - Application entrypoint
- `src/App.tsx` - Root state router (`auth` -> `portal` -> `synthesis`)
- `src/views/AuthPage.tsx` - University institutional SSO & login portal
- `src/views/ResearchPortal.tsx` - Primary research inquiry portal, collection stats, recent inquiries & trending theses
- `src/views/SynthesisView.tsx` - 3-column academic synthesis view with inline superscript citation markers and bibliography
- `src/views/ReadingRoom.tsx` - Document viewer showing exact highlighted cited excerpts, call numbers, and chapter navigation
- `src/index.css` - Design tokens, Playfair Display & Inter typography, minimal monochrome academic styling
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and `@` path alias
