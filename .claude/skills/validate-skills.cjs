#!/usr/bin/env node

/**
 * Validate Claude skill metadata, navigation, long-reference Contents lists,
 * and evaluation files without requiring third-party packages.
 */

const fs = require('fs');
const path = require('path');

const skillsRoot = __dirname;
const errors = [];
const warnings = [];

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function markdownFiles(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...markdownFiles(fullPath));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) result.push(fullPath);
  }
  return result;
}

function parseFrontmatter(text, filePath) {
  if (!text.startsWith('---')) {
    errors.push(`${filePath}: missing YAML frontmatter`);
    return null;
  }
  const end = text.indexOf('\n---', 3);
  if (end < 0) {
    errors.push(`${filePath}: unterminated YAML frontmatter`);
    return null;
  }
  const frontmatter = text.slice(3, end);
  const nameMatch = frontmatter.match(/^\s*name:\s*(.+)$/m);
  const descriptionMatch = frontmatter.match(/^\s*description:\s*(.+)$/m);
  if (!nameMatch) errors.push(`${filePath}: missing name`);
  if (!descriptionMatch) errors.push(`${filePath}: missing description`);
  const name = nameMatch ? nameMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';
  const description = descriptionMatch ? descriptionMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';
  if (name && !/^[a-z0-9-]{1,64}$/.test(name)) {
    errors.push(`${filePath}: name must contain only lowercase letters, numbers, and hyphens`);
  }
  if (description.length > 1024) errors.push(`${filePath}: description exceeds 1024 characters`);
  if (description && !/(use when|use for|applies when|triggers? on|when working)/i.test(description)) {
    warnings.push(`${filePath}: description has no explicit activation phrase`);
  }
  return { name, description, body: text.slice(end + 4) };
}

function validateLinks(filePath, text) {
  const linkPattern = /(?<!!)\[[^\]]+\]\(([^)]+)\)/g;
  for (const match of text.matchAll(linkPattern)) {
    const target = match[1].trim();
    if (!target || /^(https?:|mailto:|#)/i.test(target)) continue;
    const targetPath = target.split('#')[0].split('?')[0];
    if (!targetPath) continue;
    const resolved = path.resolve(path.dirname(filePath), targetPath);
    if (!fs.existsSync(resolved)) {
      errors.push(`${path.relative(process.cwd(), filePath)}: missing link target ${target}`);
    }
  }
}

function validateLongReferences(filePath, text) {
  const relative = path.relative(skillsRoot, filePath);
  if (!/\\reference(s)?\\/i.test(relative) || text.split(/\r?\n/).length <= 100) return;
  if (!/^## Contents\s*$/mi.test(text)) {
    errors.push(`${relative}: reference over 100 lines is missing a Contents section`);
  }
}

function validateEvals(skillDir, skillName) {
  const evalDir = path.join(skillDir, 'evals');
  if (!fs.existsSync(evalDir)) {
    warnings.push(`${skillName}: missing evals directory`);
    return;
  }
  const files = fs.readdirSync(evalDir).filter((name) => name.endsWith('.json'));
  if (!files.length) {
    errors.push(`${skillName}: evals directory contains no JSON files`);
    return;
  }
  let scenarios = 0;
  for (const file of files) {
    const filePath = path.join(evalDir, file);
    let data;
    try {
      data = JSON.parse(read(filePath));
    } catch (error) {
      errors.push(`${path.relative(process.cwd(), filePath)}: invalid JSON (${error.message})`);
      continue;
    }
    if (!Array.isArray(data) && Array.isArray(data.evals)) data = data.evals.map((item) => ({
      skills: [data.skill_name || skillName],
      query: item.query || item.prompt,
      expected_behavior: item.expected_behavior || item.expectations
    }));
    if (!Array.isArray(data)) {
      errors.push(`${path.relative(process.cwd(), filePath)}: evaluation file must contain an array or an object with an evals array`);
      continue;
    }
    scenarios += data.length;
    for (const [index, scenario] of data.entries()) {
      if (!Array.isArray(scenario.skills) || !scenario.skills.length) {
        errors.push(`${path.relative(process.cwd(), filePath)}[${index}]: missing skills`);
      }
      if (typeof scenario.query !== 'string' || !scenario.query.trim()) {
        errors.push(`${path.relative(process.cwd(), filePath)}[${index}]: missing query`);
      }
      if (!Array.isArray(scenario.expected_behavior) || scenario.expected_behavior.length < 2) {
        errors.push(`${path.relative(process.cwd(), filePath)}[${index}]: expected_behavior needs at least two checks`);
      }
    }
  }
  if (scenarios < 3) errors.push(`${skillName}: fewer than three evaluation scenarios`);
}

const skillDirs = fs.readdirSync(skillsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(skillsRoot, entry.name));

for (const skillDir of skillDirs) {
  const skillName = path.basename(skillDir);
  const skillFile = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillFile)) {
    warnings.push(`${skillName}: no SKILL.md entrypoint`);
    continue;
  }
  const skillText = read(skillFile);
  const metadata = parseFrontmatter(skillText, path.relative(process.cwd(), skillFile));
  if (metadata && metadata.name !== skillName &&
      !((skillName === 'react-best-practices' && metadata.name === 'vercel-react-best-practices') ||
        (skillName === 'minimalist-skill' && metadata.name === 'minimalist-ui'))) {
    warnings.push(`${skillName}: directory and frontmatter names differ (${metadata.name})`);
  }
  for (const filePath of markdownFiles(skillDir)) {
    const text = read(filePath);
    validateLinks(filePath, text);
    validateLongReferences(filePath, text);
  }
  if (skillName !== 'validate-skills') validateEvals(skillDir, skillName);
  if (fs.existsSync(path.join(skillDir, 'scripts')) &&
      !fs.existsSync(path.join(skillDir, 'scripts', 'README.md'))) {
    warnings.push(`${skillName}: scripts directory is missing scripts/README.md`);
  }
}

if (errors.length) {
  console.error(`Skill validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
}
if (warnings.length) {
  console.warn(`Skill validation reported ${warnings.length} warning(s):`);
  for (const warning of warnings) console.warn(`- ${warning}`);
}
if (errors.length) process.exit(1);
console.log(`Validated ${skillDirs.length} skill directories successfully.`);
