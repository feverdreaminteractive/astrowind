#!/bin/bash

# Helper script to replace profile image
# Usage: ./replace-image.sh path/to/your/image.jpg

if [ $# -eq 0 ]; then
    echo "Usage: ./replace-image.sh path/to/your/headshot.jpg"
    echo "This will replace the profile.avif file with your image"
    exit 1
fi

IMAGE_PATH=$1

if [ ! -f "$IMAGE_PATH" ]; then
    echo "Error: Image file not found: $IMAGE_PATH"
    exit 1
fi

# Copy the image to replace profile.avif
echo "Replacing profile image..."
cp "$IMAGE_PATH" src/assets/profile.avif

echo "Profile image replaced successfully!"
echo "The dev server should automatically reload with your new image."