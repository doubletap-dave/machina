export function keyRefusedCopy(): string {
  return "This key was refused.";
}

export function providerUnreachableCopy(provider: string): string {
  return `Couldn't reach ${provider}. Try again.`;
}

export function illegalModelActionCopy(): string {
  return "The model did not return a legal action.";
}

export function agentLlmIncompleteCopy(): string {
  return "This agent needs both a provider and a model, or neither to use the default.";
}

export function credentialsUnreadableCopy(): string {
  return "Machina couldn't read the credentials file. Fix or remove ~/.machina/credentials.json.";
}

export function noDefaultModelCopy(): string {
  return "No default model. Save a key and pick one.";
}

export function describeNoLlmCopy(): string {
  return "No language model is configured. Build by hand or set an API key.";
}
