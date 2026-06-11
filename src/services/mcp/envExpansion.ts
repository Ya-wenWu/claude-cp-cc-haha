/**
 * Shared utilities for expanding environment variables in MCP server configurations
 */

// Environment variables safe to expand in MCP config strings.
// Only allowlisted vars can be referenced via ${VAR} syntax — prevents
// exfiltration of secrets (GH_TOKEN, ANTHROPIC_API_KEY, etc.) through
// malicious MCP server configurations.
const ALLOWLISTED_ENV_VARS = new Set([
  // System
  'HOME', 'USER', 'USERNAME', 'LOGNAME', 'PATH', 'HOSTNAME', 'HOST',
  'PWD', 'SHELL', 'TERM', 'TMPDIR', 'TEMP', 'TMP',
  // Locale
  'LANG', 'LC_ALL', 'LC_CTYPE', 'LC_MESSAGES', 'LC_TIME',
  // Display
  'DISPLAY', 'WAYLAND_DISPLAY', 'XAUTHORITY', 'DBUS_SESSION_BUS_ADDRESS',
  // Editors
  'EDITOR', 'VISUAL', 'PAGER',
  // Docker
  'DOCKER_HOST', 'DOCKER_CONTEXT',
  // Git
  'GIT_EDITOR', 'GIT_PAGER',
  // Package managers
  'NPM_CONFIG_USERCONFIG', 'YARN_CACHE_FOLDER', 'PNPM_HOME',
])

/**
 * Expand environment variables in a string value
 * Handles ${VAR} and ${VAR:-default} syntax
 * Only expands allowlisted vars — all others are preserved as-is.
 * @returns Object with expanded string and list of missing variables
 */
export function expandEnvVarsInString(value: string): {
  expanded: string
  missingVars: string[]
} {
  const missingVars: string[] = []

  const expanded = value.replace(/\$\{([^}]+)\}/g, (match, varContent) => {
    // Split on :- to support default values (limit to 2 parts to preserve :- in defaults)
    const [varName, defaultValue] = varContent.split(':-', 2)

    // Non-allowlisted vars are left as-is (not expanded) to prevent
    // secret exfiltration via MCP config entries.
    if (!ALLOWLISTED_ENV_VARS.has(varName)) {
      if (defaultValue !== undefined) return defaultValue
      missingVars.push(varName)
      return match
    }

    const envValue = process.env[varName]
    if (envValue !== undefined) {
      return envValue
    }
    if (defaultValue !== undefined) {
      return defaultValue
    }

    // Track missing variable for error reporting
    missingVars.push(varName)
    // Return original if not found (allows debugging but will be reported as error)
    return match
  })

  return {
    expanded,
    missingVars,
  }
}
