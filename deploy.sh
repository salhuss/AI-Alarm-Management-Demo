#!/bin/bash

# Script to push code to GitHub and deploy to GitHub Pages

echo "Pushing code to GitHub..."
git remote remove origin 2>/dev/null
git remote add origin https://$GITHUB_TOKEN@github.com/salhuss/AI-Alarm-Management-Demo.git
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✓ Code pushed successfully!"
    echo ""
    echo "Deploying to GitHub Pages..."
    npm run deploy

    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ Deployment complete!"
        echo ""
        echo "Your demo is now live at:"
        echo "https://salhuss.github.io/AI-Alarm-Management-Demo/"
    else
        echo "✗ Deployment failed"
    fi
else
    echo "✗ Push failed. Please check your GITHUB_TOKEN"
fi
