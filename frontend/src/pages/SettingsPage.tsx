import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  clearAiKey,
  getAiSettings,
  saveAiSettings,
  type AiPreset,
  type AiProviderId,
  type AiSettingsPublic,
} from '../api/client'
import { PageHeader } from '../components/PageHeader'

const FIELD =
  'w-full border border-[var(--color-line)] bg-[var(--color-panel)] px-[var(--space-3)] py-[var(--space-2)] text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-steel)]'

export function SettingsPage() {
  const [settings, setSettings] = useState<AiSettingsPublic | null>(null)
  const [provider, setProvider] = useState<AiProviderId>('openai')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [organization, setOrganization] = useState('')
  const [extraHeaderName, setExtraHeaderName] = useState('')
  const [extraHeaderValue, setExtraHeaderValue] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getAiSettings()
      .then((s) => {
        setSettings(s)
        setProvider((s.provider as AiProviderId) || 'openai')
        setBaseUrl(s.base_url || '')
        setModel(s.model || '')
        setOrganization(s.organization || '')
        setExtraHeaderName(s.extra_header_name || '')
        setEnabled(Boolean(s.enabled))
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  const presets = settings?.presets || []
  const activePreset: AiPreset | undefined = useMemo(
    () => presets.find((p) => p.id === provider),
    [presets, provider],
  )

  function onProviderChange(next: AiProviderId) {
    setProvider(next)
    const preset = presets.find((p) => p.id === next)
    if (preset) {
      if (preset.default_base_url) setBaseUrl(preset.default_base_url)
      if (preset.default_model) setModel(preset.default_model)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const body: Parameters<typeof saveAiSettings>[0] = {
        enabled,
        provider,
        base_url: baseUrl,
        model,
        organization: organization || null,
        extra_header_name: extraHeaderName || null,
      }
      if (extraHeaderValue.trim()) body.extra_header_value = extraHeaderValue.trim()
      if (apiKey.trim()) body.api_key = apiKey.trim()
      const next = await saveAiSettings(body)
      setSettings(next)
      setApiKey('')
      setExtraHeaderValue('')
      setMessage('설정이 서버에 저장되었습니다. API 키는 암호화되며 화면에 다시 표시되지 않습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  async function onClearKey() {
    setSaving(true)
    setError(null)
    try {
      const next = await clearAiKey()
      setSettings(next)
      setEnabled(false)
      setMessage('API 키를 삭제하고 AI를 비활성화했습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="범용 AI API를 연결해 일일 브리프·국면 설명을 보강합니다. 키는 브라우저에 저장하지 않고 서버에 암호화합니다."
      />

      <section className="mp-banner mb-[var(--space-5)]">
        <p>
          <strong>보안</strong>
          <span className="mx-2 text-[var(--color-line-strong)]">·</span>
          localStorage 미사용 · 응답은 마스킹({settings?.api_key_hint || '••••'}) · 평문 로그 금지
        </p>
      </section>

      <form onSubmit={onSubmit} className="max-w-xl space-y-[var(--space-4)]">
        <label className="flex items-center gap-[var(--space-2)] text-[13px]">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          AI 브리프 사용
        </label>

        <div>
          <p className="mb-[var(--space-2)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
            Provider
          </p>
          <select
            className={FIELD}
            value={provider}
            onChange={(e) => onProviderChange(e.target.value as AiProviderId)}
          >
            {(presets.length
              ? presets
              : [
                  { id: 'openai', label: 'OpenAI' },
                  { id: 'anthropic', label: 'Anthropic' },
                  { id: 'google', label: 'Google Gemini' },
                  { id: 'azure_openai', label: 'Azure OpenAI' },
                  { id: 'custom_openai', label: 'Custom OpenAI-compatible' },
                ]
            ).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          {activePreset ? (
            <p className="mt-[var(--space-1)] text-[11px] text-[var(--color-muted)]">
              style={activePreset.style}
            </p>
          ) : null}
        </div>

        <div>
          <p className="mb-[var(--space-2)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
            API base URL
          </p>
          <input
            className={FIELD}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            autoComplete="off"
          />
        </div>

        <div>
          <p className="mb-[var(--space-2)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
            Model
          </p>
          <input
            className={FIELD}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-4o-mini"
            autoComplete="off"
          />
        </div>

        <div>
          <p className="mb-[var(--space-2)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
            Organization (선택)
          </p>
          <input
            className={FIELD}
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
          <div>
            <p className="mb-[var(--space-2)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
              Extra header name
            </p>
            <input
              className={FIELD}
              value={extraHeaderName}
              onChange={(e) => setExtraHeaderName(e.target.value)}
              placeholder="예: api-key"
              autoComplete="off"
            />
          </div>
          <div>
            <p className="mb-[var(--space-2)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
              Extra header value
            </p>
            <input
              className={FIELD}
              type="password"
              value={extraHeaderValue}
              onChange={(e) => setExtraHeaderValue(e.target.value)}
              placeholder={settings?.extra_header_set ? '저장됨 · 재입력 시에만 갱신' : ''}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div>
          <p className="mb-[var(--space-2)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
            API key
          </p>
          <input
            className={FIELD}
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              settings?.api_key_set
                ? `저장됨 ${settings.api_key_hint || '••••'} · 재입력 시에만 갱신`
                : 'sk-… / 키 입력'
            }
            autoComplete="new-password"
          />
        </div>

        <div className="flex flex-wrap gap-[var(--space-3)] pt-[var(--space-2)]">
          <button
            type="submit"
            disabled={saving}
            className="min-h-10 border border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] px-[var(--space-4)] text-[12px] font-semibold text-[var(--color-accent-ink)] disabled:opacity-50"
          >
            {saving ? '저장 중…' : '설정 저장'}
          </button>
          <button
            type="button"
            disabled={saving || !settings?.api_key_set}
            onClick={() => void onClearKey()}
            className="min-h-10 border border-[var(--color-line-strong)] px-[var(--space-4)] text-[12px] font-semibold text-[var(--color-muted)] disabled:opacity-50"
          >
            키 삭제
          </button>
        </div>

        {message ? <p className="text-[12px] text-[var(--color-up)]">{message}</p> : null}
        {error ? <p className="text-[12px] text-[var(--color-down)]">{error}</p> : null}
      </form>

      <section className="mt-[var(--space-7)] border-t border-[var(--color-line)] pt-[var(--space-5)]">
        <h2 className="mp-section-title">지원 provider</h2>
        <ul className="mt-[var(--space-3)] space-y-[var(--space-2)] text-[13px] text-[var(--color-muted)]">
          <li>OpenAI — chat/completions</li>
          <li>Anthropic — Messages API</li>
          <li>Google Gemini — generateContent</li>
          <li>Azure OpenAI — OpenAI-compatible base URL</li>
          <li>Custom OpenAI-compatible — 임의 base URL</li>
        </ul>
      </section>
    </div>
  )
}
