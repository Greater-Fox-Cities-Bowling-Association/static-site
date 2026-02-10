// Simple script to get current git branch and set it as an environment variable
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

try {
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  console.log(`📍 Current branch: ${branch}`);
  
  // Write to .env.local which is loaded by Astro
  const envContent = `# Auto-generated - Current git branch for CMS development\nPUBLIC_GIT_BRANCH=${branch}\n`;
  writeFileSync('.env.local', envContent);
  
  console.log(`✅ Set PUBLIC_GIT_BRANCH=${branch} in .env.local`);
  console.log(`   Dev mode: CMS will publish to "${branch}" branch`);
  console.log(`   Prod mode: CMS will publish to "main" branch\n`);
} catch (error) {
  console.error('❌ Failed to get git branch:', error.message);
  console.log('   Falling back to "main" branch\n');
  writeFileSync('.env.local', '# Fallback\nPUBLIC_GIT_BRANCH=main\n');
}
