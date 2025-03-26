# Video Optimization Guide for Habs Collection

## Video Compression and Format Optimization

1. **Convert videos to WebM/VP9 format for browsers that support it**
   - Use FFmpeg to create optimized versions:
   ```
   ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus output.webm
   ```

2. **Create optimized MP4 files with H.264 (for wider compatibility)**
   - Use FFmpeg for compression:
   ```
   ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k output.mp4
   ```

3. **Create lower resolution versions for mobile**
   - For vertical videos (mobile):
   ```
   ffmpeg -i input.mp4 -vf "scale=720:-1" -c:v libx264 -crf 24 -preset medium -c:a aac -b:a 96k mobile.mp4
   ```

## Video Hosting Options

1. **Use a CDN for better global distribution**
   - Amazon CloudFront (integrates well with your AWS Lightsail)
   - Bunny CDN (affordable option with good performance)

2. **Self-hosting optimization**
   - Ensure Apache has mod_h264_streaming enabled
   - Configure for byte-range requests
   - Add appropriate CORS headers

## AWS Lightsail Optimization vs. Varnish

### AWS Lightsail Upgrade Pros
- Simplicity - no need to configure and maintain additional services
- More CPU/RAM resources for handling concurrent requests
- Better network performance
- Managed platform - less maintenance overhead

### Varnish Cache Pros
- Can deliver cached content extremely fast
- Reduces load on your server
- Advanced caching rules possible
- Can be deployed on your existing instance

### Recommendation
For your e-commerce site with video content:

1. **Short term: Upgrade your Lightsail plan first**
   - Faster implementation
   - Immediate performance boost
   - Reliability improvement

2. **Medium term: Implement Cloudfront CDN**
   - Create a distribution for your static assets and videos
   - Configure origin (your Lightsail instance)
   - Update URLs to use CloudFront domain

3. **Long term (if needed): Add Varnish**
   - Only if you still face performance issues after steps 1 & 2
   - Can be complex to configure properly
   - Most beneficial for sites with very high traffic

## Specific Optimizations for Your Videos

For each video on your site:

1. **Hero video (top priority)**
   - Create 3-4 versions at different quality levels
   - Consider a custom poster image while video loads
   - Ensure first frame is representative of content

2. **Collection videos**
   - Lower bitrate is acceptable for these smaller videos
   - Consider static image fallbacks for low-bandwidth connections

3. **About section video**
   - Medium priority for optimization
   - Can use slightly higher compression

## Server Configuration Checklist

1. **Enable HTTP/2 in Apache**
   ```
   <IfModule mod_http2.c>
       Protocols h2 h2c http/1.1
   </IfModule>
   ```

2. **Enable brotli compression if available (faster than gzip)**
   ```
   <IfModule mod_brotli.c>
       AddOutputFilterByType BROTLI_COMPRESS text/html text/plain text/xml text/css text/javascript application/javascript
   </IfModule>
   ```

3. **Verify video MIME types are correctly set**
   ```
   AddType video/mp4 .mp4
   AddType video/webm .webm
   ```

## Monitoring Performance

1. **Use Lighthouse in Chrome DevTools**
   - Check for specific video loading issues
   - Look for opportunities in performance tab

2. **Monitor bandwidth usage on AWS**
   - Set up CloudWatch alarms for spikes
   - Review traffic patterns to optimize delivery

3. **Google PageSpeed Insights**
   - Regular checks for performance issues
   - Implement suggestions from reports

## Next Steps

1. Compress all videos with the commands provided above
2. Update HTML to include WebM sources where supported
3. Configure your server with the optimizations in .htaccess
4. Test performance across multiple devices and connection types
