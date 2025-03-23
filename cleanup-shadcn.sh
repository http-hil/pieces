#!/bin/bash

# Script to remove shadcn UI dependencies and clean up the project

echo "Starting shadcn UI cleanup..."

# Remove unused shadcn UI component directories
echo "Removing shadcn UI component directories..."
rm -rf src/components/ui

# Remove unused dependencies
echo "Removing unused dependencies from package.json..."
npm uninstall @radix-ui/react-checkbox @radix-ui/react-navigation-menu @radix-ui/react-slot class-variance-authority

# Keep clsx and tailwind-merge as they're useful for general Tailwind development
echo "Note: Keeping clsx and tailwind-merge as they're useful for Tailwind development"

echo "Cleanup complete!"
