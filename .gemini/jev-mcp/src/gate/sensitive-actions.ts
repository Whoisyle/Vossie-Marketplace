export interface ActionClassification {
  isSensitive: boolean;
  category: 'deletion' | 'git_destructive' | 'database_destructive' | 'deploy' | 'credentials' | 'harmless';
  riskLevel: 'high' | 'critical' | 'low';
  reason: string;
}

/**
 * Classifies a command or proposed action to detect destructive or sensitive operations.
 */
export function classifyAction(actionOrCommand: string): ActionClassification {
  const cmd = actionOrCommand.trim();

  // Explicitly harmless development operations
  const harmlessPatterns = [
    /^(git\s+(status|diff|log|branch|show|remote|rev-parse))(\s|$)/i,
    /^(npm|pnpm|yarn|bun)\s+(test|run\s+test|run\s+lint|run\s+build|run\s+typecheck|list|view)(\s|$)/i,
    /^(node|python|npx)\s+.*(test|lint|validate).*$/i,
    /^(Get-ChildItem|dir|ls|Get-Content|cat|find|grep|echo|pwd|Get-Location)(\s|$)/i,
    /^(tsc|eslint|prettier)(\s|$)/i,
  ];

  for (const pattern of harmlessPatterns) {
    if (pattern.test(cmd)) {
      return {
        isSensitive: false,
        category: 'harmless',
        riskLevel: 'low',
        reason: 'Harmless read, test, lint, or build operation.',
      };
    }
  }

  // File / Directory deletion
  if (
    /\b(rm\s+-rf|rm\s+-r|Remove-Item.*-Recurse|del\s+\/s|rimraf|shutil\.rmtree)\b/i.test(cmd) ||
    /\b(rmdir\s+\/s|unlink|del|Remove-Item)\b/i.test(cmd)
  ) {
    return {
      isSensitive: true,
      category: 'deletion',
      riskLevel: 'high',
      reason: 'Detected file or directory deletion command.',
    };
  }

  // Git destructive
  if (
    /\b(git\s+(reset\s+--hard|clean\s+-f|push\s+.*--force|push\s+.*-f|branch\s+-D))\b/i.test(cmd)
  ) {
    return {
      isSensitive: true,
      category: 'git_destructive',
      riskLevel: 'critical',
      reason: 'Detected destructive git operation (reset --hard, force push, or forced branch deletion).',
    };
  }

  // Destructive database operations
  if (
    /\b(drop\s+database|drop\s+table|truncate\s+table|prisma\s+migrate\s+reset|supabase\s+db\s+reset)\b/i.test(cmd)
  ) {
    return {
      isSensitive: true,
      category: 'database_destructive',
      riskLevel: 'critical',
      reason: 'Detected destructive database reset or table drop.',
    };
  }

  // Production deployment / publishing
  if (
    /\b(npm\s+publish|vercel\s+--prod|wrangler\s+deploy\s+--env\s+production|firebase\s+deploy)\b/i.test(cmd)
  ) {
    return {
      isSensitive: true,
      category: 'deploy',
      riskLevel: 'high',
      reason: 'Detected external deployment or package publishing command.',
    };
  }

  // Credential / secret modifications
  if (
    /\b(\.env|credentials\.json|id_rsa|\.pem)\b/i.test(cmd) &&
    /\b(set|export|write|rm|overwrite|>)\b/i.test(cmd)
  ) {
    return {
      isSensitive: true,
      category: 'credentials',
      riskLevel: 'critical',
      reason: 'Detected modification of credentials or secret environment files.',
    };
  }

  // Default: non-sensitive
  return {
    isSensitive: false,
    category: 'harmless',
    riskLevel: 'low',
    reason: 'Standard non-destructive command.',
  };
}
