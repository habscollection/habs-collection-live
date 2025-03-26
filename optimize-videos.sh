#!/bin/bash
# Script for optimizing videos for Habs Collection website
# This script requires FFmpeg to be installed: https://ffmpeg.org/

# Set the source directory (where your videos are)
VIDEO_SOURCE_DIR="assets/video"

# Set the output directories
MP4_OUTPUT_DIR="assets/video/optimized/mp4"
WEBM_OUTPUT_DIR="assets/video/optimized/webm"
MOBILE_OUTPUT_DIR="assets/video/optimized/mobile"

# Create the output directories if they don't exist
mkdir -p "$MP4_OUTPUT_DIR"
mkdir -p "$WEBM_OUTPUT_DIR"
mkdir -p "$MOBILE_OUTPUT_DIR"

# Function to convert a video to optimized MP4
optimize_to_mp4() {
    local input_file="$1"
    local filename=$(basename "$input_file")
    local output_file="$MP4_OUTPUT_DIR/${filename%.*}.mp4"
    
    echo "Converting $input_file to optimized MP4..."
    ffmpeg -i "$input_file" -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k "$output_file"
    echo "Created $output_file"
}

# Function to convert a video to optimized WebM
optimize_to_webm() {
    local input_file="$1"
    local filename=$(basename "$input_file")
    local output_file="$WEBM_OUTPUT_DIR/${filename%.*}.webm"
    
    echo "Converting $input_file to WebM..."
    ffmpeg -i "$input_file" -c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus -b:a 96k "$output_file"
    echo "Created $output_file"
}

# Function to create mobile-optimized version
optimize_for_mobile() {
    local input_file="$1"
    local filename=$(basename "$input_file")
    local output_file="$MOBILE_OUTPUT_DIR/${filename%.*}-mobile.mp4"
    
    echo "Creating mobile-optimized version of $input_file..."
    ffmpeg -i "$input_file" -vf "scale=-1:720" -c:v libx264 -crf 24 -preset medium -c:a aac -b:a 96k "$output_file"
    echo "Created $output_file"
}

# Process all mp4 files in the source directory
echo "Starting video optimization..."
for video in "$VIDEO_SOURCE_DIR"/*.mp4; do
    if [ -f "$video" ]; then
        echo "Processing $video..."
        optimize_to_mp4 "$video"
        optimize_to_webm "$video"
        optimize_for_mobile "$video"
        echo "-----------------------------------"
    fi
done

echo "All videos have been optimized!"
echo ""
echo "Next steps:"
echo "1. Upload the optimized videos to your server"
echo "2. Update your HTML to use the new video files"
echo "3. Consider setting up a CloudFront distribution for your videos"
echo ""
echo "Example HTML with multiple sources for better browser compatibility:"
echo "<video autoplay muted loop playsinline>"
echo "    <source src=\"$WEBM_OUTPUT_DIR/your-video.webm\" type=\"video/webm\">"
echo "    <source src=\"$MP4_OUTPUT_DIR/your-video.mp4\" type=\"video/mp4\">"
echo "</video>"
