# Git Branching & Merge Workflow

## Rule
Never push directly to the `main` branch.

## Required Process for Code Changes:
1. **Branch Creation**: Always create and switch to a descriptive feature branch before committing changes:
   ```bash
   git checkout -b feature/<feature-name>
   ```
2. **Commit**: Stage and commit code changes on the feature branch.
3. **Push Feature Branch**: Push the feature branch to the remote origin:
   ```bash
   git push origin feature/<feature-name>
   ```
4. **Merge to Main**: Switch back to `main`, merge the feature branch, and push the updated `main`:
   ```bash
   git checkout main
   git merge feature/<feature-name>
   git push origin main
   ```
