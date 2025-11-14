/**
 * Substitute variables in template content
 * @param template - Template string with {{variable}} placeholders
 * @param variables - Object with variable values
 * @returns Substituted template string
 */
export const substituteVariables = (template: string | undefined, variables: Record<string, any>): string => {
  if (!template) return '';
  
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, String(value));
  }
  
  return result;
};

