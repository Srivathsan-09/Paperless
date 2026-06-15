# Vercel Build and Deployment Optimization

## Build Configuration

This project is optimized to run within Vercel's Hobby plan limits:

### Serverless Functions
- **Total Functions**: 1
- **Entry Point**: `/api/index.js`
- **All Routes**: Consolidated into single function via Express

### Build Process
- **Build Command**: None required (Node.js)
- **Output Directory**: None required
- **Function Memory**: 1024 MB
- **Max Duration**: 30 seconds

### Key Optimizations Applied

1. **Single Function Consolidation**
   - All routes (`/auth`, `/api/categories`, `/api/entries`, `/api/admin`) route through `/api/index.js`
   - No separate function files created

2. **Serverless-Friendly Configuration**
   - MongoDB connection caching across invocations
   - Request timeout handling (25 seconds)
   - Body parser limits optimized for serverless
   - Database connection pooling enabled

3. **Files Excluded from Deployment**
   - Migration scripts (not needed in production)
   - Admin CLI utilities (adminUtils.js)
   - Development files (docs, tests)
   - Temporary files and caches

### Deployment

Simply run:
```bash
vercel --prod
```

This will deploy with only 1 serverless function, staying well within the 12-function limit.

### Performance Characteristics

- **Cold Start**: ~1-2 seconds (with DB connection)
- **Warm Start**: <100ms (connection reused)
- **Max Request Time**: 30 seconds
- **Concurrent Requests**: Limited by Vercel Hobby plan

### Monitoring

To check function usage after deployment:
1. Go to Vercel Dashboard
2. Select project
3. Go to Settings → Functions
4. Should show 1 function deployed

### Troubleshooting

If deployment still fails with function limit error:
1. Verify `.vercelignore` is present
2. Clear Vercel cache: `vercel env pull && vercel env list`
3. Delete `.vercel` directory and redeploy
4. Check Vercel build logs for warnings

## Features Preserved

✅ All existing features work as before:
- Google OAuth authentication
- Category management
- Entry creation/editing
- Admin panel and data explorer
- Analytics and exports
- Mobile responsiveness
- All API endpoints

✅ No breaking changes to:
- Database structure
- User interface
- Existing functionality
- API responses
- Authentication flow
