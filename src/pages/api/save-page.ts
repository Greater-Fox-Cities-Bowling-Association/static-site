import type { APIRoute } from 'astro';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Only allow in development
  if (import.meta.env.PROD) {
    return new Response(JSON.stringify({ error: 'Not available in production' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Clone the request to avoid body already consumed error
    const clonedRequest = request.clone();
    
    // Read the body as text first to debug
    const bodyText = await clonedRequest.text();
    console.log('📥 Received body (length):', bodyText.length);
    console.log('📥 Received body (first 500 chars):', bodyText.substring(0, 500));
    
    if (!bodyText || bodyText.length === 0) {
      console.error('❌ Empty request body');
      return new Response(JSON.stringify({ error: 'Empty request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Now parse it
    const data = JSON.parse(bodyText);
    console.log('📥 Parsed data keys:', Object.keys(data));
    
    const { path, content } = data;
    
    if (!path || !content) {
      console.error('❌ Missing path or content');
      return new Response(JSON.stringify({ error: 'Missing path or content' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Convert to absolute path from project root
    const projectRoot = resolve(process.cwd());
    const absolutePath = resolve(projectRoot, path);
    
    console.log('💾 Saving to:', absolutePath);

    // Ensure directory exists
    const dirPath = dirname(absolutePath);
    mkdirSync(dirPath, { recursive: true });

    // Write file
    writeFileSync(absolutePath, JSON.stringify(content, null, 2));

    console.log('✅ File saved successfully');
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Error saving file:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to save file' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
