# Update the live site with GitHub Desktop

1. Open GitHub Desktop and clone/select `steve8888johnson/drivers-lounge`.
2. Open the local repository folder from **Repository > Show in Explorer**.
3. Delete the old project files in that folder except the hidden `.git` folder.
4. Copy all files from this release into that local repository folder.
5. Return to GitHub Desktop. Review the changed files.
6. Summary: `Navigation-first public beta`
7. Click **Commit to main**.
8. Click **Push origin**.
9. Vercel will build and deploy automatically.

After deployment, run `supabase/003_navigation_foundation.sql` in the Supabase SQL Editor to add the navigation data tables.
