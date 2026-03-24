import { AIProvider, AgentModel, ProviderOption } from './types'

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  ollama: 'Ollama',
  gemini: 'Google Gemini',
}

export const PROVIDER_OPTIONS: { value: AIProvider; label: string }[] = [
  { value: 'ollama', label: PROVIDER_LABELS.ollama },
  { value: 'gemini', label: PROVIDER_LABELS.gemini },
]

export const MODEL_OPTIONS: ProviderOption[] = [
  { id: 'llama3.2:latest', label: 'Llama 3.2', provider: 'ollama' },
  { id: 'llama3.1:latest', label: 'Llama 3.1', provider: 'ollama' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'gemini' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'gemini' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'gemini' },
]

export function getProviderModels(provider: AIProvider): ProviderOption[] {
  return MODEL_OPTIONS.filter((option) => option.provider === provider)
}

export function getProviderLabel(provider: AIProvider) {
  return PROVIDER_LABELS[provider]
}

export function getModelLabel(model: AgentModel | string) {
  return MODEL_OPTIONS.find((option) => option.id === model)?.label || model
}

export function maskApiKey(value: string) {
  if (!value) return ''
  if (value.length <= 8) return '••••••••'
  return `${value.slice(0, 4)}••••${value.slice(-4)}`
}
