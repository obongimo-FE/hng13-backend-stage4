/**
 * Substitute variables in template content
 * @param template - Template string with {{variable}} placeholders
 * @param variables - Object with variable values
 * @returns Substituted template string
 */
export const substituteVariables = (template: string | undefined, variables: Record<string, any>): string => {
  if (!template) return '';
  
  let result = template;
  
  // Replace all {{variable}} patterns
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, String(value));
  }
  
  return result;
};

/**
 * Extract variables from template content
 * @param template - Template string
 * @returns Array of variable names found in template
 */
export const extractVariables = (template: string): string[] => {
  const regex = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match: RegExpExecArray | null;
  
  while ((match = regex.exec(template)) !== null) {
    const varName = match[1];
    if (varName && !variables.includes(varName)) {
      variables.push(varName);
    }
  }
  
  return variables;
};

