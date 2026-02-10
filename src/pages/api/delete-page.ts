import type { APIRoute } from 'astro';
import { unlinkSync, existsSync } from 'fs';

export const POST: APIRoute = async ({ request }) => {
  // Only allow in development
  if (import.meta.env.PROD) {
    return new Response(JSON.stringify({ error: 'Not available in production' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { path } = await request.json();
    
    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing path' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete file if it exists
    if (existsSync(path)) {
      unlinkSync(path);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to delete file' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
