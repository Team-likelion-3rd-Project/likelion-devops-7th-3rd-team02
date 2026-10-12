import { useState } from 'react'

import Modal from '../common/Modal'
import { FormError } from '../common/FormField'
import { EmptyState, ErrorMessage, Loading } from '../common/PanelState'
import { buttonClass, primaryButtonClass } from '../common/styles'
import { getGithubIssues, importGithubIssue } from '../../api/githubApi'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getErrorMessage } from '../../utils/error'

// 설계서 3.5, 9.5: 이슈 목록에서 골라 업무로 가져온다. 이미 가져온 이슈는 선택할 수 없다.
// 가져온 업무의 담당자는 비어 있고 사용자가 지정한다.
function GithubIssueImportModal({
  projectId,
  onImported,
  onClose,
}: {
  projectId: number
  onImported: () => void
  onClose: () => void
}) {
  const issues = useAsyncData(
    () => getGithubIssues(projectId).then((response) => response.data.data ?? []),
    `github-issues-${projectId}`,
    'GitHub 이슈를 불러오지 못했습니다.',
  )

  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const toggleIssue = (issueId: number) => {
    setSelectedIds((prev) =>
      prev.includes(issueId) ? prev.filter((id) => id !== issueId) : [...prev, issueId],
    )
  }

  const handleImport = async () => {
    if (selectedIds.length === 0 || isSubmitting) return

    setIsSubmitting(true)
    setError('')

    const importedIds: number[] = []

    try {
      for (const issueId of selectedIds) {
        await importGithubIssue(projectId, issueId)
        importedIds.push(issueId)
      }
      onImported()
      onClose()
    } catch (error) {
      // 일부만 가져온 경우: 가져온 이슈는 선택에서 빼고 보드를 다시 조회한다.
      if (importedIds.length > 0) {
        setSelectedIds((prev) => prev.filter((id) => !importedIds.includes(id)))
        issues.reload()
        onImported()
      }
      setError(getErrorMessage(error, '이슈를 가져오지 못했습니다.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderList = () => {
    if (issues.error) return <ErrorMessage message={issues.error} onRetry={issues.reload} />
    if (issues.isLoading && !issues.data) return <Loading message="GitHub 이슈를 불러오는 중입니다." />
    if (!issues.data || issues.data.length === 0) {
      return <EmptyState message="가져올 수 있는 이슈가 없어요." />
    }

    return (
      <ul className="-mx-2 flex max-h-[320px] flex-col overflow-y-auto">
        {issues.data.map((issue) => (
          <li key={issue.id}>
            <label
              className={`flex items-center gap-3 rounded-lg px-2 py-2.5 ${
                issue.imported ? 'cursor-not-allowed text-muted' : 'cursor-pointer hover:bg-hover'
              }`}
            >
              <input
                type="checkbox"
                disabled={issue.imported}
                checked={issue.imported || selectedIds.includes(issue.id)}
                onChange={() => toggleIssue(issue.id)}
                className="h-4 w-4 flex-none accent-accent"
              />
              <span className="font-mono text-[12.5px] text-muted">#{issue.number}</span>
              <span className="min-w-0 flex-1 truncate">{issue.title}</span>
              {issue.imported && <span className="flex-none text-[12px]">이미 가져옴</span>}
            </label>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <Modal
      title="GitHub 이슈 가져오기"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass}>
            취소
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={selectedIds.length === 0 || isSubmitting}
            className={primaryButtonClass}
          >
            {isSubmitting ? '가져오는 중...' : '선택한 이슈 가져오기'}
          </button>
        </>
      }
    >
      {renderList()}
      <FormError message={error} />
    </Modal>
  )
}

export default GithubIssueImportModal
