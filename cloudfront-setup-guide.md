# Setting Up Amazon CloudFront for Habs Collection

This guide walks you through setting up Amazon CloudFront CDN to improve your website's performance, especially for video content.

## Prerequisites

- An AWS account
- Your website running on AWS Lightsail
- Access to your domain's DNS settings

## Step 1: Create a CloudFront Distribution

1. **Log in to the AWS Management Console**
   - Go to https://aws.amazon.com/console/
   - Sign in with your AWS credentials

2. **Navigate to CloudFront**
   - From the AWS services menu, search for "CloudFront"
   - Select CloudFront from the results

3. **Create a Distribution**
   - Click "Create Distribution"
   - Select "Web" as the delivery method

4. **Origin Settings**
   - Origin Domain Name: Enter your Lightsail instance's public IP or domain (e.g., `your-lightsail-instance.amazonaws.com`)
   - Origin Path: Leave blank (unless you want to specify a subdirectory)
   - Origin ID: Will be automatically filled
   - Origin Protocol Policy: Select "HTTPS Only" (recommended) or "Match Viewer" if you support both HTTP and HTTPS
   - HTTP Port: 80
   - HTTPS Port: 443
   - Minimum Origin SSL Protocol: TLSv1.2

5. **Default Cache Behavior Settings**
   - Path Pattern: Default (*)
   - Viewer Protocol Policy: "Redirect HTTP to HTTPS" (recommended)
   - Allowed HTTP Methods: Select "GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE" if your site needs form submissions
   - Cache Based on Selected Request Headers: Select "None"
   - Object Caching: "Use Origin Cache Headers"
   - Forward Cookies: "None" (or "All" if you have user-specific content)
   - Query String Forwarding and Caching: "None" (or "Forward all, cache based on all" if your site uses query parameters)
   - Smooth Streaming: No
   - Compress Objects Automatically: Yes

6. **Distribution Settings**
   - Price Class: Choose appropriate option (Price Class 100 for US/Europe, 200 adds more regions, All includes all edge locations)
   - Alternate Domain Names (CNAMEs): Enter your domain name (e.g., `habscollection.com` and `www.habscollection.com`)
   - SSL Certificate: Select "Custom SSL Certificate" and choose or upload your SSL certificate
   - Default Root Object: `index.html`
   - Logging: Enable if you want CloudFront access logs
   - IPv6: Enable

7. **Create Distribution**
   - Review all settings
   - Click "Create Distribution"
   - Wait for the distribution to deploy (status will change from "In Progress" to "Deployed" - this may take 15-30 minutes)

## Step 2: Create a Video-Specific Distribution (Optional but Recommended)

For better video handling, create a separate distribution optimized for video content:

1. Follow the same steps as above, but with these differences:
   - Origin Path: `/assets/video` (or wherever your videos are stored)
   - Default Cache Behavior Settings:
     - Cache Based on Selected Request Headers: "None"
     - Object Caching: "Customize" and set longer TTLs (e.g., Minimum TTL: 86400, Default TTL: 86400, Maximum TTL: 31536000)
     - Forward Cookies: "None"
     - Query String Forwarding and Caching: "None"

2. This creates a distribution optimized just for video content

## Step 3: Update Your DNS Records

1. **Log in to your domain registrar** (e.g., GoDaddy, Namecheap, Route 53)

2. **Create CNAME records**:
   - Create a CNAME record for `www.habscollection.com` pointing to your CloudFront distribution domain (e.g., `d1234abcd.cloudfront.net`)
   - If using the root domain (`habscollection.com`), you'll need to use your registrar's specific method for pointing the root domain to CloudFront:
     - Some registrars support ANAME/ALIAS records
     - Or use Route 53 which has native CloudFront integration

3. **Wait for DNS propagation** (can take up to 48 hours but usually much faster)

## Step 4: Update Your Website Code

1. **Create a CloudFront-aware version of .htaccess** at the root of your website:

```apache
# Detect CloudFront
SetEnvIf CF-IPCountry .+ CLOUDFRONT=yes

# Special headers for CloudFront
<IfModule mod_headers.c>
    # Allow CloudFront to cache different versions based on device type
    Header set Vary "Accept-Encoding, User-Agent" env=CLOUDFRONT
    
    # Set CORS headers for CloudFront
    <FilesMatch "\.(ttf|ttc|otf|eot|woff|woff2|font.css|css|js|gif|png|jpe?g|svg|svgz|ico|webp|mp4|webm)$">
        Header set Access-Control-Allow-Origin "*"
    </FilesMatch>
</IfModule>
```

2. **Update your video paths** in your HTML to use your CloudFront URL for videos (if you created a separate video distribution):

```html
<!-- Before -->
<video ... >
    <source src="/assets/video/hero-video.mp4" type="video/mp4">
</video>

<!-- After -->
<video ... >
    <source src="https://video.habscollection.com/hero-video.mp4" type="video/mp4">
</video>
```

## Step 5: Test and Verify

1. **Test your website** through the CloudFront URL before updating DNS:
   - Visit your CloudFront URL directly (e.g., `https://d1234abcd.cloudfront.net`)
   - Verify all resources load correctly

2. **Check for mixed content warnings** in the browser console
   - Make sure all resources (images, videos, etc.) are loaded over HTTPS

3. **Test video playback** across different devices and browsers

4. **Use browser developer tools** to verify content is coming from CloudFront
   - Look at the Network tab and check response headers for CloudFront-specific headers

## Step 6: Performance Monitoring

1. **Set up CloudWatch Alarms** for your CloudFront distribution:
   - Navigate to CloudWatch in the AWS Console
   - Create alarms for metrics like 5xxErrorRate, 4xxErrorRate, and TotalErrorRate

2. **Enable CloudFront access logs**:
   - These logs will be stored in an S3 bucket
   - Use for detailed analysis of content access patterns

## Step 7: Optimize CloudFront Settings Over Time

After your initial setup, consider these optimizations:

1. **Set up Origin Request Policies** for more control over what's forwarded to your origin

2. **Create Cache Policies** to fine-tune caching behavior

3. **Configure Function Associations** (Lambda@Edge) for advanced scenarios like:
   - Dynamic content based on viewer location
   - Adding security headers
   - URL rewrites

4. **Implement Origin Shield** to reduce load on your origin server

## Cost Considerations

- CloudFront pricing is based on:
  - Data transfer out to the internet
  - Number of HTTP/HTTPS requests
  - Origin Shield requests (if enabled)
  - Optional features like real-time logs

- Use the AWS Calculator to estimate monthly costs: https://calculator.aws/

## Next Steps

Once CloudFront is set up, you can:

1. Implement an S3 bucket for off-loading static assets (for even better performance)
2. Set up Lambda@Edge functions for advanced functionality
3. Add AWS WAF (Web Application Firewall) for additional security

For support, refer to the AWS CloudFront documentation or contact AWS Support.
