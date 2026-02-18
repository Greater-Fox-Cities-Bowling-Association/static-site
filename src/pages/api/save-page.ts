import type { APIRoute } from 'astro';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  // Only allow in development
  if (import.meta.env.PROD) {
    return new Response(JSON.stringify({ error: 'Not available in production' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('🔍 POST /api/save-page called');
    
    // Use Astro's request object
    const request = context.request;
    console.log('📋 Request method:', request.method);
    
    // Parse JSON body using Astro's built-in method
    let data;
    try {
      data = await request.json();
      console.log('✅ Parsed JSON:', data);
    } catch (e) {
      console.error('❌ Failed to parse JSON:', e);
      // Fallback: try to read the raw body
      console.log('📥 Trying arrayBuffer fallback...');
      const buffer = await request.arrayBuffer();
      const bodyText = new TextDecoder().decode(buffer);
      console.log('📏 Buffer length:', buffer.byteLength);
      console.log('📝 Body text length:', bodyText.length);
      console.log('📝 Body text:', bodyText);
      
      if (!bodyText) {
        return new Response(JSON.stringify({ error: 'Empty request body' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      data = JSON.parse(bodyText);
    }
    
    const { path, content } = data;
    
    if (!path || !content) {
      console.error('❌ Missing path or content');
      console.error('Path:', path, 'Content:', content);
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
