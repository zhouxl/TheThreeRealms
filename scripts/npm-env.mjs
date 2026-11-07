/**
 * npm 11/12 may expose a persistent user .npmrc allow-scripts policy to
 * "npm run" children as npm_config_allow_scripts. When this script then
 * invokes a project-scoped npm install, npm misclassifies the copied env
 * variable as a prohibited --allow-scripts CLI policy (EALLOWSCRIPTS).
 *
 * Only strip the forwarded ENV copy for child npm commands. npm still reads
 * ~/.npmrc, the project .npmrc and package.json allowScripts normally.
 * Never relax script approval with --dangerously-allow-all-scripts.
 */
export function cleanForwardedNpmAllowScripts(env) {
  const clean = { ...env };
  const removed = [];
  for (const name of Object.keys(clean)) {
    if (/^npm_config_allow[_-]?scripts$/i.test(name)) {
      removed.push(name);
      delete clean[name];
    }
  }
  return { env: clean, removed };
}
