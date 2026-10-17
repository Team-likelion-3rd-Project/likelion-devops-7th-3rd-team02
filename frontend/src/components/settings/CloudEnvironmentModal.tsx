import { useState } from 'react'
import type { ReactNode } from 'react'

import Modal from '../common/Modal'
import FormField, { FormError, formControlClass } from '../common/FormField'
import { buttonClass, focusRing, primaryButtonClass } from '../common/styles'
import { createCloudEnvironment, updateCloudEnvironment } from '../../api/cloudApi'
import { getErrorMessage } from '../../utils/error'
import type { CloudEnvironment, CloudEnvironmentRequest } from '../../types/cloud'

// Backend CL2·CL3 검증과 같은 규칙
const NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,29}$/

const inputClass = `${formControlClass} h-9`
const monoInputClass = `${inputClass} font-mono text-[12.5px]`

function Hint({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <small id={id} className="text-[12.5px] break-keep text-muted [overflow-wrap:anywhere]">
      {children}
    </small>
  )
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 font-semibold">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={`h-4 w-4 accent-accent ${focusRing}`}
      />
      {label}
    </label>
  )
}

// 빈 칸은 보내지 않는다 (Backend가 기본값을 쓴다).
const optional = (value: string) => (value.trim() === '' ? null : value.trim())

// 설정 > 클라우드 > 환경 추가·수정 (CL2·CL3, OWNER)
// Prometheus 토큰은 응답에 오지 않으므로, 수정할 때 비워 두면 지금 토큰을 그대로 쓴다.
function CloudEnvironmentModal({
  projectId,
  environment,
  isFirst,
  onSaved,
  onClose,
}: {
  projectId: number
  environment: CloudEnvironment | null
  isFirst: boolean
  onSaved: () => void
  onClose: () => void
}) {
  const isEdit = environment !== null

  const [name, setName] = useState(environment?.name ?? '')
  const [label, setLabel] = useState(environment?.label ?? '')
  const [isDefault, setIsDefault] = useState(environment?.isDefault ?? isFirst)

  const [usePrometheus, setUsePrometheus] = useState(isEdit ? environment.prometheus !== null : true)
  const [prometheusUrl, setPrometheusUrl] = useState(environment?.prometheus?.url ?? '')
  const [prometheusToken, setPrometheusToken] = useState('')
  const [clearToken, setClearToken] = useState(false)
  const hasToken = environment?.prometheus?.hasToken ?? false

  const [namespace, setNamespace] = useState(environment?.kubernetes?.namespace ?? '')
  const [appDeployment, setAppDeployment] = useState(environment?.kubernetes?.appDeployment ?? '')
  const [metricsJob, setMetricsJob] = useState(environment?.kubernetes?.metricsJob ?? '')
  const [nodeLabel, setNodeLabel] = useState(environment?.kubernetes?.nodeLabel ?? '')

  const [useAws, setUseAws] = useState(environment?.aws != null)
  const [region, setRegion] = useState(environment?.aws?.region ?? 'ap-northeast-2')
  const [roleArn, setRoleArn] = useState(environment?.aws?.roleArn ?? '')
  const [rdsInstanceId, setRdsInstanceId] = useState(environment?.aws?.rdsInstanceId ?? '')
  const [loadBalancerArn, setLoadBalancerArn] = useState(environment?.aws?.loadBalancerArn ?? '')
  const [targetGroupArn, setTargetGroupArn] = useState(environment?.aws?.targetGroupArn ?? '')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isNameValid = NAME_PATTERN.test(name)
  const isFormValid =
    isNameValid &&
    (!usePrometheus || prometheusUrl.trim() !== '') &&
    (!useAws || (region.trim() !== '' && roleArn.trim() !== ''))

  const buildRequest = (): CloudEnvironmentRequest => {
    const kubernetes = {
      namespace: optional(namespace),
      appDeployment: optional(appDeployment),
      metricsJob: optional(metricsJob),
      nodeLabel: optional(nodeLabel),
    }

    // 수정: 토큰 삭제는 "", 새 토큰은 그 값, 아무것도 안 하면 생략(유지)
    const token = clearToken ? '' : prometheusToken.trim() || undefined

    return {
      name,
      label: label.trim() || undefined,
      isDefault,
      prometheus: usePrometheus ? { url: prometheusUrl.trim(), token } : null,
      kubernetes: Object.values(kubernetes).some((value) => value !== null) ? kubernetes : null,
      aws: useAws
        ? {
            region: region.trim(),
            roleArn: roleArn.trim(),
            rdsInstanceId: optional(rdsInstanceId),
            loadBalancerArn: optional(loadBalancerArn),
            targetGroupArn: optional(targetGroupArn),
          }
        : null,
    }
  }

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return

    setIsSubmitting(true)
    setError('')

    try {
      if (environment) {
        await updateCloudEnvironment(projectId, environment.id, buildRequest())
      } else {
        await createCloudEnvironment(projectId, buildRequest())
      }
      onSaved()
      onClose()
    } catch (error) {
      // 입력 내용을 유지하고 Backend 검증 문구를 그대로 보여준다 (설계서 5.2).
      setError(getErrorMessage(error, '환경을 저장하지 못했습니다.'))
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      title={isEdit ? `${environment.label} 환경 수정` : '클라우드 환경 추가'}
      description="모니터링 화면이 이 환경의 Prometheus와 AWS에서 운영 상태를 읽어요."
      onClose={onClose}
      maxWidth="max-w-[620px]"
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass}>
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className={primaryButtonClass}
          >
            {isSubmitting ? '저장 중...' : isEdit ? '저장' : '환경 추가'}
          </button>
        </>
      }
    >
      <section className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <div className="flex flex-col gap-1.5">
            <FormField id="env-name" label="환경 이름">
              <input
                id="env-name"
                type="text"
                maxLength={30}
                autoFocus
                placeholder="dev"
                aria-describedby="env-name-hint"
                aria-invalid={name !== '' && !isNameValid}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={monoInputClass}
              />
            </FormField>
            <Hint id="env-name-hint">
              {name !== '' && !isNameValid ? (
                <span className="text-err">영문 소문자, 숫자, -로 30자까지 쓸 수 있어요.</span>
              ) : (
                '배포 기록의 environment, 알림의 devflow_env와 같은 값이에요.'
              )}
            </Hint>
          </div>

          <FormField id="env-label" label="표시 이름 (선택)">
            <input
              id="env-label"
              type="text"
              maxLength={50}
              placeholder="온프레미스 (kubeadm)"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              className={inputClass}
            />
          </FormField>
        </div>

        {isFirst && !isEdit ? (
          <Hint>처음 추가하는 환경은 기본 환경이 돼요. 모니터링 화면이 처음에 이 환경을 보여줘요.</Hint>
        ) : (
          <Toggle id="env-default" label="기본 환경으로 쓰기" checked={isDefault} onChange={setIsDefault} />
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-line2 pt-4">
        <Toggle id="env-prometheus" label="Prometheus 연결" checked={usePrometheus} onChange={setUsePrometheus} />
        {usePrometheus && (
          <>
            <div className="flex flex-col gap-1.5">
              <FormField id="env-prometheus-url" label="주소">
                <input
                  id="env-prometheus-url"
                  type="url"
                  maxLength={300}
                  placeholder="http://prometheus.monitoring.svc:9090"
                  aria-describedby="env-prometheus-url-hint"
                  value={prometheusUrl}
                  onChange={(event) => setPrometheusUrl(event.target.value)}
                  className={monoInputClass}
                />
              </FormField>
              <Hint id="env-prometheus-url-hint">DevFlow 서버에서 접속할 수 있는 주소여야 해요.</Hint>
            </div>

            <div className="flex flex-col gap-1.5">
              <FormField id="env-prometheus-token" label="Bearer 토큰 (선택)">
                <input
                  id="env-prometheus-token"
                  type="password"
                  autoComplete="off"
                  maxLength={500}
                  disabled={clearToken}
                  placeholder={hasToken ? '비워 두면 지금 토큰을 그대로 써요' : '인증이 없으면 비워 두세요'}
                  value={prometheusToken}
                  onChange={(event) => setPrometheusToken(event.target.value)}
                  className={monoInputClass}
                />
              </FormField>
              {hasToken && (
                <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={clearToken}
                    onChange={(event) => setClearToken(event.target.checked)}
                    className={`h-4 w-4 accent-accent ${focusRing}`}
                  />
                  저장된 토큰 지우기
                </label>
              )}
            </div>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-line2 pt-4">
        <div>
          <h3 className="font-semibold">Kubernetes 대상 (선택)</h3>
          <Hint>앱 Deployment를 넣으면 레플리카와 실행 상태를 계산해요.</Hint>
        </div>
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <FormField id="env-namespace" label="네임스페이스">
            <input
              id="env-namespace"
              type="text"
              maxLength={63}
              placeholder="default"
              value={namespace}
              onChange={(event) => setNamespace(event.target.value)}
              className={monoInputClass}
            />
          </FormField>
          <FormField id="env-app" label="앱 Deployment">
            <input
              id="env-app"
              type="text"
              maxLength={63}
              placeholder="backend"
              value={appDeployment}
              onChange={(event) => setAppDeployment(event.target.value)}
              className={monoInputClass}
            />
          </FormField>
          <FormField id="env-job" label="지표 job">
            <input
              id="env-job"
              type="text"
              maxLength={100}
              placeholder="앱 Deployment와 같음"
              value={metricsJob}
              onChange={(event) => setMetricsJob(event.target.value)}
              className={monoInputClass}
            />
          </FormField>
          <FormField id="env-node-label" label="노드 라벨">
            <input
              id="env-node-label"
              type="text"
              maxLength={30}
              placeholder="node"
              value={nodeLabel}
              onChange={(event) => setNodeLabel(event.target.value)}
              className={monoInputClass}
            />
          </FormField>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-line2 pt-4">
        <Toggle id="env-aws" label="AWS 사용" checked={useAws} onChange={setUseAws} />
        {useAws && (
          <>
            <Hint>
              {isEdit
                ? `읽기 전용 역할의 신뢰 정책에 ExternalId ${environment.awsTrust.externalId}를 넣어 주세요. 접근 키는 받지 않아요.`
                : 'ExternalId는 환경을 저장하면 만들어져요. 역할이 아직 없다면 AWS 없이 먼저 저장하고, 설정 화면의 신뢰 정책 값으로 역할을 만든 뒤 AWS를 추가하세요.'}
            </Hint>
            <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
              <FormField id="env-region" label="리전">
                <input
                  id="env-region"
                  type="text"
                  placeholder="ap-northeast-2"
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  className={monoInputClass}
                />
              </FormField>
              <FormField id="env-role" label="읽기 전용 역할 ARN">
                <input
                  id="env-role"
                  type="text"
                  placeholder="arn:aws:iam::123456789012:role/devflow-readonly"
                  value={roleArn}
                  onChange={(event) => setRoleArn(event.target.value)}
                  className={monoInputClass}
                />
              </FormField>
              <FormField id="env-rds" label="RDS 인스턴스 ID (선택)">
                <input
                  id="env-rds"
                  type="text"
                  maxLength={100}
                  value={rdsInstanceId}
                  onChange={(event) => setRdsInstanceId(event.target.value)}
                  className={monoInputClass}
                />
              </FormField>
              <FormField id="env-lb" label="로드밸런서 ARN (선택)">
                <input
                  id="env-lb"
                  type="text"
                  maxLength={300}
                  value={loadBalancerArn}
                  onChange={(event) => setLoadBalancerArn(event.target.value)}
                  className={monoInputClass}
                />
              </FormField>
              <FormField id="env-tg" label="대상 그룹 ARN (선택)">
                <input
                  id="env-tg"
                  type="text"
                  maxLength={300}
                  value={targetGroupArn}
                  onChange={(event) => setTargetGroupArn(event.target.value)}
                  className={monoInputClass}
                />
              </FormField>
            </div>
          </>
        )}
      </section>

      <FormError message={error} />
    </Modal>
  )
}

export default CloudEnvironmentModal
