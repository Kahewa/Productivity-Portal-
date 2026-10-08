<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/e5a863f2-2ab1-4d12-8e49-2172708de6ad

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. To enable Firebase cloud sync, set the `VITE_FIREBASE_*` values shown in [.env.example](.env.example) in `.env.local`. These are Firebase web app configuration values; cloud sync stays disabled when the required Firebase values are absent.
4. Run the app:
   `npm run dev`

## Deploying to Vercel

Set the Firebase `VITE_FIREBASE_*` values from [.env.example](.env.example) as Vercel environment variables for the deployment environment. Vite embeds these values in the client bundle, so enforce data access with appropriate Firestore Security Rules; do not put private credentials in `VITE_*` variables.
