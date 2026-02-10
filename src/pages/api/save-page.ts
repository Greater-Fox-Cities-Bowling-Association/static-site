import type { APIRoute } from 'astro';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export const POST: APIRoute = async ({ request }) => {
  // Only allow in development
  if (import.meta.env.PROD) {
    return new Response(JSON.stringify({ error: 'Not available in production' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { path, content } = await request.json();
    
    if (!path || !content) {
      return new Response(JSON.stringify({ error: 'Missing path or content' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Ensure directory exists
    const dirPath = dirname(path);
    mkdirSync(dirPath, { recursive: true });

    // Write file
    writeFileSync(path, JSON.stringify(content, null, 2));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error saving file:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to save file' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
