import type { APIRoute } from 'astro';
import { unlinkSync, existsSync } from 'fs';
import { resolve } from 'path';

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
    const data = await request.json();
    const { path } = data;
    
    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing path' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Convert to absolute path from project root
    const projectRoot = resolve(process.cwd());
    const absolutePath = resolve(projectRoot, path);
    
    console.log('🗑️ Deleting:', absolutePath);

    // Delete file if it exists
    if (existsSync(absolutePath)) {
      unlinkSync(absolutePath);
      console.log('✅ File deleted successfully');
    } else {
      console.log('⚠️ File does not exist');
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Error deleting file:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to delete file' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
